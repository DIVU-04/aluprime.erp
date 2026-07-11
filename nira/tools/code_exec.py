import subprocess
import sys
from typing import Any

from nira.tools.base import Tool, ToolResult

BLOCKED = {"import os", "import subprocess", "import shutil", "__import__", "open("}


class CodeExecTool(Tool):
    name = "run_code"
    description = "Execute short Python code snippets safely for calculations or data processing."

    def get_parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "Python code to execute",
                },
            },
            "required": ["code"],
        }

    def execute(self, **kwargs: Any) -> ToolResult:
        code = kwargs.get("code", "")
        if not code:
            return ToolResult(False, "No code provided")

        code_lower = code.lower()
        for blocked in BLOCKED:
            if blocked in code_lower:
                return ToolResult(False, f"Blocked pattern detected: {blocked}")

        try:
            result = subprocess.run(
                [sys.executable, "-c", code],
                capture_output=True,
                text=True,
                timeout=10,
            )
            output = result.stdout.strip() or result.stderr.strip()
            if result.returncode != 0:
                return ToolResult(False, f"Execution error:\n{output}")
            return ToolResult(True, output or "(no output)")
        except subprocess.TimeoutExpired:
            return ToolResult(False, "Code execution timed out (10s limit)")
        except Exception as exc:
            return ToolResult(False, str(exc))
