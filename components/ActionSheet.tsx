"use client";

import { Position, SHOOTERS, Side } from "@/lib/types";
import { PlayerLine, fmtMs } from "@/lib/stats";

export type ActionKind = "goal" | "miss" | "intercept" | "deflection" | "turnover" | "penalty";

export function ActionSheet({
  side,
  position,
  playerName,
  teamName,
  isTracked,
  hasPossession,
  justStoleFromOpposition,
  playerStats,
  onPick,
  onClose,
}: {
  side: Side;
  position: Position;
  playerName?: string;
  teamName: string;
  isTracked: boolean;
  hasPossession: boolean;
  justStoleFromOpposition?: boolean;
  playerStats?: PlayerLine;
  onPick: (k: ActionKind) => void;
  onClose: () => void;
}) {
  const isShooter = SHOOTERS.includes(position);
  // Determine action order based on context.
  let order: ActionKind[];
  if (hasPossession && justStoleFromOpposition) {
    // They just took the ball from the opposition — offer INT/DEF first
    // then attacker options below.
    order = ["intercept", "deflection"];
    if (isShooter) order.push("goal", "miss");
    order.push("turnover", "penalty");
  } else if (hasPossession) {
    order = isShooter
      ? ["goal", "miss", "turnover", "penalty"]
      : ["turnover", "penalty", "intercept", "deflection"];
  } else {
    order = ["intercept", "deflection"];
    if (isShooter) order.unshift("goal", "miss");
    order.push("turnover", "penalty");
  }

  const s = playerStats;
  const hasAnyStats = !!s && (s.possessionMs > 0 || s.shotsMade + s.shotsMissed > 0 || s.intercepts > 0 || s.deflections > 0 || s.turnoversLost > 0 || s.penalties > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md mx-auto bg-navy border-t-2 border-gold/40 rounded-t-2xl p-5"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-3">
          <div className={`font-display text-3xl tracking-widest ${isTracked ? "text-gold" : "text-red-300"}`}>
            {teamName.toUpperCase()} · {position}
          </div>
          {playerName && <div className="text-base font-bold mt-1">{playerName}</div>}
        </div>

        {s && hasAnyStats && (
          <div className={`rounded-lg p-3 mb-4 border ${isTracked ? "bg-gold/10 border-gold/30" : "bg-red-500/10 border-red-400/30"}`}>
            <div className={`text-[9px] uppercase tracking-widest font-bold mb-2 ${isTracked ? "text-gold/80" : "text-red-300/80"}`}>
              This match so far
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <StatCell label="Poss" value={fmtMs(s.possessionMs)} />
              {(s.shotsMade + s.shotsMissed > 0 || isShooter) && (
                <StatCell label="Shots" value={s.shotsMade + s.shotsMissed > 0 ? `${s.shotsMade}/${s.shotsMade + s.shotsMissed}` : "—"} colour="text-gold" />
              )}
              {s.intercepts > 0 && <StatCell label="INT" value={String(s.intercepts)} colour="text-emerald-300" />}
              {s.deflections > 0 && <StatCell label="DEF" value={String(s.deflections)} colour="text-teal-300" />}
              {s.turnoversLost > 0 && <StatCell label="TO" value={String(s.turnoversLost)} colour="text-amber-300" />}
              {s.penalties > 0 && <StatCell label="PEN" value={String(s.penalties)} colour="text-rose-300" />}
            </div>
          </div>
        )}

        <div className="text-[10px] uppercase tracking-widest text-cream/50 text-center mb-2">
          {justStoleFromOpposition ? "How did they get it?" : hasPossession ? "What did they do with it?" : "Defensive play"}
        </div>
        <div className="space-y-2">
          {order.map((k) => <ActionBtn key={k} kind={k} onClick={() => onPick(k)} />)}
        </div>
        <button onClick={onClose} className="w-full mt-3 py-2 text-cream/50 text-xs uppercase tracking-widest">Cancel</button>
      </div>
    </div>
  );
}

function StatCell({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div>
      <div className="text-[8px] uppercase tracking-widest text-cream/50">{label}</div>
      <div className={`font-mono tabular-nums text-sm font-bold ${colour || "text-cream"}`}>{value}</div>
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
    <button onClick={onClick}
      className={`w-full border rounded-xl px-4 py-3.5 flex items-center gap-3 active:scale-[0.98] ${m.tone}`}>
      <span className="text-2xl flex-none w-8 text-center">{m.icon}</span>
      <div className="min-w-0 text-left">
        <div className="font-display tracking-widest text-lg leading-none">{m.label}</div>
        <div className="text-[11px] opacity-80 mt-0.5">{m.blurb}</div>
      </div>
    </button>
  );
}
