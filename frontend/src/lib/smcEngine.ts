export type OHLCVBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type SwingPoint = {
  index: number;
  price: number;
  type: "high" | "low";
  date: string;
};

export type StructureBreak = {
  index: number;
  price: number;
  swingIndex: number;
  direction: "bullish" | "bearish";
  type: "BOS" | "CHoCH";
  date: string;
};

export type OrderBlock = {
  startIndex: number;
  endIndex?: number;
  high: number;
  low: number;
  type: "bullish" | "bearish";
  broken: boolean;
  date: string;
};

export type FairValueGap = {
  index: number;
  high: number; // Low of candle 3 / High of candle 1
  low: number;
  type: "bullish" | "bearish";
  date: string;
};

export type SMCResult = {
  ema20: (number | null)[];
  swings: SwingPoint[];
  breaks: StructureBreak[];
  orderBlocks: OrderBlock[];
  fvgs: FairValueGap[];
  insights: {
    type: "info" | "bullish" | "bearish" | "neutral";
    category: string;
    text: string;
  }[];
};

/**
 * Computes Exponential Moving Average (EMA)
 */
export function computeEMA(bars: OHLCVBar[], period: number): (number | null)[] {
  const ema: (number | null)[] = [];
  if (bars.length < period) {
    return Array(bars.length).fill(null);
  }

  // First value is simple average (SMA)
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += bars[i].close;
  }
  const sma = sum / period;
  
  for (let i = 0; i < period - 1; i++) {
    ema.push(null);
  }
  ema.push(sma);

  const multiplier = 2 / (period + 1);
  for (let i = period; i < bars.length; i++) {
    const prevEma = ema[i - 1]!;
    const currentEma = (bars[i].close - prevEma) * multiplier + prevEma;
    ema.push(currentEma);
  }

  return ema;
}

/**
 * Detects swing high and swing low points using a window lookback (left/right)
 */
export function detectSwingPoints(bars: OHLCVBar[], windowSize = 3): SwingPoint[] {
  const swings: SwingPoint[] = [];

  for (let i = windowSize; i < bars.length - windowSize; i++) {
    const currentBar = bars[i];
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let w = 1; w <= windowSize; w++) {
      if (bars[i - w].high >= currentBar.high || bars[i + w].high > currentBar.high) {
        isSwingHigh = false;
      }
      if (bars[i - w].low <= currentBar.low || bars[i + w].low < currentBar.low) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      swings.push({
        index: i,
        price: currentBar.high,
        type: "high",
        date: currentBar.date,
      });
    }
    if (isSwingLow) {
      swings.push({
        index: i,
        price: currentBar.low,
        type: "low",
        date: currentBar.date,
      });
    }
  }

  return swings;
}

/**
 * Detects Market Structure Breaks (BOS / CHoCH) and Order Blocks
 */
