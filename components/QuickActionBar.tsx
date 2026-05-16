"use client";

import { Position, SHOOTERS, Side } from "@/lib/types";

export type QuickAction = "goal" | "miss" | "turnover" | "penalty" | "intercept_pick" | "deflection_pick";

export function QuickActionBar({
  side,
  position,
  playerName,
  teamName,
  centrePassHint,
  pickMode,
  onAction,
  onCancelPick,
}: {
  side?: Side;
  position?: Position;
  playerName?: string;
  teamName?: string;
  centrePassHint?: string;
  pickMode?: "intercept" | "deflection" | null;
  onAction: (kind: QuickAction) => void;
  onCancelPick?: () => void;
}) {
  // Pick mode: highest priority — show big banner asking for the player
  if (pickMode) {
    return (
      <div className="px-2.5 pb-1">
        <div className="bg-emerald-500/15 border-2 border-emerald-400/60 rounded-lg p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-emerald-200 font-bold">
              {pickMode === "intercept" ? "✋ Intercept" : "↗ Deflection"} — pick the player
            </div>
            <div className="text-xs text-cream/70 mt-0.5">
              Tap whichever player made the {pickMode}
            </div>
          </div>
          {onCancelPick && (
            <button onClick={onCancelPick}
              className="px-3 py-2 rounded-md bg-navy border border-white/20 text-cream/70 text-[10px] uppercase tracking-widest font-bold">
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // No one has the ball
  if (!side || !position) {
    return (
      <div className="px-2.5 pb-1 space-y-1.5">
        {centrePassHint ? (
          <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg px-3 py-2 text-center">
            <span className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
              ✦ {centrePassHint}
            </span>
          </div>
        ) : (
          <div className="bg-navy/40 border border-white/5 rounded-lg px-3 py-2 text-center">
            <span className="text-[10px] uppercase tracking-widest text-cream/40">
              Tap a player to log possession
            </span>
          </div>
        )}
        <DefensiveActions onAction={onAction} />
      </div>
    );
  }

  const isLhc = side === "lhc";
  const isShooter = SHOOTERS.includes(position);
  const accent = isLhc ? "text-gold" : "text-red-300";

  return (
    <div className="px-2.5 pb-1 space-y-1.5">
      <div className={`rounded-lg border p-2 ${isLhc ? "bg-gold/5 border-gold/30" : "bg-red-500/5 border-red-400/30"}`}>
        <div className="flex items-baseline justify-between mb-1.5 px-1">
          <div className="text-[9px] uppercase tracking-widest text-cream/50 truncate">
            {teamName} · <span className={`font-bold ${accent}`}>{position}</span>
            {playerName && <span className="text-cream/70"> · {playerName}</span>}
          </div>
          <div className="text-[8px] uppercase tracking-widest text-cream/30">
            Has the ball
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
      </div>
      <DefensiveActions onAction={onAction} />
    </div>
  );
}

function DefensiveActions({ onAction }: { onAction: (k: QuickAction) => void }) {
  return (
    <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-2">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="text-[9px] uppercase tracking-widest text-cream/50">
          Defensive action
        </div>
        <div className="text-[8px] uppercase tracking-widest text-cream/30">
          Tap, then pick player
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Btn label="INTERCEPT"  tone="emerald" onClick={() => onAction("intercept_pick")} />
        <Btn label="DEFLECTION" tone="teal"    onClick={() => onAction("deflection_pick")} />
      </div>
    </div>
  );
}

function Btn({ label, tone, onClick }: { label: string; tone: "emerald" | "rose" | "amber" | "teal"; onClick: () => void }) {
  const toneClass =
    tone === "emerald" ? "bg-emerald-500 text-emerald-950 border-emerald-300 active:bg-emerald-400" :
    tone === "rose"    ? "bg-rose-500 text-white border-rose-300 active:bg-rose-400" :
    tone === "teal"    ? "bg-teal-500 text-teal-950 border-teal-300 active:bg-teal-400" :
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
