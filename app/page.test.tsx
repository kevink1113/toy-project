import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import Home from "@/app/page";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const DEFAULT_UNAVAILABLE = { status: "unavailable", reason: "테스트 기본값" };

// 지하철 응답만 지정하고, 일정·날씨는 이 화면의 관심사가 아니므로 기본적으로
// "가져올 수 없음"으로 응답해 둔다(각 카드가 독립적으로 처리하므로 문제없다).
function mockFetchOnce(subwayBody: unknown) {
  mockFetchByUrl({ "/api/subway-arrival": subwayBody });
}

function mockFetchByUrl(responses: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      Promise.resolve({
        json: () => Promise.resolve(responses[url] ?? DEFAULT_UNAVAILABLE),
      })
    )
  );
}

test("출발 시각이 지났으면 지금 출발하라는 문구를 보여준다", async () => {
  mockFetchOnce({
    status: "ok",
    stationName: "종합운동장",
    destination: "김포공항",
    walkMinutes: 10,
    trains: [
      {
        arrivalEpochMs: Date.now() + 60_000,
        departureEpochMs: Date.now() - 1_000,
        arrivalMessage: "1분 후 (올림픽공원)",
        previousStation: "올림픽공원",
      },
    ],
  });

  render(<Home />);

  expect(await screen.findByText("지금 출발하세요")).toBeInTheDocument();
});

test("출발까지 2분 이하로 남으면 초 단위 카운트다운(mm:ss)으로 표시한다", async () => {
  mockFetchOnce({
    status: "ok",
    stationName: "종합운동장",
    destination: "김포공항",
    walkMinutes: 10,
    trains: [
      {
        arrivalEpochMs: Date.now() + 200_000,
        departureEpochMs: Date.now() + 90_000, // 2분 이하 → 카운트다운 구간
        arrivalMessage: "3분 20초 후 (올림픽공원)",
        previousStation: "올림픽공원",
      },
    ],
  });

  render(<Home />);

  expect(await screen.findByText(/출발까지 \d:\d{2}/)).toBeInTheDocument();
});

test("출발까지 여유가 있으면 분 단위로 표시하고 다음 급행열차 정보도 함께 보여준다", async () => {
  mockFetchOnce({
    status: "ok",
    stationName: "종합운동장",
    destination: "김포공항",
    walkMinutes: 10,
    trains: [
      {
        arrivalEpochMs: Date.now() + 600_000,
        departureEpochMs: Date.now() + 540_000, // 9분 남음 → 카운트다운 아님
        arrivalMessage: "10분 후 (석촌)",
        previousStation: "석촌",
      },
      {
        arrivalEpochMs: Date.now() + 900_000,
        departureEpochMs: Date.now() + 840_000,
        arrivalMessage: "15분 후 (삼전)",
        previousStation: "삼전",
      },
    ],
  });

  render(<Home />);

  expect(await screen.findByText("출발까지 9분")).toBeInTheDocument();
  expect(screen.getByText(/다음 열차: 10분 후/)).toBeInTheDocument();
  expect(screen.getByText(/다다음 열차: 15분 후/)).toBeInTheDocument();
  // 트랙 시각화: 전체 역 타임라인(한성백제~석촌)과 도착역(우리 역) 라벨이 함께 보인다.
  expect(screen.getByText("한성백제")).toBeInTheDocument();
  expect(screen.getByText("석촌")).toBeInTheDocument();
  expect(screen.getByText("종합운동장")).toBeInTheDocument();
});

test("가장 빠른 열차를 도보로는 이미 못 타면(마지노선 지남) 그다음 열차 기준으로 판단한다", async () => {
  mockFetchOnce({
    status: "ok",
    stationName: "종합운동장",
    destination: "김포공항",
    walkMinutes: 10,
    trains: [
      {
        // 8분 후 도착인데 도보 10분 → 마지노선(도착-도보)이 이미 2분 전에 지남: 못 타는 열차.
        arrivalEpochMs: Date.now() + 480_000,
        departureEpochMs: Date.now() - 120_000,
        arrivalMessage: "8분 후 (둔촌오륜)",
        previousStation: "둔촌오륜",
      },
      {
        // 20분 후 도착, 마지노선(도착-도보)이 아직 9분 남음 → 탈 수 있는 열차.
        arrivalEpochMs: Date.now() + 1_200_000,
        departureEpochMs: Date.now() + 540_000,
        arrivalMessage: "20분 후 (한성백제)",
        previousStation: "한성백제",
      },
    ],
  });

  render(<Home />);

  // 두 번째(탈 수 있는) 열차 기준으로 "출발까지 9분"이 표시되고, 트랙도 그 열차의 위치(한성백제)를 보여준다.
  expect(await screen.findByText("출발까지 9분")).toBeInTheDocument();
  expect(screen.getByText(/다음 열차: 20분 후/)).toBeInTheDocument();
  expect(screen.queryByText(/다다음 열차/)).not.toBeInTheDocument();
});

