"""Daily briefing composer — aggregates context for morning reports."""

from datetime import datetime, timezone

from nira.agent.orchestrator import NiraAgent
from nira.tools.calendar import CalendarTool
from nira.tools.timers import TimersTool
from nira.tools.weather import WeatherTool


class BriefingService:
    """Builds a daily briefing from calendar, weather, timers, and memory."""

    def __init__(self, agent: NiraAgent) -> None:
        self._agent = agent

    def generate(self) -> str:
        settings = self._agent.settings
        name = self._agent.user_profile.get("name", "User")
        now = datetime.now(timezone.utc)
        sections: list[str] = [
            f"Good morning, {name}. Here is your briefing for {now.strftime('%A, %B %d, %Y')}.",
            "",
        ]

        # Weather
        weather_tool = self._agent.tools.get("weather")
        if isinstance(weather_tool, WeatherTool):
            result = weather_tool.execute(city=settings.default_city, days=1)
            if result.success:
                sections.append(result.output)
                sections.append("")

        # Calendar
        calendar_tool = self._agent.tools.get("calendar")
        if isinstance(calendar_tool, CalendarTool):
            result = calendar_tool.execute(action="list")
            sections.append("Calendar:")
            sections.append(result.output if result.success else "  No events.")
            sections.append("")

        # Pending timers/reminders
        timers_tool = self._agent.tools.get("timers")
        if isinstance(timers_tool, TimersTool):
            due = timers_tool.get_due_now()
            pending = timers_tool.execute(action="pending")
            if due:
                sections.append("Overdue reminders:")
                for item in due:
                    sections.append(f"  - {item['message']}")
                sections.append("")
            sections.append("Pending timers:")
            sections.append(pending.output if pending.success else "  None.")
            sections.append("")

        # Memory facts
        facts = self._agent.long_term.get_facts(limit=5)
        if facts:
            sections.append("Things I remember:")
            for fact in facts:
                sections.append(f"  - {fact}")
            sections.append("")

        sections.append("Have a productive day.")
        return "\n".join(sections)
