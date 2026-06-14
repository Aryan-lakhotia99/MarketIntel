"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";

type PcrSpeedometerProps = {
  pcr: number;
  putOi: number;
  callOi: number;
  symbol: string;
};

export default function PcrSpeedometer({ pcr, putOi, callOi, symbol }: PcrSpeedometerProps) {
  const [angle, setAngle] = useState(-90);

  // Smooth needle animation on mount or value change
  useEffect(() => {
    // Map PCR range [0.4, 1.6] to [-90deg, 90deg]
    const clamped = Math.max(0.4, Math.min(1.6, pcr));
    const targetAngle = ((clamped - 0.4) / (1.6 - 0.4)) * 180 - 90;
    
    const timer = setTimeout(() => {
      setAngle(targetAngle);
    }, 150);

    return () => clearTimeout(timer);
  }, [pcr]);

  // Sentiment interpretation
  let sentiment = "Neutral Rotation";
  let sentimentClass = "text-slate-400 bg-slate-500/10 border-slate-500/20";
  let alertZone = "";

  if (pcr < 0.5) {
    sentiment = "Extreme Bearish / Oversold";
    sentimentClass = "text-rose-400 bg-rose-500/15 border-rose-400/30 animate-pulse";
    alertZone = "Oversold Bounce Candidate (Short Squeeze Potential)";
  } else if (pcr >= 0.5 && pcr < 0.8) {
    sentiment = "Bearish Sentiment";
    sentimentClass = "text-rose-500 bg-rose-500/10 border-rose-500/20";
  } else if (pcr > 1.2 && pcr <= 1.5) {
    sentiment = "Bullish Sentiment";
    sentimentClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  } else if (pcr > 1.5) {
    sentiment = "Extreme Bullish / Overbought";
    sentimentClass = "text-emerald-400 bg-emerald-500/15 border-emerald-400/30 animate-pulse";
    alertZone = "Overbought Warning (Risk of Bullish Profit Booking)";
  }

  // Format OI numbers
  const formatOi = (val: number) => {
    if (val >= 10000000) return `${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `${(val / 100000).toFixed(2)}L`;
    return val.toLocaleString();
  };

  const putPercentage = (putOi / (putOi + callOi)) * 100;
  const callPercentage = (callOi / (putOi + callOi)) * 100;

  return (
    <GlassCard className="p-6">
      <div className="w-full text-center">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans">
          F&O Put-Call Ratio (PCR) Gauge
        </h3>
        <p className="text-[10px] text-slate-600 font-mono mt-0.5">
          Put OI vs Call OI ratio indicator for {symbol}
        </p>
      </div>

      {/* Speedometer Gauge Visualizer */}
      <div className="relative mt-6 mx-auto flex h-32 w-52 items-center justify-center overflow-hidden">
        <svg className="absolute bottom-0 left-1/2 -translate-x-1/2 h-44 w-44" viewBox="0 0 100 100">
          {/* Background track */}
          <path
            d="M 15,90 A 35,35 0 0,1 85,90"
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Bearish Arc Segment (PCR 0.4 - 0.8) */}
          <path
            d="M 15,90 A 35,35 0 0,1 40,58"
            fill="none"
            stroke="#f43f5e"
            strokeWidth="8"
            className="opacity-70"
          />
          {/* Neutral Arc Segment (PCR 0.8 - 1.2) */}
          <path
            d="M 40,58 A 35,35 0 0,1 60,58"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="8"
            className="opacity-40"
          />
          {/* Bullish Arc Segment (PCR 1.2 - 1.6) */}
          <path
            d="M 60,58 A 35,35 0 0,1 85,90"
            fill="none"
            stroke="#10b981"
            strokeWidth="8"
            className="opacity-70"
          />

          {/* Needle Pin Center */}
          <circle cx="50" cy="90" r="5" fill="#6366f1" />
          <circle cx="50" cy="90" r="2" fill="#ffffff" />

          {/* Speedometer Needle */}
          <g
            style={{
              transform: `rotate(${angle}deg)`,
              transformOrigin: "50px 90px",
              transition: "transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
          >
            <line
              x1="50"
              y1="90"
              x2="50"
              y2="58"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <polygon points="48.5,80 51.5,80 50,55" fill="#6366f1" />
          </g>
        </svg>

        {/* Digital Readout inside speedometer center */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center font-mono">
          <span className="text-2xl font-black tracking-tight text-white">
            {pcr.toFixed(2)}
          </span>
          <p className="text-[8px] tracking-wider text-slate-500 uppercase font-sans font-semibold mt-0.5">
            PCR value
          </p>
        </div>
      </div>

      {/* Extreme Alert Indicator */}
      <div className="w-full text-center mt-3">
        <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", sentimentClass)}>
          {sentiment}
        </span>
        {alertZone && (
          <p className="mt-1.5 text-[9px] font-semibold text-amber-500 animate-pulse font-mono">
            ⚠️ {alertZone}
          </p>
        )}
      </div>

      {/* Put OI vs Call OI progress details */}
      <div className="mt-4 w-full space-y-2.5 border-t border-white/5 pt-4 font-mono text-[10px]">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span>Puts (Bullish Bias)</span>
            <span>Calls (Bearish Bias)</span>
          </div>
          <div className="h-2 w-full flex overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${putPercentage}%` }}
              title={`Puts: ${putPercentage.toFixed(1)}%`}
            />
            <div
              className="h-full bg-rose-500 transition-all duration-700"
              style={{ width: `${callPercentage}%` }}
              title={`Calls: ${callPercentage.toFixed(1)}%`}
            />
          </div>
        </div>

        {/* Legend stats */}
        <div className="grid grid-cols-2 gap-3 text-glow-neutral">
          <div className="rounded-lg bg-white/[0.01] p-2 border border-white/5">
            <span className="text-slate-500">Put Open Interest</span>
            <p className="mt-0.5 font-bold text-emerald-400">{formatOi(putOi)}</p>
          </div>
          <div className="rounded-lg bg-white/[0.01] p-2 border border-white/5 text-right">
            <span className="text-slate-500">Call Open Interest</span>
            <p className="mt-0.5 font-bold text-rose-400">{formatOi(callOi)}</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
