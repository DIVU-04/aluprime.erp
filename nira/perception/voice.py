"""Voice input/output engine for Nira Agent."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable

from nira.config import Settings


@dataclass
class VoiceResult:
    text: str
    confidence: float = 1.0
    source: str = "microphone"


class VoiceError(Exception):
    """Raised when voice operations fail."""


class VoiceEngine:
    """Speech-to-text and text-to-speech for hands-free Nira interaction."""

    WAKE_PATTERNS = (
        r"^hey\s+nira[,.!\s]*",
        r"^hi\s+nira[,.!\s]*",
        r"^ok\s+nira[,.!\s]*",
        r"^nira[,.!\s]+",
    )

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or Settings()
        self._recognizer = None
        self._microphone = None
        self._tts = None

    @staticmethod
    def stt_available() -> bool:
        try:
            import speech_recognition  # noqa: F401
            return True
        except ImportError:
            return False

    @staticmethod
    def tts_available() -> bool:
        try:
            import pyttsx3  # noqa: F401
            return True
        except ImportError:
            return False

    @staticmethod
    def microphone_available() -> bool:
        if not VoiceEngine.stt_available():
            return False
        try:
            import speech_recognition as sr

            with sr.Microphone() as source:
                sr.Recognizer().adjust_for_ambient_noise(source, duration=0.2)
            return True
        except Exception:
            return False

    @classmethod
    def is_available(cls) -> bool:
        return cls.stt_available() and cls.tts_available()

    def _get_recognizer(self):
        if self._recognizer is None:
            import speech_recognition as sr

            self._recognizer = sr.Recognizer()
            self._recognizer.energy_threshold = 300
            self._recognizer.dynamic_energy_threshold = True
            self._recognizer.pause_threshold = 0.8
        return self._recognizer

    def _get_microphone(self):
        if self._microphone is None:
            import speech_recognition as sr

            self._microphone = sr.Microphone()
        return self._microphone

    def _get_tts(self):
        if self._tts is None:
            import pyttsx3

            self._tts = pyttsx3.init()
            self._tts.setProperty("rate", self.settings.tts_rate)
            if self.settings.tts_voice:
                voices = self._tts.getProperty("voices")
                for voice in voices:
                    if self.settings.tts_voice.lower() in voice.id.lower():
                        self._tts.setProperty("voice", voice.id)
                        break
        return self._tts

    def listen(
        self,
        timeout: int | None = None,
        phrase_limit: int | None = None,
        on_listening: Callable[[], None] | None = None,
    ) -> VoiceResult:
        """Capture speech from the microphone and transcribe it."""
        if not self.stt_available():
            raise VoiceError(
                "Speech recognition not installed. Run: pip install SpeechRecognition pyaudio"
            )

        import speech_recognition as sr

        timeout = timeout if timeout is not None else self.settings.listen_timeout
        phrase_limit = phrase_limit if phrase_limit is not None else self.settings.phrase_time_limit

        recognizer = self._get_recognizer()
        try:
            with self._get_microphone() as source:
                if on_listening:
                    on_listening()
                recognizer.adjust_for_ambient_noise(source, duration=0.4)
                audio = recognizer.listen(
                    source,
                    timeout=timeout,
                    phrase_time_limit=phrase_limit,
                )
        except sr.WaitTimeoutError as exc:
            raise VoiceError("No speech detected. Try again.") from exc
        except OSError as exc:
            raise VoiceError(
                "Microphone not available. Check your audio device and pyaudio install."
            ) from exc

        try:
            text = recognizer.recognize_google(audio)
            return VoiceResult(text=text.strip(), confidence=0.9, source="google")
        except sr.UnknownValueError as exc:
            raise VoiceError("Could not understand audio. Please repeat.") from exc
        except sr.RequestError as exc:
            raise VoiceError(f"Speech recognition service error: {exc}") from exc

    def speak(self, text: str) -> None:
        """Speak text aloud using text-to-speech."""
        if not text.strip():
            return
        if not self.tts_available():
            raise VoiceError(
                "Text-to-speech not installed. Run: pip install pyttsx3"
            )

        clean = self._clean_for_speech(text)
        tts = self._get_tts()
        tts.say(clean)
        tts.runAndWait()

    def strip_wake_word(self, text: str) -> str:
        """Remove wake word prefix from transcribed speech."""
        cleaned = text.strip()
        for pattern in self.WAKE_PATTERNS:
            cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
        wake = self.settings.wake_word.lower()
        if cleaned.lower().startswith(wake):
            cleaned = cleaned[len(wake) :].lstrip(" ,.!")
        return cleaned.strip()

    def wait_for_wake_word(
        self,
        on_listening: Callable[[], None] | None = None,
    ) -> str:
        """Listen until wake word is detected, then return the command."""
        while True:
            try:
                result = self.listen(on_listening=on_listening)
            except VoiceError:
                continue

            text = result.text
            lower = text.lower()
            wake = self.settings.wake_word.lower()

            if f"hey {wake}" in lower or lower.startswith(wake):
                command = self.strip_wake_word(text)
                if command:
                    return command
                follow_up = self.listen(on_listening=on_listening)
                return follow_up.text

    @staticmethod
    def _clean_for_speech(text: str) -> str:
        """Strip markdown and symbols for natural TTS."""
        clean = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
        clean = re.sub(r"[#*_`>|]", "", clean)
        clean = re.sub(r"\s+", " ", clean)
        return clean.strip()[:500]


# Backward-compatible alias
VoiceAdapter = VoiceEngine