test("도착정보를 가져오지 못하면 안내 문구를 보여준다", async () => {
  mockFetchOnce({
    status: "unavailable",
    reason: "김포공항 방향 급행 열차 정보를 찾을 수 없습니다.",
  });

  render(<Home />);

  expect(
    await screen.findByText("김포공항 방향 급행 열차 정보를 찾을 수 없습니다.")
  ).toBeInTheDocument();
});

test("오늘 일정이 있으면 제목과 시각을 보여주고, 5개를 넘으면 남은 개수를 알려준다", async () => {
  mockFetchByUrl({
    "/api/subway-arrival": DEFAULT_UNAVAILABLE,
    "/api/calendar": {
      status: "ok",
      events: [{ title: "스프린트 리뷰", timeLabel: "오전 11:00" }],
      overflowCount: 3,
    },
    "/api/weather": DEFAULT_UNAVAILABLE,
  });

  render(<Home />);

  expect(await screen.findByText("스프린트 리뷰")).toBeInTheDocument();
  expect(screen.getByText("오전 11:00")).toBeInTheDocument();
  expect(screen.getByText("+3개 더")).toBeInTheDocument();
});

test("오늘 일정이 없으면 안내 문구를 보여준다", async () => {
  mockFetchByUrl({
    "/api/subway-arrival": DEFAULT_UNAVAILABLE,
    "/api/calendar": { status: "ok", events: [], overflowCount: 0 },
    "/api/weather": DEFAULT_UNAVAILABLE,
  });

  render(<Home />);

  expect(await screen.findByText("오늘 일정 없음")).toBeInTheDocument();
});

test("일정을 가져오지 못하면 캘린더 카드에만 안내가 뜬다", async () => {
  mockFetchByUrl({
    "/api/subway-arrival": DEFAULT_UNAVAILABLE,
    "/api/calendar": {
      status: "unavailable",
      reason: "캘린더를 가져오지 못했습니다.",
    },
    "/api/weather": DEFAULT_UNAVAILABLE,
  });

  render(<Home />);

  expect(
    await screen.findByText("캘린더를 가져오지 못했습니다.")
  ).toBeInTheDocument();
});

test("날씨는 기온·하늘 상태·강수 여부를 보여준다", async () => {
  mockFetchByUrl({
    "/api/subway-arrival": DEFAULT_UNAVAILABLE,
    "/api/calendar": DEFAULT_UNAVAILABLE,
    "/api/weather": {
      status: "ok",
      tempC: 27,
      description: "튼구름",
      iconKey: "cloud",
      isPrecipitating: true,
      hourly: [],
      minMax: null,
    },
  });

  render(<Home />);

  expect(await screen.findByText("27°C")).toBeInTheDocument();
  expect(screen.getByText("튼구름 · 비/눈 옴")).toBeInTheDocument();
});

test("오늘 최고·최저 기온과 시간별 예보를 함께 보여준다", async () => {
  mockFetchByUrl({
    "/api/subway-arrival": DEFAULT_UNAVAILABLE,
    "/api/calendar": DEFAULT_UNAVAILABLE,
    "/api/weather": {
      status: "ok",
      tempC: 27,
      description: "튼구름",
      iconKey: "cloud",
      isPrecipitating: false,
      hourly: [
        { timeLabel: "오후 3시", tempC: 27, iconKey: "cloud" },
        { timeLabel: "오후 6시", tempC: 26, iconKey: "cloud" },
      ],
      minMax: { minC: 22, maxC: 30 },
    },
  });

  render(<Home />);

  expect(await screen.findByText("최고 30° · 최저 22°")).toBeInTheDocument();
  expect(screen.getByText("오후 3시")).toBeInTheDocument();
  expect(screen.getByText("오후 6시")).toBeInTheDocument();
});