export function detectStructureAndOBs(
  bars: OHLCVBar[],
  swings: SwingPoint[]
): { breaks: StructureBreak[]; orderBlocks: OrderBlock[] } {
  const breaks: StructureBreak[] = [];
  const orderBlocks: OrderBlock[] = [];

  if (bars.length < 5 || swings.length === 0) {
    return { breaks, orderBlocks };
  }

  let currentTrend: "bullish" | "bearish" | null = null;
  let lastSwingHigh: SwingPoint | null = null;
  let lastSwingLow: SwingPoint | null = null;

  // Find initial references
  for (const swing of swings) {
    if (swing.type === "high") {
      if (!lastSwingHigh || swing.price > lastSwingHigh.price) {
        lastSwingHigh = swing;
      }
    } else {
      if (!lastSwingLow || swing.price < lastSwingLow.price) {
        lastSwingLow = swing;
      }
    }
  }

  // Iterate bars to find structures and breaks chronologically
  for (let i = 1; i < bars.length; i++) {
    const bar = bars[i];

    // Find the latest swings available before index i
    const activeSwings = swings.filter((s) => s.index < i);
    const prevHighs = activeSwings.filter((s) => s.type === "high");
    const prevLows = activeSwings.filter((s) => s.type === "low");

    const recentHigh = prevHighs[prevHighs.length - 1] || lastSwingHigh;
    const recentLow = prevLows[prevLows.length - 1] || lastSwingLow;

    if (recentHigh && bar.close > recentHigh.price) {
      // Bullish break!
      const isTrendChange = currentTrend === "bearish";
      const breakType = isTrendChange ? "CHoCH" : "BOS";
      currentTrend = "bullish";

      // Prevent duplicate breaks for same swing point
      const alreadyBroken = breaks.some((b) => b.swingIndex === recentHigh.index);
      if (!alreadyBroken) {
        breaks.push({
          index: i,
          price: recentHigh.price,
          swingIndex: recentHigh.index,
          direction: "bullish",
          type: breakType,
          date: bar.date,
        });

        // Add Bullish Order Block (last down-close candle before the break)
        let obIndex = recentHigh.index;
        for (let j = recentHigh.index; j >= Math.max(0, recentHigh.index - 5); j--) {
          if (bars[j].close < bars[j].open) {
            obIndex = j;
            break;
          }
        }
        orderBlocks.push({
          startIndex: obIndex,
          high: bars[obIndex].high,
          low: bars[obIndex].low,
          type: "bullish",
          broken: false,
          date: bars[obIndex].date,
        });
      }
    } else if (recentLow && bar.close < recentLow.price) {
      // Bearish break!
      const isTrendChange = currentTrend === "bullish";
      const breakType = isTrendChange ? "CHoCH" : "BOS";
      currentTrend = "bearish";

      const alreadyBroken = breaks.some((b) => b.swingIndex === recentLow.index);
      if (!alreadyBroken) {
        breaks.push({
          index: i,
          price: recentLow.price,
          swingIndex: recentLow.index,
          direction: "bearish",
          type: breakType,
          date: bar.date,
        });

        // Add Bearish Order Block (last up-close candle before the break)
        let obIndex = recentLow.index;
        for (let j = recentLow.index; j >= Math.max(0, recentLow.index - 5); j--) {
          if (bars[j].close > bars[j].open) {
            obIndex = j;
            break;
          }
        }
        orderBlocks.push({
          startIndex: obIndex,
          high: bars[obIndex].high,
          low: bars[obIndex].low,
          type: "bearish",
          broken: false,
          date: bars[obIndex].date,
        });
      }
    }

    // Check if any Order Block is broken/invalidated by subsequent price action
    for (const ob of orderBlocks) {
      if (!ob.broken && ob.startIndex < i) {
        if (ob.type === "bullish" && bar.close < ob.low) {
          ob.broken = true;
          ob.endIndex = i;
        } else if (ob.type === "bearish" && bar.close > ob.high) {
          ob.broken = true;
          ob.endIndex = i;
        }
      }
    }
  }

  return { breaks, orderBlocks };
}

/**
 * Detects Fair Value Gaps (FVG)
 */
export function detectFVGs(bars: OHLCVBar[]): FairValueGap[] {
  const fvgs: FairValueGap[] = [];

  for (let i = 2; i < bars.length; i++) {
    const bar1 = bars[i - 2];
    const bar2 = bars[i - 1];
    const bar3 = bars[i];

    // Bullish FVG: Bar 1 High < Bar 3 Low
    if (bar3.low > bar1.high) {
      // Check if it's a significant displacement gap
      const averageBodySize = (Math.abs(bar1.close - bar1.open) + Math.abs(bar3.close - bar3.open)) / 2;
      const middleBodySize = Math.abs(bar2.close - bar2.open);
      
      if (middleBodySize > averageBodySize * 0.5) {
        fvgs.push({
          index: i - 1,
          high: bar3.low,
          low: bar1.high,
          type: "bullish",
          date: bar2.date,
        });
      }
    }
    // Bearish FVG: Bar 1 Low > Bar 3 High
    else if (bar3.high < bar1.low) {
      const averageBodySize = (Math.abs(bar1.close - bar1.open) + Math.abs(bar3.close - bar3.open)) / 2;
      const middleBodySize = Math.abs(bar2.close - bar2.open);

      if (middleBodySize > averageBodySize * 0.5) {
        fvgs.push({
          index: i - 1,
          high: bar1.low,
          low: bar3.high,
          type: "bearish",
          date: bar2.date,
        });
      }
    }
  }

  return fvgs;
}

/**
 * Computes all SMC structures and returns output + human readable insights
 */
