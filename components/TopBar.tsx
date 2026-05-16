"use client";

import { useEffect, useRef, useState } from "react";
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

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [menuOpen]);

  const item = (label: string, icon: string, onClick: () => void, highlight = false) => (
    <button
      onClick={() => { setMenuOpen(false); onClick(); }}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-navy-dark ${
        highlight ? "text-emerald-300" : "text-cream/80"
      }`}
    >
      <span className="w-6 text-center text-lg leading-none">{icon}</span>
      <span className="font-display tracking-widest text-sm">{label.toUpperCase()}</span>
    </button>
  );

  return (
    <header className="bg-navy border-b border-gold/30 relative">
      <div className="flex items-center justify-between gap-3 h-14 px-3">
        <div className="flex items-center gap-4 flex-1 justify-center">
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
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          className={`flex-none w-10 h-10 rounded border flex flex-col items-center justify-center gap-[3px] ${
            menuOpen
              ? "bg-gold border-gold text-navy-dark"
              : "bg-navy border-gold/40 text-gold active:bg-gold/10"
          }`}
        >
          <span className="block w-5 h-0.5 bg-current rounded" />
          <span className="block w-5 h-0.5 bg-current rounded" />
          <span className="block w-5 h-0.5 bg-current rounded" />
        </button>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div ref={menuRef}
            className="absolute right-2 top-full mt-1 z-40 w-56 bg-navy border border-gold/40 rounded-lg shadow-2xl shadow-black/60 overflow-hidden">
            <div className="divide-y divide-white/5">
              {item("Setup", "⚙", onSetup)}
              {item("Fix a mistake", "↶", onFix)}
              {item(isQ4 ? "Finish Match" : "Next Quarter", isQ4 ? "✓" : "→", onNext, true)}
              {item("Stats", "▤", onStats)}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
