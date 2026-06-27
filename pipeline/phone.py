"""Clip pipeline — "telephone line" tonal pass (balanced).

Runs EVERY assembled final clip (human AND stack) through one shared phone-call
treatment so neither audio quality nor human cues (dynamics, room tone, pristine
TTS silence) give away which is which. Tuned for clear intelligibility first,
while still obviously phone-quality.

Chain, in order (single ffmpeg pass):
  1. Telephone band   : highpass=300, lowpass=3300 (phone character, words intact)
  2. Hard compression : acompressor thr~-22dB, ratio 3.5:1 — flattens the human's
                        natural dynamic range that TTS lacks (this worked; kept)
  3. Codec artifact   : resample 8 kHz -> 22050 (narrowband band-limiting) WITHOUT
                        heavy GSM quantization — gives the "phone" artifact while
                        keeping speech crisp (dropping GSM is what restored clarity)
  4. Comfort noise    : faint pink bed (amplitude 0.003) so dead air isn't digital
                        silence — quieter than before so it doesn't muddy
  5. loudnorm I=-16   : last, so loudness stays matched (no volume tell)

  pipeline/out/final/*.wav  (untouched source)
    -> steps 1-5 -> pipeline/out/phone/*.wav
    -> MP3 96k mono -> server/audio/<clipId>.mp3 (overwrite, same clipIds)

Durations / timing unchanged. Re-tune the constants below and re-run; no re-assembly.

Run:  python pipeline/phone.py
"""
import glob
import os
import subprocess

import config as C

FINAL_DIR = os.path.join(C.OUT_DIR, "final")
PHONE_DIR = os.path.join(C.OUT_DIR, "phone")
SERVER_AUDIO = os.path.join(C.HERE, "..", "server", "audio")
MP3_BITRATE = "96k"

NARROW_RATE = 8000          # downsample target for the band-limiting artifact
NOISE_AMPLITUDE = 0.003     # faint open-line comfort noise (pink)

# Speech chain applied to the clip before the noise bed (steps 1-3).
#   acompressor threshold 0.079 ~ -22 dB
SPEECH_CHAIN = (
    "highpass=f=300,"
    "lowpass=f=3300,"
    "acompressor=threshold=0.079:ratio=3.5:attack=5:release=60,"
    f"aresample={NARROW_RATE},"
    f"aresample={C.SAMPLE_RATE}"
)


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def apply_phone(src_wav, out_wav):
    os.makedirs(os.path.dirname(out_wav), exist_ok=True)
    fc = (
        f"[0:a]{SPEECH_CHAIN}[s];"
        f"[s][1:a]amix=inputs=2:duration=first:normalize=0[m];"
        f"[m]loudnorm=I=-16:TP=-1.5:LRA=11[o]"
    )
    run(["ffmpeg", "-y", "-i", src_wav,
         "-f", "lavfi", "-i",
         f"anoisesrc=color=pink:amplitude={NOISE_AMPLITUDE}:sample_rate={C.SAMPLE_RATE}",
         "-filter_complex", fc, "-map", "[o]",
         "-ar", str(C.SAMPLE_RATE), "-ac", "1", "-c:a", "pcm_s16le", out_wav])


def to_mp3(wav_path, mp3_path):
    os.makedirs(os.path.dirname(mp3_path), exist_ok=True)
    run(["ffmpeg", "-y", "-i", wav_path, "-ac", "1", "-ar", str(C.SAMPLE_RATE),
         "-c:a", "libmp3lame", "-b:a", MP3_BITRATE, mp3_path])


def main():
    wavs = sorted(glob.glob(os.path.join(FINAL_DIR, "*.wav")))
    if not wavs:
        raise SystemExit("no final WAVs found — run assemble.py first")

    processed = 0
    for src in wavs:
        clip_id = os.path.splitext(os.path.basename(src))[0]
        phone_wav = os.path.join(PHONE_DIR, f"{clip_id}.wav")
        apply_phone(src, phone_wav)
        to_mp3(phone_wav, os.path.join(SERVER_AUDIO, f"{clip_id}.mp3"))
        processed += 1

    print("=== BALANCED PHONE PASS DONE ===")
    print(f"clips processed: {processed} (all human + stack finals)")
    print(f"filtered WAVs -> {os.path.relpath(PHONE_DIR, C.HERE)} (source finals untouched)")
    print(f"re-encoded MP3 -> server/audio/ ({MP3_BITRATE} mono, overwritten)")
    print("chain: band 300-3300 -> acompressor -22dB/3.5:1 -> 8kHz resample "
          f"(no GSM) -> pink noise {NOISE_AMPLITUDE} -> loudnorm I=-16")


if __name__ == "__main__":
    main()
