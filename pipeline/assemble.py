"""Clip pipeline — PART 2 (A + B): assemble final conversation clips and encode
them for serving.

A. For every response (30) and human clip (5): mix the caller track with the
   responder audio, time-placed per the scenario's turn-taking markers and the
   stack's turnTaking profile, then loudnorm. -> pipeline/out/final/*.wav
B. Transcode each final clip to mono MP3 into server/audio/<clipId>.mp3 (smaller
   for mobile; MP3 chosen for universal browser/iOS support). Also writes
   pipeline/out/clips.json for the seeder (clipId, source, final duration, file).

Run:  python pipeline/assemble.py
"""
import json
import os
import subprocess
import wave

import config as C

FINAL_DIR = os.path.join(C.OUT_DIR, "final")
SERVER_AUDIO = os.path.join(C.HERE, "..", "server", "audio")
HUMAN_GAP_MS = 600
MP3_BITRATE = "96k"  # plenty for mono speech, small for mobile


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def abspath(rel):
    return os.path.normpath(os.path.join(C.HERE, rel))


def wav_duration_ms(path):
    with wave.open(path, "rb") as w:
        return round(w.getnframes() / w.getframerate() * 1000)


def compute_delay(caller, tt, is_human):
    """Return ms offset (from caller start) at which the responder begins."""
    caller_dur = caller["durationMs"]
    markers = caller["markers"]
    types = [m["type"] for m in markers]

    # INTERRUPTION: stubborn/low-endpointing barges in at the cut-in point.
    if "cut-in" in types:
        if is_human:
            return caller_dur + HUMAN_GAP_MS
        interrupts = tt["bargeIn"] == "stubborn" or tt["endpointingMs"] <= 300
        if interrupts:
            return next(m["atMs"] for m in markers if m["type"] == "cut-in")
        return caller_dur + tt["avgResponseMs"]

    # LONG-PAUSE: silence is baked in. Low endpointing jumps in during the pause;
    # a patient stack (>=900ms) waits for the caller to fully finish.
    if "pause" in types:
        if is_human:
            return caller_dur + HUMAN_GAP_MS
        pause = next(m for m in markers if m["type"] == "pause")
        if tt["endpointingMs"] >= 900:
            return caller_dur + tt["avgResponseMs"]
        return pause["atMs"] + tt["endpointingMs"]

    # BACKCHANNEL: responder talks, caller's "mm-hm" overlays it mid-response.
    if "overlap" in types:
        return min(m["atMs"] for m in markers if m["type"] == "overlap")

    # DEFAULT: responder waits for caller to finish, then its own latency / gap.
    if is_human:
        return caller_dur + HUMAN_GAP_MS
    return caller_dur + tt["avgResponseMs"]


def mix(caller_wav, resp_wav, delay_ms, out_wav):
    os.makedirs(os.path.dirname(out_wav), exist_ok=True)
    delay = max(0, int(delay_ms))
    fc = (
        f"[1:a]adelay={delay}:all=1[r];"
        f"[0:a][r]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[m];"
        f"[m]loudnorm=I=-16:TP=-1.5:LRA=11[o]"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-i", caller_wav, "-i", resp_wav,
         "-filter_complex", fc, "-map", "[o]",
         "-ar", str(C.SAMPLE_RATE), "-ac", "1", "-c:a", "pcm_s16le", out_wav],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
    )


def to_mp3(wav_path, mp3_path):
    os.makedirs(os.path.dirname(mp3_path), exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-i", wav_path, "-ac", "1", "-ar", str(C.SAMPLE_RATE),
         "-c:a", "libmp3lame", "-b:a", MP3_BITRATE, mp3_path],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
    )


def main():
    manifest = load_json(os.path.join(C.OUT_DIR, "manifest.json"))
    data = load_json(os.path.join(C.OUT_DIR, "_data.json"))
    tt_by_stack = {s["id"]: s["turnTaking"] for s in data["stacks"]}
    caller_by_scenario = {c["scenarioId"]: c for c in manifest["callers"]}

    clips = []
    built = 0
    sample_durations = []

    # A+B for stack responses
    for r in manifest["responses"]:
        sid, stid = r["scenarioId"], r["stackId"]
        caller = caller_by_scenario[sid]
        delay = compute_delay(caller, tt_by_stack[stid], is_human=False)
        clip_id = f"{sid}__{stid}"
        final_wav = os.path.join(FINAL_DIR, f"{clip_id}.wav")
        mix(abspath(caller["path"]), abspath(r["path"]), delay, final_wav)
        dur = wav_duration_ms(final_wav)
        to_mp3(final_wav, os.path.join(SERVER_AUDIO, f"{clip_id}.mp3"))
        clips.append({
            "clipId": clip_id, "scenarioId": sid, "sourceType": "stack",
            "sourceId": stid, "file": f"{clip_id}.mp3", "durationMs": dur,
            "delayMs": int(delay),
        })
        built += 1
        if sid in ("interruption", "long-pause") and stid in ("sprint", "sage"):
            sample_durations.append((clip_id, delay, dur))

    # A+B for human clips
    for h in manifest["humans"]:
        sid = h["scenarioId"]
        caller = caller_by_scenario[sid]
        delay = compute_delay(caller, None, is_human=True)
        clip_id = f"{sid}__human"
        final_wav = os.path.join(FINAL_DIR, f"{clip_id}.wav")
        mix(abspath(caller["path"]), abspath(h["path"]), delay, final_wav)
        dur = wav_duration_ms(final_wav)
        to_mp3(final_wav, os.path.join(SERVER_AUDIO, f"{clip_id}.mp3"))
        clips.append({
            "clipId": clip_id, "scenarioId": sid, "sourceType": "human",
            "sourceId": "human", "file": f"{clip_id}.mp3", "durationMs": dur,
            "delayMs": int(delay),
        })
        built += 1

    with open(os.path.join(C.OUT_DIR, "clips.json"), "w", encoding="utf-8") as f:
        json.dump(clips, f, indent=2)

    print(f"=== ASSEMBLY DONE ===")
    print(f"final clips built: {built} (30 stack + 5 human)")
    print(f"final WAVs -> {os.path.relpath(FINAL_DIR, C.HERE)}")
    print(f"serving MP3s -> server/audio/  ({MP3_BITRATE} mono)")
    print(f"clip index -> out/clips.json")
    print("example durations (clipId | responder start ms | final ms):")
    for cid, d, dur in sample_durations:
        print(f"  {cid:28s} start={d:6d}  final={dur}")


if __name__ == "__main__":
    main()
