"use client";

import { cn } from "cn";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  TrainFront,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { greetingForHour } from "@/lib/greeting";
import { buildMonthGrid } from "@/lib/month-calendar";
import {
  findTrackPosition,
  formatCountdown,
  remainingSecondsUntil,
  selectPrimaryTrain,
} from "@/lib/subway-departure";
import type { WeatherIconKey } from "@/lib/weather";

const DASHBOARD_USER_NAME = "상원";

const REFRESH_INTERVAL_MS = 30_000;
const REFERENCE_REFRESH_INTERVAL_MS = 10 * 60_000;
const WATCHLIST_REFRESH_INTERVAL_MS = 5 * 60_000;
// 일시적 실패(네트워크 오류 등)면 다음 정상 주기까지 기다리지 않고 짧게 재시도한다.
const WATCHLIST_RETRY_INTERVAL_MS = 30_000;
const TICK_INTERVAL_MS = 1_000;
const COUNTDOWN_THRESHOLD_SECONDS = 120;
const CHECKLIST_ITEMS = [
  "우산",
  "지갑/카드",
  "마스크",
  "이어폰",
  "노트북 충전기",
];

type CalendarEvent = { title: string; timeLabel: string };
type CalendarState =
  | { kind: "loading" }
  | { kind: "unavailable"; reason: string }
  | { kind: "ok"; events: CalendarEvent[]; overflowCount: number };

type HourlyForecast = {
  timeLabel: string;
  tempC: number;
  iconKey: WeatherIconKey;
};
type WeatherState =
  | { kind: "loading" }
  | { kind: "unavailable"; reason: string }
  | {
      kind: "ok";
      tempC: number;
      description: string;
      iconKey: WeatherIconKey;
      isPrecipitating: boolean;
      hourly: HourlyForecast[];
      minMax: { minC: number; maxC: number } | null;
    };

const WEATHER_ICONS: Record<WeatherIconKey, LucideIcon> = {
  clear: Sun,
  cloud: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  thunderstorm: CloudLightning,
  fog: CloudFog,
};

function useCalendarState(): CalendarState {
  const [state, setState] = useState<CalendarState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/calendar", { cache: "no-store" });
        const body = await res.json();

        if (cancelled) return;

        if (body.status !== "ok") {
          setState({
            kind: "unavailable",
            reason: body.reason ?? "일정을 가져올 수 없습니다.",
          });
          return;
        }

        setState({
          kind: "ok",
          events: body.events,
          overflowCount: body.overflowCount,
        });
      } catch {
        if (!cancelled) {
          setState({
            kind: "unavailable",
            reason: "일정을 가져올 수 없습니다.",
          });
        }
      }
    }

    load();
    const id = setInterval(load, REFERENCE_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return state;
}

function useWeatherState(): WeatherState {
  const [state, setState] = useState<WeatherState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/weather", { cache: "no-store" });
        const body = await res.json();

        if (cancelled) return;

        if (body.status !== "ok") {
          setState({
            kind: "unavailable",
            reason: body.reason ?? "날씨를 가져올 수 없습니다.",
          });
          return;
        }

        setState({
          kind: "ok",
          tempC: body.tempC,
          description: body.description,
          iconKey: body.iconKey,
          isPrecipitating: body.isPrecipitating,
          hourly: body.hourly,
          minMax: body.minMax,
        });
      } catch {
        if (!cancelled) {
          setState({
            kind: "unavailable",
            reason: "날씨를 가져올 수 없습니다.",
          });
        }
      }
    }

    load();
    const id = setInterval(load, REFERENCE_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return state;
}

type AirQualityState =
  | { kind: "loading" }
  | { kind: "unavailable"; reason: string }
  | { kind: "ok"; label: string; pm25: number; pm10: number };

function useAirQualityState(): AirQualityState {
  const [state, setState] = useState<AirQualityState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/air-quality", { cache: "no-store" });
        const body = await res.json();

        if (cancelled) return;

        if (body.status !== "ok") {
          setState({
            kind: "unavailable",
            reason: body.reason ?? "대기질 정보를 가져올 수 없습니다.",
          });
          return;
        }

        setState({
          kind: "ok",
          label: body.label,
          pm25: body.pm25,
          pm10: body.pm10,
        });
      } catch {
        if (!cancelled) {
          setState({
            kind: "unavailable",
            reason: "대기질 정보를 가져올 수 없습니다.",
          });
        }
      }
    }

    load();
    const id = setInterval(load, REFERENCE_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return state;
}

