from datetime import datetime, timezone
from typing import Any

import httpx

from nira.tools.base import Tool, ToolResult


class WeatherTool(Tool):
    name = "weather"
    description = "Get current weather and forecast for a city (no API key required)."

    def __init__(self, default_city: str = "London") -> None:
        self._default_city = default_city

    def get_parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "City name (default from settings)",
                },
                "days": {
                    "type": "integer",
                    "description": "Forecast days (1-3, default 1)",
                },
            },
        }

    def execute(self, **kwargs: Any) -> ToolResult:
        city = kwargs.get("city") or self._default_city
        days = min(max(int(kwargs.get("days", 1)), 1), 3)

        try:
            coords = self._geocode(city)
            if not coords:
                return ToolResult(False, f"City not found: {city}")

            lat, lon, name = coords
            weather = self._fetch_weather(lat, lon, days)
            return ToolResult(True, self._format(name, weather, days))
        except Exception as exc:
            return ToolResult(False, f"Weather lookup failed: {exc}")

    def _geocode(self, city: str) -> tuple[float, float, str] | None:
        response = httpx.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": city, "count": 1},
            timeout=10.0,
        )
        response.raise_for_status()
        results = response.json().get("results", [])
        if not results:
            return None
        r = results[0]
        return r["latitude"], r["longitude"], r.get("name", city)

    def _fetch_weather(self, lat: float, lon: float, days: int) -> dict:
        response = httpx.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min",
                "timezone": "auto",
                "forecast_days": days,
            },
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()

    def _format(self, city: str, data: dict, days: int) -> str:
        codes = {
            0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
            45: "Foggy", 51: "Drizzle", 61: "Rain", 71: "Snow", 95: "Thunderstorm",
        }
        current = data.get("current", {})
        code = current.get("weather_code", 0)
        condition = codes.get(code, "Unknown")
        lines = [
            f"Weather in {city}:",
            f"  Now: {current.get('temperature_2m', '?')}°C, {condition}",
            f"  Humidity: {current.get('relative_humidity_2m', '?')}%",
            f"  Wind: {current.get('wind_speed_10m', '?')} km/h",
        ]
        daily = data.get("daily", {})
        dates = daily.get("time", [])
        highs = daily.get("temperature_2m_max", [])
        lows = daily.get("temperature_2m_min", [])
        for i in range(min(days, len(dates))):
            d_code = daily.get("weather_code", [0])[i]
            d_cond = codes.get(d_code, "Unknown")
            lines.append(
                f"  {dates[i]}: {lows[i]:.0f}°C – {highs[i]:.0f}°C, {d_cond}"
            )
        return "\n".join(lines)
