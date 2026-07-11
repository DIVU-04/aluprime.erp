import re
from dataclasses import dataclass
from enum import Enum


class IntentType(str, Enum):
    GREETING = "greeting"
    QUESTION = "question"
    TASK = "task"
    REMINDER = "reminder"
    DEVICE_CONTROL = "device_control"
    FILE_OPERATION = "file_operation"
    CODE = "code"
    MEMORY = "memory"
    UNKNOWN = "unknown"


@dataclass
class ParsedIntent:
    intent: IntentType
    entities: dict[str, str]
    confidence: float
    raw_text: str


GREETING_PATTERNS = re.compile(
    r"\b(hi|hello|hey|good morning|good evening|greetings)\b", re.I
)
REMINDER_PATTERNS = re.compile(r"\b(remind|reminder|schedule|at \d|tomorrow)\b", re.I)
DEVICE_PATTERNS = re.compile(r"\b(light|lights|thermostat|turn on|turn off|smart home)\b", re.I)
FILE_PATTERNS = re.compile(r"\b(file|read|write|open|save|document)\b", re.I)
CODE_PATTERNS = re.compile(r"\b(run|execute|script|code|python)\b", re.I)
MEMORY_PATTERNS = re.compile(r"\b(remember|recall|what do you know|forget)\b", re.I)
QUESTION_PATTERNS = re.compile(r"\?|^(what|who|when|where|why|how|is|are|can|could)\b", re.I)


def extract_entities(text: str) -> dict[str, str]:
    entities: dict[str, str] = {}
    time_match = re.search(r"\b(at \d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b", text, re.I)
    if time_match:
        entities["time"] = time_match.group(1)
    device_match = re.search(r"\b(lights?|thermostat|door|fan)\b", text, re.I)
    if device_match:
        entities["device"] = device_match.group(1).lower()
    action_match = re.search(r"\b(turn on|turn off|set|open|close)\b", text, re.I)
    if action_match:
        entities["action"] = action_match.group(1).lower()
    return entities


def parse_intent(text: str) -> ParsedIntent:
    text = text.strip()
    entities = extract_entities(text)

    if GREETING_PATTERNS.search(text):
        return ParsedIntent(IntentType.GREETING, entities, 0.9, text)
    if REMINDER_PATTERNS.search(text):
        return ParsedIntent(IntentType.REMINDER, entities, 0.85, text)
    if DEVICE_PATTERNS.search(text):
        return ParsedIntent(IntentType.DEVICE_CONTROL, entities, 0.85, text)
    if FILE_PATTERNS.search(text):
        return ParsedIntent(IntentType.FILE_OPERATION, entities, 0.8, text)
    if CODE_PATTERNS.search(text):
        return ParsedIntent(IntentType.CODE, entities, 0.8, text)
    if MEMORY_PATTERNS.search(text):
        return ParsedIntent(IntentType.MEMORY, entities, 0.85, text)
    if QUESTION_PATTERNS.search(text):
        return ParsedIntent(IntentType.QUESTION, entities, 0.75, text)
    if len(text.split()) > 5:
        return ParsedIntent(IntentType.TASK, entities, 0.7, text)
    return ParsedIntent(IntentType.UNKNOWN, entities, 0.5, text)
