"use client";

import { useState } from "react";
import { Lineup, POSITIONS, Position } from "@/lib/types";

export function SwapSheet({
  teamName,
  lineup,
  onSwap,
  onClose,
}: {
  teamName: string;
  lineup: Lineup;
  onSwap: (posA: Position, posB: Position) => void;
  onClose: () => void;
}) {
  const [first, setFirst] = useState<Position | null>(null);
  const handlePick = (p: Position) => {
    if (!first) { setFirst(p); return; }
    if (first === p) { setFirst(null); return; }
    onSwap(first, p);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md mx-auto bg-navy border-t-2 border-gold/40 rounded-t-2xl p-5"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-[10px] uppercase tracking-widest text-cream/50">Swap two players</div>
          <div className="font-display text-2xl text-gold tracking-widest mt-1">{teamName.toUpperCase()}</div>
          <div className="text-[11px] text-cream/40 mt-1">
            {first ? `Now tap the position to swap with ${first}` : "Tap the first position to move"}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {POSITIONS.map((p) => {
            const isFirst = p === first;
            const name = lineup[p];
            return (
              <button key={p} onClick={() => handlePick(p)}
                className={`rounded-md border-2 py-3 px-1 flex flex-col items-center transition-all ${
                  isFirst
                    ? "bg-gold text-navy-dark border-gold scale-105"
                    : "bg-navy border-gold/40 text-gold"
                }`}>
                <span className="font-display text-lg leading-none tracking-wider">{p}</span>
                {name && <span className="text-[8px] uppercase tracking-wider mt-0.5 truncate max-w-full opacity-80">{name}</span>}
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="w-full mt-4 py-2 text-cream/50 text-xs uppercase tracking-widest">Cancel</button>
      </div>
    </div>
  );
}
