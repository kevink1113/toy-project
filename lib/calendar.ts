import { expandRecurringEvent, type CalendarResponse } from "node-ical";

export type TodayEvent = { title: string; timeLabel: string };
export type TodayEventsResult = { events: TodayEvent[]; overflowCount: number };

const DEFAULT_MAX_COUNT = 5;
const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  minute: "2-digit",
});

export function selectTodayEvents(
  calendarData: CalendarResponse,
  dayStart: Date,
  dayEnd: Date,
  maxCount: number = DEFAULT_MAX_COUNT
): TodayEventsResult {
  const instances = Object.values(calendarData)
    .filter(
      (component): component is Extract<typeof component, { type: "VEVENT" }> =>
        component?.type === "VEVENT"
    )
    .flatMap((event) =>
      expandRecurringEvent(event, { from: dayStart, to: dayEnd })
    )
    .toSorted((a, b) => a.start.getTime() - b.start.getTime());

  const events = instances.slice(0, maxCount).map((instance) => ({
    title: String(instance.summary),
    timeLabel: instance.isFullDay ? "종일" : timeFormatter.format(instance.start),
  }));

  return {
    events,
    overflowCount: Math.max(0, instances.length - maxCount),
  };
}
