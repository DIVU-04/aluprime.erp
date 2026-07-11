import json
from pathlib import Path


class KnowledgeBase:
    """Simple local knowledge store for RAG-style context injection."""

    def __init__(self, storage_path: Path) -> None:
        self._path = storage_path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._documents: list[dict[str, str]] = self._load()

    def _load(self) -> list[dict[str, str]]:
        if self._path.exists():
            return json.loads(self._path.read_text(encoding="utf-8"))
        return []

    def _save(self) -> None:
        self._path.write_text(json.dumps(self._documents, indent=2), encoding="utf-8")

    def add_document(self, title: str, content: str) -> None:
        self._documents.append({"title": title, "content": content})
        self._save()

    def search(self, query: str, limit: int = 3) -> list[dict[str, str]]:
        query_lower = query.lower()
        scored: list[tuple[int, dict[str, str]]] = []
        for doc in self._documents:
            text = f"{doc['title']} {doc['content']}".lower()
            score = sum(1 for word in query_lower.split() if word in text)
            if score > 0:
                scored.append((score, doc))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored[:limit]]

    def context_block(self, query: str) -> str:
        results = self.search(query)
        if not results:
            return ""
        parts = [f"**{doc['title']}**: {doc['content'][:300]}" for doc in results]
        return "Relevant knowledge:\n" + "\n".join(parts)
