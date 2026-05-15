"use client";

import { GameEvent, MatchState } from "@/lib/types";

const VISIBLE = new Set<GameEvent["type"]>([
  "possession", "pass", "shot", "intercept", "deflection",
  "turnover_lost", "penalty", "centre_pass", "lineup",
]);

export function FixSheet({
  match,
  onRemove,
  onClose,
}: {
  match: MatchState;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const visible = match.events.filter((e) => VISIBLE.has(e.type)).slice(-12).reverse();
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md mx-auto bg-navy border-t-2 border-gold/40 rounded-t-2xl p-5 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-[10px] uppercase tracking-widest text-cream/50">Fix a mistake</div>
          <div className="font-display text-2xl text-gold tracking-widest mt-1">RECENT EVENTS</div>
          <div className="text-[11px] text-cream/40 mt-1">Tap any event to remove it</div>
        </div>
        {visible.length === 0 ? (
          <div className="text-center text-cream/40 py-8 text-sm">No events yet.</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {visible.map((e) => (
              <button key={e.id} onClick={() => onRemove(e.id)}
                className="w-full bg-navy-dark/60 border border-white/10 rounded-lg p-3 flex items-center gap-3 text-left">
                <span className="text-xl w-7 text-center flex-none">{eventIcon(e)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-cream/40">Q{(e as any).q}</div>
                  <div className="text-xs text-cream/80 truncate">{describe(e)}</div>
                </div>
                <span className="text-red-400/80 text-xs uppercase tracking-widest font-bold">✗ Remove</span>
              </button>
            ))}
          </div>
        )}
        <button onClick={onClose} className="w-full mt-3 py-2 text-cream/50 text-xs uppercase tracking-widest">Close</button>
      </div>
    </div>
  );
}

function eventIcon(e: GameEvent): string {
  switch (e.type) {
    case "possession": return "●";
    case "pass": return "→";
    case "shot": return e.made ? "✓" : "✗";
    case "intercept": return "✋";
    case "deflection": return "↗";
    case "turnover_lost": return "⇄";
    case "penalty": return "🟨";
    case "centre_pass": return "✦";
    case "lineup": return "⚙";
    default: return "·";
  }
}
function describe(e: GameEvent): string {
  const side = "side" in e ? (e.side === "lhc" ? "LHC" : "Opp") : "";
  switch (e.type) {
    case "possession": return `${side} possession to ${e.position}`;
    case "pass": return `${side} pass ${e.from} → ${e.to}`;
    case "shot": return `${side} ${e.made ? "goal" : "miss"} by ${e.position}`;
    case "intercept": return `${side} intercept by ${e.position}`;
    case "deflection": return `${side} deflection by ${e.position}`;
    case "turnover_lost": return `${side} turnover by ${e.position}`;
    case "penalty": return `${side} penalty by ${e.position}`;
    case "centre_pass": return `${side} centre pass`;
    case "lineup": return "Lineup change";
    default: return e.type;
  }
}