type AdviceState =
  | { kind: "loading" }
  | { kind: "unavailable"; reason: string }
  | { kind: "ok"; message: string; author: string };

function useAdviceState(): AdviceState {
  const [state, setState] = useState<AdviceState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/advice", { cache: "no-store" });
        const body = await res.json();

        if (cancelled) return;

        if (body.status !== "ok") {
          setState({
            kind: "unavailable",
            reason: body.reason ?? "오늘의 명언을 가져올 수 없습니다.",
          });
          return;
        }

        setState({ kind: "ok", message: body.message, author: body.author });
      } catch {
        if (!cancelled) {
          setState({
            kind: "unavailable",
            reason: "오늘의 명언을 가져올 수 없습니다.",
          });
        }
      }
    }

    load();
    const id = setInterval(load, REFERENCE_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return state;
}

type WatchlistItem = {
  symbol: string;
  price: number;
  percentChange: number;
  sparkline: number[];
};
type WatchlistState =
  | { kind: "loading" }
  | { kind: "unavailable"; reason: string }
  | { kind: "ok"; items: WatchlistItem[] };

function useWatchlistState(): WatchlistState {
  const [state, setState] = useState<WatchlistState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function load() {
      let succeeded = false;

      try {
        const res = await fetch("/api/watchlist", { cache: "no-store" });
        const body = await res.json();

        if (cancelled) return;

        if (body.status !== "ok") {
          // 이전에 이미 데이터를 받아온 적이 있으면(일시적 오류 등) 그 데이터를 그대로
          // 유지하고, 처음부터 실패했을 때만 "가져올 수 없음"을 보여준다.
          setState((prev) =>
            prev.kind === "ok"
              ? prev
              : {
                  kind: "unavailable",
                  reason: body.reason ?? "관심 종목 정보를 가져올 수 없습니다.",
                },
          );
        } else {
          setState({ kind: "ok", items: body.items });
          succeeded = true;
        }
      } catch {
        if (!cancelled) {
          setState((prev) =>
            prev.kind === "ok"
              ? prev
              : {
                  kind: "unavailable",
                  reason: "관심 종목 정보를 가져올 수 없습니다.",
                },
          );
        }
      }

      // 성공하면 정상 주기로, 실패하면 짧은 간격으로 다시 시도한다.
      if (!cancelled) {
        timeoutId = setTimeout(
          load,
          succeeded
            ? WATCHLIST_REFRESH_INTERVAL_MS
            : WATCHLIST_RETRY_INTERVAL_MS,
        );
      }
    }

    load();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return state;
}

const SPARKLINE_WIDTH = 64;
const SPARKLINE_HEIGHT = 24;