export function computeSMC(bars: OHLCVBar[]): SMCResult {
  const ema20 = computeEMA(bars, 20);
  const swings = detectSwingPoints(bars, 3);
  const { breaks, orderBlocks } = detectStructureAndOBs(bars, swings);
  const fvgs = detectFVGs(bars);

  // Generate dynamic text insights
  const insights: SMCResult["insights"] = [];

  if (bars.length === 0) return { ema20, swings, breaks, orderBlocks, fvgs, insights };

  const lastBar = bars[bars.length - 1];
  const lastEma = ema20[ema20.length - 1];

  // 1. EMA Analysis
  if (lastEma !== null) {
    const diffPercent = ((lastBar.close - lastEma) / lastEma) * 100;
    if (diffPercent > 0.5) {
      let duration = 0;
      for (let j = ema20.length - 1; j >= 0; j--) {
        const val = ema20[j];
        if (val !== null && bars[j].close > val) {
          duration++;
        } else {
          break;
        }
      }
      insights.push({
        type: "bullish",
        category: "EMA 20 Trend",
        text: `Price is trading ${(diffPercent).toFixed(1)}% above the 20-period EMA, sustaining a bullish regime for the last ${duration} trading sessions.`,
      });
    } else if (diffPercent < -0.5) {
      let duration = 0;
      for (let j = ema20.length - 1; j >= 0; j--) {
        const val = ema20[j];
        if (val !== null && bars[j].close < val) {
          duration++;
        } else {
          break;
        }
      }
      insights.push({
        type: "bearish",
        category: "EMA 20 Trend",
        text: `Price is trading ${Math.abs(diffPercent).toFixed(1)}% below the 20-period EMA, sustaining a bearish regime for the last ${duration} trading sessions.`,
      });
    } else {
      insights.push({
        type: "neutral",
        category: "EMA 20 Crossover",
        text: `Price is consolidating tight around the 20-period EMA, indicating a short-term trend neutral inflection point.`,
      });
    }
  }

  // 2. BOS / CHoCH Breaks
  const recentBreaks = breaks.slice(-3).reverse();
  for (const b of recentBreaks) {
    const actionWord = b.type === "CHoCH" ? "Change of Character (CHoCH)" : "Break of Structure (BOS)";
    const sentiment = b.direction === "bullish" ? "bullish" as const : "bearish" as const;
    const desc = b.direction === "bullish"
      ? `Bullish ${actionWord} confirmed when close crossed above key swing high resistance of ₹${b.price.toLocaleString("en-IN")}.`
      : `Bearish ${actionWord} confirmed when close crossed below key swing low support of ₹${b.price.toLocaleString("en-IN")}.`;

    insights.push({
      type: sentiment,
      category: b.type,
      text: `${desc} (Observed on ${new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`,
    });
  }

  // 3. Active Order Blocks
  const activeOBs = orderBlocks.filter((ob) => !ob.broken);
  const bullishOB = activeOBs.filter((ob) => ob.type === "bullish").pop();
  const bearishOB = activeOBs.filter((ob) => ob.type === "bearish").pop();

  if (bullishOB) {
    insights.push({
      type: "bullish",
      category: "Order Block",
      text: `Bullish Order Block detected at range ₹${bullishOB.low.toFixed(1)} - ₹${bullishOB.high.toFixed(1)}. This represents an institutional demand zone for limit buy orders.`,
    });
  }
  if (bearishOB) {
    insights.push({
      type: "bearish",
      category: "Order Block",
      text: `Bearish Order Block detected at range ₹${bearishOB.low.toFixed(1)} - ₹${bearishOB.high.toFixed(1)}. This acts as institutional supply resistance.`,
    });
  }

  // 4. Fair Value Gaps
  const activeFVGs = fvgs.slice(-2).reverse();
  for (const fvg of activeFVGs) {
    const sentiment = fvg.type === "bullish" ? "bullish" as const : "bearish" as const;
    const desc = fvg.type === "bullish"
      ? `Bullish FVG gap identified between ₹${fvg.low.toFixed(1)} and ₹${fvg.high.toFixed(1)}. Price may retrace here to fill this liquidity imbalance.`
      : `Bearish FVG gap identified between ₹${fvg.low.toFixed(1)} and ₹${fvg.high.toFixed(1)}. This is a bearish imbalance resistance zone.`;

    insights.push({
      type: sentiment,
      category: "Fair Value Gap",
      text: desc,
    });
  }

  // Fallback insight if empty
  if (insights.length === 0) {
    insights.push({
      type: "neutral",
      category: "Market Structure",
      text: "The price action is currently ranges within swing bounds. No immediate structure breaks or imbalances detected.",
    });
  }

  return {
    ema20,
    swings,
    breaks,
    orderBlocks,
    fvgs,
    insights,
  };
}
