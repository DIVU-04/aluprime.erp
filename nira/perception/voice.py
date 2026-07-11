"""Voice input/output adapters (optional — requires additional packages)."""

from dataclasses import dataclass


@dataclass
class VoiceResult:
    text: str
    confidence: float = 1.0


class VoiceAdapter:
    """Stub for speech-to-text and text-to-speech.

    Install optional deps for full voice support:
      pip install SpeechRecognition pyttsx3 pyaudio
    """

    def listen(self) -> VoiceResult:
        raise NotImplementedError(
            "Voice input not configured. Install SpeechRecognition and pyaudio, "
            "or use text input via the CLI."
        )

    def speak(self, text: str) -> None:
        raise NotImplementedError(
            "Voice output not configured. Install pyttsx3 or use text output."
        )

    @staticmethod
    def is_available() -> bool:
        try:
            import speech_recognition  # noqa: F401
            import pyttsx3  # noqa: F401
            return True
        except ImportError:
            return False
