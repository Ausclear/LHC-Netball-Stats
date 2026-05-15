"use client";

import { Position, SHOOTERS, Side } from "@/lib/types";

export type QuickAction = "goal" | "miss" | "turnover" | "penalty";

/**
 * A persistent context-aware action bar shown below the live court when
 * the match is running. Avoids the need to double-tap into a sheet for
 * the common attacking events:
 *   - When a shooter has the ball: GOAL, MISS, LOST IT, PENALTY
 *   - When a non-shooter has the ball: LOST IT, PENALTY (plus a hint
 *     to double-tap a defender for intercept/deflection)
 *
 * Each button acts on whichever player currently has the ball. If no
 * one has the ball, the bar collapses to a centre-pass hint.
 */
export function QuickActionBar({
  side,
  position,
  playerName,
  teamName,
  centrePassHint,
  onAction,
}: {
  // Side/position of the player currently in possession (or undefined if
  // no one is). When undefined, the bar shows the centre-pass hint or
  // nothing.
  side?: Side;
  position?: Position;
  playerName?: string;
  teamName?: string;
  centrePassHint?: string;
  onAction: (kind: QuickAction) => void;
}) {
  if (!side || !position) {
    if (centrePassHint) {
      return (
        <div className="px-2.5 pb-1">
          <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg px-3 py-2 text-center">
            <span className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
              ✦ {centrePassHint}
            </span>
          </div>
        </div>
      );
    }
    return (
      <div className="px-2.5 pb-1">
        <div className="bg-navy/40 border border-white/5 rounded-lg px-3 py-2 text-center">
          <span className="text-[10px] uppercase tracking-widest text-cream/40">
            Tap a player to log possession
          </span>
        </div>
      </div>
    );
  }

  const isLhc = side === "lhc";
  const isShooter = SHOOTERS.includes(position);

  // Label colour cues: gold for LHC, rose for opposition.
  const accent = isLhc ? "text-gold" : "text-red-300";

  return (
    <div className="px-2.5 pb-1">
      <div className={`rounded-lg border p-2 ${isLhc ? "bg-gold/5 border-gold/30" : "bg-red-500/5 border-red-400/30"}`}>
        <div className="flex items-baseline justify-between mb-1.5 px-1">
          <div className="text-[9px] uppercase tracking-widest text-cream/50 truncate">
            {teamName} · <span className={`font-bold ${accent}`}>{position}</span>
            {playerName && <span className="text-cream/70"> · {playerName}</span>}
          </div>
          <div className="text-[8px] uppercase tracking-widest text-cream/30">
            Quick log
          </div>
        </div>
        {isShooter ? (
          <div className="grid grid-cols-4 gap-1.5">
            <Btn label="GOAL"    tone="emerald" onClick={() => onAction("goal")} />
            <Btn label="MISS"    tone="rose"    onClick={() => onAction("miss")} />
            <Btn label="LOST IT" tone="amber"   onClick={() => onAction("turnover")} />
            <Btn label="PENALTY" tone="rose"    onClick={() => onAction("penalty")} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <Btn label="LOST IT" tone="amber" onClick={() => onAction("turnover")} />
            <Btn label="PENALTY" tone="rose"  onClick={() => onAction("penalty")} />
          </div>
        )}
        {!isShooter && (
          <div className="text-[9px] text-cream/40 text-center mt-1.5">
            For intercept / deflection · double-tap the defender
          </div>
        )}
      </div>
    </div>
  );
}

function Btn({ label, tone, onClick }: { label: string; tone: "emerald" | "rose" | "amber"; onClick: () => void }) {
  const toneClass =
    tone === "emerald" ? "bg-emerald-500 text-emerald-950 border-emerald-300 active:bg-emerald-400" :
    tone === "rose"    ? "bg-rose-500 text-white border-rose-300 active:bg-rose-400" :
                         "bg-amber-500 text-amber-950 border-amber-300 active:bg-amber-400";
  return (
    <button
      onClick={onClick}
      onTouchEnd={(e) => { e.preventDefault(); onClick(); navigator.vibrate?.(12); }}
      style={{ touchAction: "manipulation" }}
      className={`
        ${toneClass}
        rounded-md border-2 px-2 py-2.5
        font-display tracking-widest text-sm
        active:scale-95 transition-transform
      `}
    >
      {label}
    </button>
  );
}
