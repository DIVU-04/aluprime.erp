from typing import Any

import httpx

from nira.tools.base import Tool, ToolResult


class WebSearchTool(Tool):
    name = "web_search"
    description = "Search the web for current information using DuckDuckGo."

    def get_parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results (default 5)",
                },
            },
            "required": ["query"],
        }

    def execute(self, **kwargs: Any) -> ToolResult:
        query = kwargs.get("query", "")
        max_results = kwargs.get("max_results", 5)
        if not query:
            return ToolResult(False, "Query is required")

        try:
            response = httpx.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": 1},
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()

            results: list[str] = []
            abstract = data.get("AbstractText", "")
            if abstract:
                results.append(f"Summary: {abstract}")

            for topic in data.get("RelatedTopics", [])[:max_results]:
                if isinstance(topic, dict) and "Text" in topic:
                    results.append(topic["Text"])

            if not results:
                return ToolResult(
                    True,
                    f"No detailed results found for '{query}'. Try rephrasing.",
                )
            return ToolResult(True, "\n".join(results[:max_results]))
        except Exception as exc:
            return ToolResult(False, f"Search failed: {exc}")