test("관심 종목은 현재가·등락률과 스파크라인을 함께 보여준다", async () => {
  mockFetchByUrl({
    "/api/subway-arrival": DEFAULT_UNAVAILABLE,
    "/api/calendar": DEFAULT_UNAVAILABLE,
    "/api/weather": DEFAULT_UNAVAILABLE,
    "/api/watchlist": {
      status: "ok",
      items: [
        {
          symbol: "AAPL",
          price: 332.41,
          percentChange: 0.32,
          sparkline: [330, 331, 332.41],
        },
        {
          symbol: "MSFT",
          price: 490.3,
          percentChange: -1.37,
          sparkline: [497, 493, 490.3],
        },
      ],
    },
  });

  render(<Home />);

  expect(await screen.findByText("AAPL")).toBeInTheDocument();
  expect(screen.getByText("$332.41")).toBeInTheDocument();
  expect(screen.getByText("+0.32%")).toBeInTheDocument();
  expect(screen.getByText("-1.37%")).toBeInTheDocument();
  expect(
    await screen.findByRole("img", { name: "최근 상승 추세" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: "최근 하락 추세" })
  ).toBeInTheDocument();
});

test("관심 종목 조회가 실패하면 그 카드만 안내를 보여준다", async () => {
  mockFetchByUrl({
    "/api/subway-arrival": DEFAULT_UNAVAILABLE,
    "/api/calendar": DEFAULT_UNAVAILABLE,
    "/api/weather": DEFAULT_UNAVAILABLE,
    "/api/watchlist": {
      status: "unavailable",
      reason: "관심 종목 정보를 가져오지 못했습니다.",
    },
  });

  render(<Home />);

  expect(
    await screen.findByText("관심 종목 정보를 가져오지 못했습니다.")
  ).toBeInTheDocument();
});

test("헤더에 이름과 현재 시간대에 맞는 인사말, 오늘의 명언을 보여준다", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 8, 17, 9, 0, 0)); // 오전 9시 → 아침 인사

  mockFetchByUrl({
    "/api/subway-arrival": DEFAULT_UNAVAILABLE,
    "/api/calendar": DEFAULT_UNAVAILABLE,
    "/api/weather": DEFAULT_UNAVAILABLE,
    "/api/watchlist": DEFAULT_UNAVAILABLE,
    "/api/advice": {
      status: "ok",
      message: "오늘도 좋은 하루",
      author: "익명",
    },
  });

  render(<Home />);

  expect(await screen.findByText("상원님, 좋은 아침입니다")).toBeInTheDocument();
  expect(screen.getByText(/오늘도 좋은 하루/)).toBeInTheDocument();

  vi.useRealTimers();
});

test("미세먼지·대기질 등급과 수치를 보여준다", async () => {
  mockFetchByUrl({
    "/api/subway-arrival": DEFAULT_UNAVAILABLE,
    "/api/calendar": DEFAULT_UNAVAILABLE,
    "/api/weather": DEFAULT_UNAVAILABLE,
    "/api/watchlist": DEFAULT_UNAVAILABLE,
    "/api/air-quality": { status: "ok", label: "좋음", pm25: 4, pm10: 9 },
  });

  render(<Home />);

  expect(await screen.findByText("좋음")).toBeInTheDocument();
  expect(
    screen.getByText("초미세먼지 4 · 미세먼지 9 μg/m³")
  ).toBeInTheDocument();
});

test("체크리스트 항목을 누르면 체크 상태가 바뀌고 오늘 날짜로 저장된다", async () => {
  mockFetchOnce(DEFAULT_UNAVAILABLE);

  render(<Home />);

  const umbrellaCheckbox = await screen.findByRole("checkbox", { name: "우산" });
  expect(umbrellaCheckbox).toHaveAttribute("aria-checked", "false");

  fireEvent.click(umbrellaCheckbox);

  expect(umbrellaCheckbox).toHaveAttribute("aria-checked", "true");

  const today = new Date();
  const key = `commute-checklist-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  expect(JSON.parse(window.localStorage.getItem(key) ?? "{}")).toEqual({
    우산: true,
  });
});

test("이번 달 달력에서 오늘 날짜가 표시된다", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 8, 17, 9, 0, 0)); // 2026-09-17

  mockFetchOnce(DEFAULT_UNAVAILABLE);

  render(<Home />);

  expect(await screen.findByText("2026년 9월")).toBeInTheDocument();
  expect(screen.getByText("17")).toBeInTheDocument();

  vi.useRealTimers();
});
