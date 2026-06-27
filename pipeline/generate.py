"""Clip pipeline — PART 1: generation only.

Builds the raw audio components for every (stack, scenario) matchup plus the
caller tracks, and writes a manifest. Does NOT assemble timing or seed the DB.

  A. Stack -> voice map lives in config.py.
  B. Caller tracks: one consistent voice (lessac), markers recorded as timestamps.
  C. Stack responses: Groq generates persona+turn-taking-aware text, Piper voices it.
  D. manifest.json ties it all together for part 2 (assembly) and the seed.

Run:  python pipeline/generate.py
"""
import json
import os
import re
import subprocess
import sys
import time
import wave

import requests

import config as C


# ---------------------------------------------------------------------------
# Env / data loading
# ---------------------------------------------------------------------------
def load_groq_key() -> str:
    if os.environ.get("GROQ_API_KEY"):
        return os.environ["GROQ_API_KEY"]
    with open(C.SERVER_ENV, encoding="utf-8") as f:
        for line in f:
            m = re.match(r"\s*GROQ_API_KEY\s*=\s*(.+)\s*$", line)
            if m:
                return m.group(1).strip()
    raise RuntimeError("GROQ_API_KEY not found in env or server/.env")


def load_data() -> dict:
    """Dump canonical stacks/scenarios from the server via Node, then read JSON."""
    subprocess.run(
        ["node", os.path.join(C.HERE, "dump-data.mjs")],
        check=True, cwd=C.HERE,
    )
    with open(os.path.join(C.OUT_DIR, "_data.json"), encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# WAV helpers (all audio is 22050 Hz / mono / 16-bit PCM)
# ---------------------------------------------------------------------------
def wav_duration_ms(path: str) -> int:
    with wave.open(path, "rb") as w:
        return round(w.getnframes() / w.getframerate() * 1000)


def read_frames(path: str) -> bytes:
    with wave.open(path, "rb") as w:
        return w.readframes(w.getnframes())


def silence_frames(ms: int) -> bytes:
    n_samples = round(ms / 1000 * C.SAMPLE_RATE)
    return b"\x00" * (n_samples * C.SAMPLE_WIDTH * C.CHANNELS)


def write_wav(path: str, frames: bytes) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(C.CHANNELS)
        w.setsampwidth(C.SAMPLE_WIDTH)
        w.setframerate(C.SAMPLE_RATE)
        w.writeframes(frames)


# ---------------------------------------------------------------------------
# Piper synthesis
# ---------------------------------------------------------------------------
def piper_synth(text: str, voice_model: str, out_path: str) -> None:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    proc = subprocess.run(
        [sys.executable, "-m", "piper", "-m", C.voice_path(voice_model), "-f", out_path],
        input=text.encode("utf-8"),
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    if proc.returncode != 0 or not os.path.exists(out_path):
        raise RuntimeError(f"piper failed for {out_path}: {proc.stderr.decode(errors='ignore')[-300:]}")


# ---------------------------------------------------------------------------
# B. Caller tracks
# ---------------------------------------------------------------------------
MARKER_RE = re.compile(r"<<([^>]+)>>")


def clean_caller_text(script: str) -> str:
    """Human-readable caller line for the Groq prompt (markers -> natural cues)."""
    s = re.sub(r"<<pause:\d+>>", " ... ", script)
    s = re.sub(r"<<[^>]+>>", "", s)
    return re.sub(r"\s+", " ", s).strip()


def build_caller(scenario: dict, tmp_dir: str) -> dict:
    """Synthesize the caller track, baking pauses into audio and recording every
    marker as a timestamp (ms) into the assembled track."""
    script = scenario["callerScript"]
    parts = re.split(r"(<<[^>]+>>)", script)

    frames = b""
    cursor_ms = 0
    markers = []
    seg_idx = 0

    for part in parts:
        m = MARKER_RE.fullmatch(part.strip()) if part.strip() else None
        if m:
            label = m.group(1)
            if label.startswith("pause:"):
                ms = int(label.split(":")[1])
                markers.append({"type": "pause", "ms": ms, "atMs": cursor_ms})
                frames += silence_frames(ms)
                cursor_ms += ms
            else:
                # cut-in / overlap: zero-duration timing marker, no caller audio
                markers.append({"type": label, "atMs": cursor_ms})
        else:
            text = part.strip()
            if not text:
                continue
            seg_path = os.path.join(tmp_dir, f"{scenario['id']}_seg{seg_idx}.wav")
            piper_synth(text, C.CALLER_VOICE, seg_path)
            frames += read_frames(seg_path)
            cursor_ms += wav_duration_ms(seg_path)
            seg_idx += 1

    out_path = os.path.join(C.OUT_DIR, "callers", f"{scenario['id']}.wav")
    write_wav(out_path, frames)
    return {
        "scenarioId": scenario["id"],
        "voice": C.CALLER_VOICE,
        "path": os.path.relpath(out_path, C.HERE).replace("\\", "/"),
        "durationMs": wav_duration_ms(out_path),
        "markers": markers,
    }


# ---------------------------------------------------------------------------
# C. Stack responses (Groq text -> Piper voice)
# ---------------------------------------------------------------------------
def turn_taking_guidance(tt: dict) -> str:
    ep, barge = tt["endpointingMs"], tt["bargeIn"]
    interrupts = barge == "stubborn" or ep <= 300
    patient = barge == "graceful" and ep >= 900
    if interrupts:
        return (
            "CRITICAL: You did NOT wait for the caller to finish. You barged in early and "
            "talked over them, so your reply reacts ONLY to the FIRST thing they said and "
            "misses or ignores any later correction or extra parts. Start abruptly, as if you "
            "cut them off mid-sentence."
        )
    if patient:
        return (
            "CRITICAL: You waited patiently for the caller to completely finish. Acknowledge "
            "their FULL input — explicitly confirm any correction and address every part of a "
            "multi-part request — so it's clear you heard everything before replying."
        )
    if barge == "laggy":
        return (
            "You were a beat slow to react. You ultimately handle the request correctly, but "
            "you sound like you caught up half a step behind the caller's latest words."
        )
    return (
        "You let the caller finish and reply promptly and correctly to exactly what they said."
    )


def build_response_prompt(stack: dict, scenario: dict) -> list:
    caller_line = clean_caller_text(scenario["callerScript"])
    tt = stack["turnTaking"]
    system = (
        "You are the voice of an automated phone agent on a live call. Output ONLY the words "
        "the agent speaks aloud in reply — 1 to 2 short, natural spoken sentences. No quotes, "
        "no narration, no stage directions, no emoji."
    )
    user = f"""CALLER SCENARIO: "{scenario['name']}" — testing {scenario['tests']}.
The caller says: "{caller_line}"
What's really being tested: {scenario['listenFor']}

YOU are the phone agent "{stack['name']}".
Persona: {stack['blurb']}
Turn-taking profile: endpointing {tt['endpointingMs']}ms, barge-in "{tt['bargeIn']}", avg latency {tt['avgResponseMs']}ms.

{turn_taking_guidance(tt)}

Write ONLY the agent's spoken reply now (1-2 short sentences)."""
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def groq_response(key: str, messages: list) -> str:
    r = requests.post(
        C.GROQ_URL,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": C.GROQ_MODEL, "messages": messages, "temperature": 0.8, "max_tokens": 120},
        timeout=60,
    )
    r.raise_for_status()
    text = r.json()["choices"][0]["message"]["content"].strip()
    return re.sub(r'^"|"$', "", text).strip()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    os.makedirs(C.OUT_DIR, exist_ok=True)
    tmp_dir = os.path.join(C.OUT_DIR, "_tmp")
    os.makedirs(tmp_dir, exist_ok=True)

    key = load_groq_key()
    data = load_data()
    stacks, scenarios = data["stacks"], data["scenarios"]

    failures = []
    groq_calls = 0
    files_created = 0

    # B. Caller tracks
    callers = []
    print("=== B. Caller tracks ===")
    for sc in scenarios:
        try:
            entry = build_caller(sc, tmp_dir)
            callers.append(entry)
            files_created += 1
            print(f"  caller {sc['id']}: {entry['durationMs']}ms, {len(entry['markers'])} markers")
        except Exception as e:
            failures.append({"kind": "caller", "scenarioId": sc["id"], "error": str(e)})
            print(f"  caller {sc['id']}: FAILED {e}")

    # C. Stack responses
    responses = []
    print("=== C. Stack responses (6 stacks x 5 scenarios) ===")
    for sc in scenarios:
        for st in stacks:
            sid, stid = sc["id"], st["id"]
            voice = C.STACK_VOICE[stid]
            try:
                messages = build_response_prompt(st, sc)
                text = groq_response(key, messages)
                groq_calls += 1
                out_path = os.path.join(C.OUT_DIR, "responses", f"{sid}__{stid}.wav")
                piper_synth(text, voice, out_path)
                files_created += 1
                responses.append({
                    "scenarioId": sid,
                    "stackId": stid,
                    "voice": voice,
                    "path": os.path.relpath(out_path, C.HERE).replace("\\", "/"),
                    "durationMs": wav_duration_ms(out_path),
                    "text": text,
                })
                print(f"  {sid}__{stid} [{voice.split('-')[1]}]: {text[:70]}")
            except Exception as e:
                failures.append({"kind": "response", "scenarioId": sid, "stackId": stid, "error": str(e)})
                print(f"  {sid}__{stid}: FAILED {e}")

    # D. Human clip mapping (human_1..5 -> scenarios in order)
    humans = []
    for i, sc in enumerate(scenarios):
        name = f"human_{i + 1}.wav"
        path = os.path.join(C.HUMAN_DIR, name)
        entry = {
            "scenarioId": sc["id"],
            "path": os.path.relpath(path, C.HERE).replace("\\", "/"),
        }
        if os.path.exists(path):
            entry["durationMs"] = wav_duration_ms(path)
        else:
            failures.append({"kind": "human", "file": name, "error": "missing"})
        humans.append(entry)

    manifest = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "groqModel": C.GROQ_MODEL,
        "callerVoice": C.CALLER_VOICE,
        "stackVoice": C.STACK_VOICE,
        "callers": callers,
        "responses": responses,
        "humans": humans,
    }
    manifest_path = os.path.join(C.OUT_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print("\n=== SUMMARY ===")
    print(f"files created: {files_created} (callers {len(callers)}, responses {len(responses)})")
    print(f"groq calls:    {groq_calls}")
    print(f"failures:      {len(failures)}")
    for fl in failures:
        print(f"  - {fl}")
    print(f"manifest:      {os.path.relpath(manifest_path, C.HERE)}")


if __name__ == "__main__":
    main()
