import * as ical from "node-ical";
import { describe, expect, test } from "vitest";

import { selectTodayEvents } from "@/lib/calendar";

// 2026-03-10(화, KST) 하루를 기준일로 고정한다.
const DAY_START = new Date(2026, 2, 10, 0, 0, 0);
const DAY_END = new Date(2026, 2, 11, 0, 0, 0);

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//test//test//EN
BEGIN:VEVENT
UID:timed-today@test
DTSTART;TZID=Asia/Seoul:20260310T140000
DTEND;TZID=Asia/Seoul:20260310T150000
SUMMARY:오늘 시간 회의
END:VEVENT
BEGIN:VEVENT
UID:allday-today@test
DTSTART;VALUE=DATE:20260310
DTEND;VALUE=DATE:20260311
SUMMARY:오늘 종일 이벤트
END:VEVENT
BEGIN:VEVENT
UID:other-day@test
DTSTART;TZID=Asia/Seoul:20260311T090000
DTEND;TZID=Asia/Seoul:20260311T100000
SUMMARY:다음날 일정
END:VEVENT
BEGIN:VEVENT
UID:weekly@test
DTSTART;TZID=Asia/Seoul:20260303T100000
DTEND;TZID=Asia/Seoul:20260303T103000
RRULE:FREQ=WEEKLY;BYDAY=TU
SUMMARY:매주 화요일 회의
END:VEVENT
END:VCALENDAR
`;

describe("selectTodayEvents", () => {
  test("오늘 안에 드는 이벤트만 시작 시각 순으로 반환하고, 종일/반복 이벤트도 포함한다", () => {
    const calendarData = ical.sync.parseICS(SAMPLE_ICS);

    const result = selectTodayEvents(calendarData, DAY_START, DAY_END);

    expect(result).toEqual({
      events: [
        { title: "오늘 종일 이벤트", timeLabel: "종일" },
        { title: "매주 화요일 회의", timeLabel: "오전 10:00" },
        { title: "오늘 시간 회의", timeLabel: "오후 2:00" },
      ],
      overflowCount: 0,
    });
  });

  test("maxCount를 넘는 이벤트는 잘라내고 overflowCount로 알려준다", () => {
    const calendarData = ical.sync.parseICS(SAMPLE_ICS);

    const result = selectTodayEvents(calendarData, DAY_START, DAY_END, 2);

    expect(result).toEqual({
      events: [
        { title: "오늘 종일 이벤트", timeLabel: "종일" },
        { title: "매주 화요일 회의", timeLabel: "오전 10:00" },
      ],
      overflowCount: 1,
    });
  });
});
