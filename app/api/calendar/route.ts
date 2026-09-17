import * as ical from "node-ical";

import { selectTodayEvents } from "@/lib/calendar";

export async function GET() {
  const icsUrl = process.env.CALENDAR_ICS_URL;

  if (!icsUrl) {
    return Response.json(
      { status: "unavailable", reason: "CALENDAR_ICS_URL이 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let icsText: string;
  try {
    const res = await fetch(icsUrl, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { status: "unavailable", reason: "캘린더를 가져오지 못했습니다." },
        { status: 502 }
      );
    }
    icsText = await res.text();
  } catch {
    return Response.json(
      { status: "unavailable", reason: "캘린더를 가져오지 못했습니다." },
      { status: 502 }
    );
  }

  let calendarData: ical.CalendarResponse;
  try {
    calendarData = ical.sync.parseICS(icsText);
  } catch {
    return Response.json(
      { status: "unavailable", reason: "캘린더 형식을 읽을 수 없습니다." },
      { status: 502 }
    );
  }

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const { events, overflowCount } = selectTodayEvents(
    calendarData,
    dayStart,
    dayEnd
  );

  return Response.json({ status: "ok", events, overflowCount });
}
