"use client";

import { useState } from "react";
import { Lineup, POSITIONS, Position, Quarter } from "@/lib/types";

export function QuarterLineupSheet({
  nextQuarter,
  teamName,
  currentLineup,
  squadNames,
  onConfirm,
  onSkip,
  onCancel,
}: {
  nextQuarter: Quarter;
  teamName: string;
  currentLineup: Lineup;
  squadNames: string[];
  onConfirm: (newLineup: Lineup) => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Lineup>({ ...currentLineup });
  const dirty = POSITIONS.some((p) => draft[p] !== currentLineup[p]);

  const positionLabel = (p: Position) =>
    ({ GS: "Goal Shooter", GA: "Goal Attack", WA: "Wing Attack", C: "Centre", WD: "Wing Defence", GD: "Goal Defence", GK: "Goal Keeper" }[p]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onCancel}>
      <div className="w-full max-w-md mx-auto bg-navy border-t-2 border-gold/40 rounded-t-2xl p-5 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-[10px] uppercase tracking-widest text-cream/50">Starting Quarter {nextQuarter}</div>
          <div className="font-display text-2xl text-gold tracking-widest mt-1">LINEUP — {teamName.toUpperCase()}</div>
          <div className="text-[11px] text-cream/40 mt-1">Adjust rotations, or keep the same lineup.</div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 -mx-1 px-1">
          {POSITIONS.map((p) => {
            const value = draft[p] || "";
            const changed = value !== currentLineup[p];
            return (
              <div key={p} className="flex items-center gap-2">
                <div className="w-12 flex-none font-display tracking-wider text-center py-2 rounded bg-gold/20 text-gold">{p}</div>
                <select value={value}
                  onChange={(e) => {
                    const picked = e.target.value;
                    const next = { ...draft, [p]: picked };
                    if (picked) {
                      for (const otherP of POSITIONS) {
                        if (otherP !== p && next[otherP] === picked) next[otherP] = "";
                      }
                    }
                    setDraft(next);
                  }}
                  className={`flex-1 bg-navy border rounded-md px-3 py-2 text-cream text-sm appearance-none ${
                    changed ? "border-emerald-400/60 ring-1 ring-emerald-400/30" : "border-white/10"
                  }`}>
                  <option value="">{positionLabel(p)}</option>
                  {value && !squadNames.includes(value) && <option value={value}>{value}</option>}
                  {squadNames.map((name) => {
                    const here = (Object.keys(draft) as Position[]).find((k) => draft[k] === name);
                    const label = !here ? `${name}  ·  available`
                      : here === p ? name
                      : `${name}  ·  ${here}`;
                    return <option key={name} value={name}>{label}</option>;
                  })}
                </select>
                {changed && <span className="text-[9px] uppercase tracking-widest text-emerald-300 font-bold">NEW</span>}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10">
          <button onClick={onSkip}
            className="py-3 rounded-lg border border-white/15 text-cream/70 font-bold uppercase tracking-widest text-xs">
            Keep Same
          </button>
          <button onClick={() => onConfirm(draft)} disabled={!dirty}
            className={`py-3 rounded-lg font-bold uppercase tracking-widest text-xs ${
              dirty ? "bg-gold text-navy-dark" : "bg-navy border border-white/10 text-cream/30"
            }`}>
            {dirty ? `Apply for Q${nextQuarter}` : "No Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
