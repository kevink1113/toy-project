export const WATCHLIST_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA", "GOOGL"] as const;

// 야후 파이낸스 비공식 spark 엔드포인트가 심볼당 하나씩 내려주는 응답 형태.
// (공식 문서가 없는 비공식 엔드포인트라 실제 응답을 근거로 구조를 잡았다.)
export type YahooSparkRaw = {
  spark?: {
    result?: Array<{
      symbol: string;
      response?: Array<{
        meta?: {
          regularMarketPrice?: number;
          regularMarketChangePercent?: number;
        };
        indicators?: {
          quote?: Array<{ close?: Array<number | null> }>;
        };
      }>;
    }>;
  };
};

const YAHOO_SPARK_URL = "https://query1.finance.yahoo.com/v7/finance/spark";
// User-Agent가 없거나 curl 기본값이면 429로 막히는 걸 확인해, 브라우저처럼 보이는
// User-Agent를 붙인다(비공식 엔드포인트라 문서화된 요구사항은 아니다).
const YAHOO_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export async function fetchYahooSpark(
  symbols: readonly string[]
): Promise<YahooSparkRaw | null> {
  const url = `${YAHOO_SPARK_URL}?symbols=${symbols.join(",")}&range=1d&interval=1h`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": YAHOO_USER_AGENT },
  });
  if (!res.ok) {
    return null;
  }

  return (await res.json()) as YahooSparkRaw;
}

export type WatchlistItem = {
  symbol: string;
  price: number;
  percentChange: number;
  sparkline: number[];
};

export function buildWatchlist(
  symbols: readonly string[],
  raw: YahooSparkRaw
): WatchlistItem[] {
  const bySymbol = new Map(
    (raw.spark?.result ?? []).map((entry) => [entry.symbol, entry.response?.[0]])
  );

  const items: WatchlistItem[] = [];

  for (const symbol of symbols) {
    const entry = bySymbol.get(symbol);
    const price = entry?.meta?.regularMarketPrice;
    const percentChange = entry?.meta?.regularMarketChangePercent;

    if (price === undefined || percentChange === undefined) {
      continue;
    }

    const sparkline = (entry?.indicators?.quote?.[0]?.close ?? []).filter(
      (value): value is number => value !== null
    );

    items.push({ symbol, price, percentChange, sparkline });
  }

  return items;
}