function Sparkline({ data, isUp }: { data: number[]; isUp: boolean }) {
  if (data.length < 2) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * SPARKLINE_WIDTH;
      const y = SPARKLINE_HEIGHT - ((value - min) / range) * SPARKLINE_HEIGHT;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={SPARKLINE_WIDTH}
      height={SPARKLINE_HEIGHT}
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
      className={cn("shrink-0", isUp ? "text-success" : "text-destructive")}
      role="img"
      aria-label={isUp ? "최근 상승 추세" : "최근 하락 추세"}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WatchlistCard({ watchlistState }: { watchlistState: WatchlistState }) {
  return (
    <Card
      size="sm"
      className="w-full max-w-md flex-1 basis-80 animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      <CardHeader>
        <CardTitle className="text-sm">관심 종목</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {watchlistState.kind === "loading" && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        )}
        {watchlistState.kind === "unavailable" && (
          <p className="truncate text-xs text-muted-foreground">
            {watchlistState.reason}
          </p>
        )}
        {watchlistState.kind === "ok" &&
          watchlistState.items.map((item) => {
            const isUp = item.percentChange >= 0;

            return (
              <div
                key={item.symbol}
                className="flex items-center justify-between gap-3"
              >
                <span className="w-14 shrink-0 text-sm font-medium">
                  {item.symbol}
                </span>
                <Sparkline data={item.sparkline} isUp={isUp} />
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium">
                    ${item.price.toFixed(2)}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      isUp ? "text-success" : "text-destructive",
                    )}
                  >
                    {isUp ? "+" : ""}
                    {item.percentChange.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function MonthCalendarCard({ now }: { now: number }) {
  const grid = buildMonthGrid(new Date(now));

  return (
    <Card
      size="sm"
      className="w-full max-w-md flex-1 basis-80 animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      <CardHeader>
        <CardTitle className="text-sm">
          {grid.year}년 {grid.month}월
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        {grid.weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className="flex items-center justify-center py-0.5"
              >
                {day && (
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs",
                      day === grid.todayDate
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {day}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AirQualityCard({
  airQualityState,
}: {
  airQualityState: AirQualityState;
}) {
  return (
    <Card
      size="sm"
      className="w-full max-w-md flex-1 basis-80 animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      <CardHeader>
        <CardTitle className="text-sm">미세먼지·대기질</CardTitle>
      </CardHeader>
      <CardContent>
        {airQualityState.kind === "loading" && (
          <Skeleton className="h-9 w-32" />
        )}
        {airQualityState.kind === "unavailable" && (
          <p className="truncate text-xs text-muted-foreground">
            {airQualityState.reason}
          </p>
        )}
        {airQualityState.kind === "ok" && (
          <div>
            <p className="text-xl font-semibold text-foreground">
              {airQualityState.label}
            </p>
            <p className="text-xs text-muted-foreground">
              초미세먼지 {airQualityState.pm25} · 미세먼지{" "}
              {airQualityState.pm10} μg/m³
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function todayChecklistKey(now: number): string {
  const date = new Date(now);
  return `commute-checklist-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function useChecklistState(now: number) {
  const key = todayChecklistKey(now);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      setChecked(raw ? JSON.parse(raw) : {});
    } catch {
      setChecked({});
    }
  }, [key]);

  function toggle(item: string) {
    setChecked((prev) => {
      const next = { ...prev, [item]: !prev[item] };
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // 저장에 실패해도(비공개 모드 등) 화면 상태는 그대로 유지한다.
      }
      return next;
    });
  }

  return { checked, toggle };
}

function ChecklistCard({ now }: { now: number }) {
  const { checked, toggle } = useChecklistState(now);

  return (
    <Card
      size="sm"
      className="w-full max-w-md flex-1 basis-80 animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      <CardHeader>
        <CardTitle className="text-sm">출근 전 체크리스트</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {CHECKLIST_ITEMS.map((item) => (
          <label key={item} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!checked[item]}
              onCheckedChange={() => toggle(item)}
            />
            <span
              className={cn(
                checked[item] && "text-muted-foreground line-through",
              )}
            >
              {item}
            </span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

function ReferencePanel({
  calendarState,
  weatherState,
}: {
  calendarState: CalendarState;
  weatherState: WeatherState;
}) {
  const nextEvent =
    calendarState.kind === "ok" ? calendarState.events[0] : undefined;
  const restEvents =
    calendarState.kind === "ok" ? calendarState.events.slice(1) : [];

  return (
    <Card
      size="sm"
      className="w-full max-w-md flex-1 basis-80 animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      <CardContent className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-3">
          {weatherState.kind === "loading" && <Skeleton className="h-9 w-20" />}
          {weatherState.kind === "unavailable" && (
            <p className="truncate text-xs text-muted-foreground">
              {weatherState.reason}
            </p>
          )}
          {weatherState.kind === "ok" &&
            (() => {
              const WeatherIcon = WEATHER_ICONS[weatherState.iconKey];
              return (
                <>
                  <WeatherIcon className="size-8 shrink-0 text-primary" />
                  <div>
                    <p className="text-2xl leading-none font-semibold">
                      {weatherState.tempC}°C
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {weatherState.description}
                      {weatherState.isPrecipitating ? " · 비/눈 옴" : ""}
                    </p>
                    {weatherState.minMax && (
                      <p className="text-xs text-muted-foreground">
                        최고 {weatherState.minMax.maxC}° · 최저{" "}
                        {weatherState.minMax.minC}°
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
        </div>

        <Separator orientation="vertical" />

        <div>
          {calendarState.kind === "loading" && (
            <Skeleton className="h-9 w-24" />
          )}
          {calendarState.kind === "unavailable" && (
            <p className="truncate text-xs text-muted-foreground">
              {calendarState.reason}
            </p>
          )}
          {calendarState.kind === "ok" && !nextEvent && (
            <p className="text-xs text-muted-foreground">오늘 일정 없음</p>
          )}
          {calendarState.kind === "ok" && nextEvent && (
            <>
              <p className="text-[11px] text-muted-foreground">다음 일정</p>
              <p className="truncate text-sm font-medium">{nextEvent.title}</p>
              <p className="text-xs text-muted-foreground">
                {nextEvent.timeLabel}
              </p>
            </>
          )}
        </div>
      </CardContent>

      {weatherState.kind === "ok" && weatherState.hourly.length > 0 && (
        <>
          <Separator />
          <CardContent className="flex gap-4 overflow-x-auto">
            {weatherState.hourly.map((hour, index) => {
              const HourIcon = WEATHER_ICONS[hour.iconKey];
              return (
                <div
                  key={`${hour.timeLabel}-${index}`}
                  className="flex shrink-0 flex-col items-center gap-1"
                >
                  <span className="text-xs text-muted-foreground">
                    {hour.timeLabel}
                  </span>
                  <HourIcon className="size-4 text-primary" />
                  <span className="text-xs font-medium">{hour.tempC}°</span>
                </div>
              );
            })}
          </CardContent>
        </>
      )}

      {calendarState.kind === "ok" &&
        (restEvents.length > 0 || calendarState.overflowCount > 0) && (
          <>
            <Separator />
            <CardContent className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              {restEvents.map((event, index) => (
                <div
                  key={`${event.title}-${index}`}
                  className="flex justify-between gap-2"
                >
                  <span className="truncate">{event.title}</span>
                  <span className="shrink-0">{event.timeLabel}</span>
                </div>
              ))}
              {calendarState.overflowCount > 0 && (
                <p>+{calendarState.overflowCount}개 더</p>
              )}
            </CardContent>
          </>
        )}
    </Card>
  );
}

type Train = {
  departureEpochMs: number;
  arrivalMessage: string;
  previousStation: string;
};

type ArrivalState =
  | { kind: "loading" }
  | { kind: "unavailable"; reason: string }
  | {
      kind: "ok";
      stationName: string;
      walkMinutes: number;
      trains: Train[];
      fetchedAt: Date;
    };

function DepartureStatus({ remainingSeconds }: { remainingSeconds: number }) {
  if (remainingSeconds <= 0) {
    return (
      <span className="text-3xl font-semibold text-destructive">
        지금 출발하세요
      </span>
    );
  }

  if (remainingSeconds <= COUNTDOWN_THRESHOLD_SECONDS) {
    return (
      <span className="text-3xl font-semibold text-destructive">
        출발까지 {formatCountdown(remainingSeconds)}
      </span>
    );
  }

  return (
    <span className="text-3xl font-semibold text-foreground">
      출발까지 {Math.round(remainingSeconds / 60)}분
    </span>
  );
}

function TrainTrack({
  previousStation,
  destination,
}: {
  previousStation: string;
  destination: string;
}) {
  const { stations, activeIndex } = findTrackPosition(
    previousStation,
    destination,
  );

  return (
    <div className="relative mx-1 my-6">
      <div className="absolute inset-x-3 top-3 h-0.5 -translate-y-1/2 bg-muted" />
      <div className="relative flex items-start justify-between">
        {stations.map((name, index) => {
          const isActive = index === activeIndex;
          const isDestination = index === stations.length - 1;

          return (
            <div key={name} className="flex flex-col items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center">
                {isActive ? (
                  <span className="flex size-7 items-center justify-center rounded-full bg-background ring-4 ring-background">
                    <TrainFront className="size-4 text-primary" />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "block size-2 rounded-full",
                      isDestination
                        ? "bg-foreground/70"
                        : "bg-muted-foreground/40",
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "max-w-14 text-center text-[11px] leading-tight",
                  isDestination
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type BackgroundState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | {
      kind: "ok";
      imageUrl: string;
      photographerName: string;
      photographerProfileUrl: string;
    };

function withUnsplashUtm(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}utm_source=commute-dashboard&utm_medium=referral`;
}

function useBackgroundState(): BackgroundState {
  const [state, setState] = useState<BackgroundState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/background", { cache: "no-store" });
        const body = await res.json();

        if (cancelled) return;

        if (body.status !== "ok") {
          setState({ kind: "unavailable" });
          return;
        }

        setState({
          kind: "ok",
          imageUrl: body.imageUrl,
          photographerName: body.photographerName,
          photographerProfileUrl: body.photographerProfileUrl,
        });
      } catch {
        if (!cancelled) {
          setState({ kind: "unavailable" });
        }
      }
    }

    load();
    const id = setInterval(load, REFERENCE_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return state;
}

export default function Home() {
  const [state, setState] = useState<ArrivalState>({ kind: "loading" });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/subway-arrival", { cache: "no-store" });
        const body = await res.json();

        if (cancelled) return;

        if (body.status !== "ok") {
          setState({
            kind: "unavailable",
            reason: body.reason ?? "도착정보를 가져올 수 없습니다.",
          });
          return;
        }

        setState({
          kind: "ok",
          stationName: body.stationName,
          walkMinutes: body.walkMinutes,
          trains: body.trains,
          fetchedAt: new Date(),
        });
      } catch {
        if (!cancelled) {
          setState({
            kind: "unavailable",
            reason: "도착정보를 가져올 수 없습니다.",
          });
        }
      }
    }

    load();
    const id = setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const calendarState = useCalendarState();
  const weatherState = useWeatherState();
  const watchlistState = useWatchlistState();
  const adviceState = useAdviceState();
  const airQualityState = useAirQualityState();
  const backgroundState = useBackgroundState();

  const primary =
    state.kind === "ok" ? selectPrimaryTrain(state.trains, now) : undefined;
  const nextAfterPrimary =
    state.kind === "ok" && primary
      ? state.trains[state.trains.indexOf(primary) + 1]
      : undefined;

  return (
    <div
      className="relative flex flex-1 flex-col items-center bg-background bg-cover bg-center"
      style={
        backgroundState.kind === "ok"
          ? { backgroundImage: `url(${backgroundState.imageUrl})` }
          : undefined
      }
    >
      {backgroundState.kind === "ok" && (
        <div
          className="absolute inset-0 bg-background/75 backdrop-blur-[2px]"
          aria-hidden
        />
      )}

      <div className="relative z-10 flex w-full flex-1 flex-col items-center gap-6 px-4 py-10">
        <header className="flex w-full max-w-5xl flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">
            {DASHBOARD_USER_NAME}님, {greetingForHour(new Date(now).getHours())}
          </h1>
          {adviceState.kind === "ok" && (
            <p className="truncate text-sm text-muted-foreground">
              “{adviceState.message}” — {adviceState.author}
            </p>
          )}
        </header>

        <div className="flex w-full max-w-5xl flex-wrap items-start justify-center gap-4">
          <Card className="w-full max-w-md flex-1 basis-80">
            <CardHeader>
              <CardTitle>종합운동장역 9호선 급행</CardTitle>
              <CardDescription>
                김포공항 방향 · 30초마다 자동 갱신
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {state.kind === "loading" && (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-10 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}

              {state.kind === "unavailable" && (
                <Alert variant="destructive">
                  <AlertTitle>정보를 가져올 수 없습니다</AlertTitle>
                  <AlertDescription>{state.reason}</AlertDescription>
                </Alert>
              )}

              {state.kind === "ok" && primary && (
                <>
                  <TrainTrack
                    previousStation={primary.previousStation}
                    destination={state.stationName}
                  />

                  <div className="flex flex-col gap-1">
                    <DepartureStatus
                      remainingSeconds={remainingSecondsUntil(
                        primary.departureEpochMs,
                        now,
                      )}
                    />
                    <Badge
                      variant={
                        remainingSecondsUntil(primary.departureEpochMs, now) <=
                        0
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      도보 {state.walkMinutes}분 기준
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    다음 열차: {primary.arrivalMessage}
                  </p>

                  {nextAfterPrimary && (
                    <p className="text-xs text-muted-foreground">
                      다다음 열차: {nextAfterPrimary.arrivalMessage}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    마지막 확인: {state.fetchedAt.toLocaleTimeString("ko-KR")}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <ReferencePanel
            calendarState={calendarState}
            weatherState={weatherState}
          />
          <MonthCalendarCard now={now} />
          <AirQualityCard airQualityState={airQualityState} />
          <ChecklistCard now={now} />
          <WatchlistCard watchlistState={watchlistState} />
        </div>

        {backgroundState.kind === "ok" && (
          <p className="w-full max-w-5xl px-4 pb-4 text-right text-[11px] text-muted-foreground">
            Photo by{" "}
            <a
              href={withUnsplashUtm(backgroundState.photographerProfileUrl)}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {backgroundState.photographerName}
            </a>{" "}
            on{" "}
            <a
              href={withUnsplashUtm("https://unsplash.com/")}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Unsplash
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
