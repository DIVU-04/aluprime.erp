from typing import Any

import httpx

from nira.tools.base import Tool, ToolResult


class HttpFetchTool(Tool):
    name = "http_fetch"
    description = "Fetch data from a URL (GET requests only). Useful for APIs and web pages."

    def get_parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL to fetch"},
            },
            "required": ["url"],
        }

    def execute(self, **kwargs: Any) -> ToolResult:
        url = kwargs.get("url", "").strip()
        if not url:
            return ToolResult(False, "URL is required")
        if not url.startswith(("http://", "https://")):
            return ToolResult(False, "Only http/https URLs are supported")

        try:
            response = httpx.get(url, timeout=15.0, follow_redirects=True)
            response.raise_for_status()
            content = response.text[:4000]
            return ToolResult(
                True,
                f"Status: {response.status_code}\nContent-Type: {response.headers.get('content-type', 'unknown')}\n\n{content}",
            )
        except Exception as exc:
            return ToolResult(False, f"HTTP fetch failed: {exc}")
