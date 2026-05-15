"use client";

import { Quarter } from "@/lib/types";
import { fmtRemaining } from "@/lib/stats";
import { QUARTER_LENGTH_MS } from "@/lib/types";

export function TopBar({
  quarter,
  elapsedMs,
  running,
  onStartPause,
  onSetup,
  onFix,
  onNext,
  onStats,
}: {
  quarter: Quarter;
  elapsedMs: number;
  running: boolean;
  onStartPause: () => void;
  onSetup: () => void;
  onFix: () => void;
  onNext: () => void;
  onStats: () => void;
}) {
  const remaining = Math.max(0, QUARTER_LENGTH_MS - elapsedMs);
  const lowTime = remaining > 0 && remaining < 60_000;
  const atEnd = remaining === 0;
  const isQ4 = quarter >= 4;

  return (
    <header className="bg-navy border-b border-gold/30">
      <div className="flex items-center justify-center gap-4 h-14 px-3">
        <div className="text-center">
          <div className="font-display text-2xl text-gold leading-none">Q{quarter}</div>
          <div className="text-[9px] uppercase tracking-widest text-cream/50">Quarter</div>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold tabular-nums leading-none ${atEnd ? "text-red-400" : lowTime ? "text-amber-300" : "text-cream"}`}>
            {fmtRemaining(elapsedMs, QUARTER_LENGTH_MS)}
          </div>
          <div className="text-[9px] uppercase tracking-widest text-cream/50">Remaining</div>
        </div>
        <button
          onClick={onStartPause}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border ${
            running ? "bg-red-500/20 border-red-400/40 text-red-300" : "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
          }`}
        >
          {running ? "Pause" : "Start"}
        </button>
      </div>
      <div className="grid grid-cols-4 gap-px bg-gold/10 text-[10px] uppercase tracking-widest">
        <BarBtn label="Setup" icon="⚙" onClick={onSetup} />
        <BarBtn label="Fix" icon="↶" onClick={onFix} />
        <BarBtn label={isQ4 ? "Finish" : "Next Q"} icon={isQ4 ? "✓" : "→"} onClick={onNext} highlight={isQ4} />
        <BarBtn label="Stats" icon="▤" onClick={onStats} />
      </div>
    </header>
  );
}

function BarBtn({ label, icon, onClick, highlight }: { label: string; icon: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`py-2 flex flex-col items-center gap-0.5 ${
        highlight ? "bg-emerald-500/20 text-emerald-300" : "bg-navy text-cream/60"
      } active:bg-navy-dark`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
