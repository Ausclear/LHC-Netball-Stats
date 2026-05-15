"use client";

import { SideStats } from "@/lib/stats";

export function Scoreboard({
  lhcName,
  oppName,
  lhc,
  opp,
}: {
  lhcName: string;
  oppName: string;
  lhc: SideStats;
  opp: SideStats;
}) {
  const total = lhc.possessionMs + opp.possessionMs || 1;
  const lhcPct = (lhc.possessionMs / total) * 100;
  return (
    <div className="bg-navy/60 border-b border-white/5">
      <div className="flex items-center justify-center gap-3 py-2 px-3">
        <div className="flex-1 flex items-baseline justify-end gap-2 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-cream/60 truncate">{lhcName}</div>
          <div className="font-display text-4xl text-gold tabular-nums leading-none">{lhc.goals}</div>
        </div>
        <div className="text-cream/30 text-2xl leading-none">—</div>
        <div className="flex-1 flex items-baseline justify-start gap-2 min-w-0">
          <div className="font-display text-4xl text-red-300 tabular-nums leading-none">{opp.goals}</div>
          <div className="text-[10px] uppercase tracking-widest text-cream/60 truncate">{oppName}</div>
        </div>
      </div>
      <div className="px-3 pb-2">
        <div className="h-1.5 rounded-full bg-navy-dark overflow-hidden flex">
          <div style={{ width: `${lhcPct}%` }} className="bg-gold" />
          <div style={{ width: `${100 - lhcPct}%` }} className="bg-red-500/80" />
        </div>
        <div className="flex justify-between text-[9px] mt-1 font-mono tabular-nums text-cream/50">
          <span>{Math.round(lhcPct)}% possession</span>
          <span>{Math.round(100 - lhcPct)}%</span>
        </div>
      </div>
    </div>
  );
}
