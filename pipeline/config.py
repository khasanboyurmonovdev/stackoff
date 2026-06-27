"""Explicit, editable configuration for the clip-generation pipeline (part 1).

Edit STACK_VOICE / CALLER_VOICE to re-cast which Piper model speaks for whom.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
VOICES_DIR = os.path.join(HERE, "voices")
OUT_DIR = os.path.join(HERE, "out")
HUMAN_DIR = os.path.join(HERE, "human")
SERVER_ENV = os.path.join(HERE, "..", "server", ".env")

# --- A. Stack -> Piper voice assignment ---------------------------------------
# We have 4 medium models (amy, ryan, lessac, kusal) for 6 stacks, so reuse is
# unavoidable. Pairs that meet in a scenario should avoid sharing a voice; this
# map keeps the two Groq-Llama "twins" (sprint=ryan, sage=ryan) apart from the
# graceful premium voices, and gives the caller its own primary voice (lessac).
STACK_VOICE = {
    "velvet": "en_US-amy-medium",
    "sprint": "en_US-ryan-medium",
    "studio": "en_US-lessac-medium",
    "thrift": "en_US-kusal-medium",
    "cosmo":  "en_US-amy-medium",
    "sage":   "en_US-ryan-medium",
}

# --- B. Caller voice (consistent across all 5 scenarios) -----------------------
# lessac is distinct from most responders (only Studio reuses it).
CALLER_VOICE = "en_US-lessac-medium"

# --- C. Groq model for response-text generation -------------------------------
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Audio format (matches Piper output exactly): 22050 Hz, mono, 16-bit PCM.
SAMPLE_RATE = 22050
CHANNELS = 1
SAMPLE_WIDTH = 2  # bytes (16-bit)


def voice_path(model_name: str) -> str:
    return os.path.join(VOICES_DIR, f"{model_name}.onnx")
