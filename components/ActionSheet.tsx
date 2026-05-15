"use client";

import { Position, SHOOTERS, Side } from "@/lib/types";

export type ActionKind = "goal" | "miss" | "intercept" | "deflection" | "turnover" | "penalty";

export function ActionSheet({
  side,
  position,
  playerName,
  teamName,
  isTracked,
  hasPossession,
  onPick,
  onClose,
}: {
  side: Side;
  position: Position;
  playerName?: string;
  teamName: string;
  isTracked: boolean;
  hasPossession: boolean;
  onPick: (k: ActionKind) => void;
  onClose: () => void;
}) {
  const isShooter = SHOOTERS.includes(position);
  // Always show all five core options. Order varies by context.
  // Defenders (no ball): intercept first, then deflection.
  // Attackers with ball: goal/miss (if shooter), then turnover, then penalty.
  let order: ActionKind[];
  if (hasPossession) {
    order = isShooter
      ? ["goal", "miss", "turnover", "penalty"]
      : ["turnover", "penalty", "intercept", "deflection"];
  } else {
    order = ["intercept", "deflection", "turnover", "penalty"];
    if (isShooter) order.unshift("goal", "miss");
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md mx-auto bg-navy border-t-2 border-gold/40 rounded-t-2xl p-5"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className={`font-display text-2xl tracking-widest ${isTracked ? "text-gold" : "text-red-300"}`}>
            {teamName.toUpperCase()} · {position}
          </div>
          {playerName && <div className="text-base font-bold mt-1">{playerName}</div>}
        </div>
        <div className="space-y-2">
          {order.map((k) => <ActionBtn key={k} kind={k} onClick={() => onPick(k)} />)}
        </div>
        <button onClick={onClose} className="w-full mt-3 py-2 text-cream/50 text-xs uppercase tracking-widest">
          Cancel
        </button>
      </div>
    </div>
  );
}

const META: Record<ActionKind, { label: string; icon: string; blurb: string; tone: string }> = {
  goal:       { label: "GOAL",       icon: "✓",  blurb: "Shot scored",                          tone: "bg-emerald-500 text-emerald-950 border-emerald-300" },
  miss:       { label: "MISS",       icon: "✗",  blurb: "Shot missed",                          tone: "bg-rose-500 text-white border-rose-300" },
  intercept:  { label: "INTERCEPT",  icon: "✋", blurb: "Caught the ball cleanly off opposition",tone: "bg-emerald-500 text-emerald-950 border-emerald-300" },
  deflection: { label: "DEFLECTION", icon: "↗",  blurb: "Tipped or touched the ball",           tone: "bg-teal-500 text-teal-950 border-teal-300" },
  turnover:   { label: "LOST IT",    icon: "✗",  blurb: "Lost possession (bad pass, out, held)",tone: "bg-amber-500 text-amber-950 border-amber-300" },
  penalty:    { label: "PENALTY",    icon: "🟨", blurb: "Whistled against",                      tone: "bg-rose-500 text-white border-rose-300" },
};

function ActionBtn({ kind, onClick }: { kind: ActionKind; onClick: () => void }) {
  const m = META[kind];
  return (
    <button
      onClick={onClick}
      className={`w-full border rounded-xl px-4 py-3.5 flex items-center gap-3 active:scale-[0.98] ${m.tone}`}
    >
      <span className="text-2xl flex-none w-8 text-center">{m.icon}</span>
      <div className="min-w-0 text-left">
        <div className="font-display tracking-widest text-lg leading-none">{m.label}</div>
        <div className="text-[11px] opacity-80 mt-0.5">{m.blurb}</div>
      </div>
    </button>
  );
}
