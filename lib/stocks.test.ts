import { describe, expect, test } from "vitest";

import { buildWatchlist } from "@/lib/stocks";
import type { YahooSparkRaw } from "@/lib/stocks";

describe("buildWatchlist", () => {
  test("symbols 순서대로 가격·등락률·스파크라인을 함께 만든다", () => {
    const raw: YahooSparkRaw = {
      spark: {
        result: [
          {
            symbol: "MSFT",
            response: [
              {
                meta: { regularMarketPrice: 490.3, regularMarketChangePercent: -1.37 },
                indicators: { quote: [{ close: [493, 491, 490.3] }] },
              },
            ],
          },
          {
            symbol: "AAPL",
            response: [
              {
                meta: { regularMarketPrice: 332.41, regularMarketChangePercent: 0.32 },
                indicators: { quote: [{ close: [330, 331, 332.41] }] },
              },
            ],
          },
        ],
      },
    };

    const result = buildWatchlist(["MSFT", "AAPL"], raw);

    expect(result).toEqual([
      {
        symbol: "MSFT",
        price: 490.3,
        percentChange: -1.37,
        sparkline: [493, 491, 490.3],
      },
      {
        symbol: "AAPL",
        price: 332.41,
        percentChange: 0.32,
        sparkline: [330, 331, 332.41],
      },
    ]);
  });

  test("장 시작 전 등 close 배열에 null이 섞여 있으면 걸러낸다", () => {
    const raw: YahooSparkRaw = {
      spark: {
        result: [
          {
            symbol: "AAPL",
            response: [
              {
                meta: { regularMarketPrice: 332.41, regularMarketChangePercent: 0.32 },
                indicators: { quote: [{ close: [null, null, 330, 332.41] }] },
              },
            ],
          },
        ],
      },
    };

    const result = buildWatchlist(["AAPL"], raw);

    expect(result[0].sparkline).toEqual([330, 332.41]);
  });

  test("응답이 없는 심볼은 건너뛴다", () => {
    const raw: YahooSparkRaw = {
      spark: {
        result: [
          {
            symbol: "AAPL",
            response: [
              {
                meta: { regularMarketPrice: 332.41, regularMarketChangePercent: 0.32 },
                indicators: { quote: [{ close: [332.41] }] },
              },
            ],
          },
          // MSFT: 없음
        ],
      },
    };

    const result = buildWatchlist(["AAPL", "MSFT"], raw);

    expect(result).toEqual([
      { symbol: "AAPL", price: 332.41, percentChange: 0.32, sparkline: [332.41] },
    ]);
  });
});
