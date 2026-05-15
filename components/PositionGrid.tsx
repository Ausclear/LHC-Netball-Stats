"use client";

import { useRef } from "react";
import { POSITIONS, Position, SHOOTERS, Side } from "@/lib/types";
import { SideStats, fmtMs } from "@/lib/stats";

const DOUBLE_TAP_MS = 320;
const GHOST_MS = 80;

export function PositionGrid({
  side,
  teamName,
  stats,
  lineup,
  currentPossession,
  isTracked,
  isLive,
  pendingCentrePass,
  cpTaker,
  captainName,
  onTap,
  onDoubleTap,
  onHeaderTap,
}: {
  side: Side;
  teamName: string;
  stats: SideStats;
  lineup?: Record<Position, string>;
  currentPossession?: { side: Side; position: Position };
  isTracked: boolean;
  isLive: boolean;
  pendingCentrePass: boolean;
  cpTaker?: { side: Side; position: Position; at: number };
  captainName?: string;
  onTap: (side: Side, p: Position) => void;
  onDoubleTap: (side: Side, p: Position) => void;
  onHeaderTap?: () => void;
}) {
  // Reverse opposition row so matchups align in columns
  const order = isTracked ? POSITIONS : [...POSITIONS].reverse();
  return (
    <section className={`rounded-lg border p-2 ${isTracked ? "border-gold/30 bg-gold/5" : "border-red-400/30 bg-red-500/5"}`}>
      <button
        className="w-full flex items-center justify-between px-1 pb-1.5 active:opacity-70"
        onClick={onHeaderTap}
      >
        <div className="flex items-baseline gap-2 min-w-0">
          <div className={`font-display tracking-widest text-lg leading-none truncate ${isTracked ? "text-gold" : "text-red-300"}`}>
            {teamName.toUpperCase()}
          </div>
          {isTracked && <div className="text-[8px] uppercase tracking-widest text-gold/60 font-bold">★ YOURS</div>}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <div className="text-[9px] uppercase tracking-widest text-cream/40 font-mono tabular-nums whitespace-nowrap">
            {fmtMs(stats.possessionMs)} · {stats.goals}G
          </div>
          {onHeaderTap && (
            <span className="text-[9px] uppercase tracking-widest text-cream/40 px-1.5 py-0.5 rounded border border-white/10">
              ⇄ Swap
            </span>
          )}
        </div>
      </button>
      <div className="grid grid-cols-7 gap-1.5 pt-1 px-0.5">
        {order.map((p) => {
          const isActive = currentPossession?.side === side && currentPossession?.position === p;
          const name = lineup?.[p];
          const isShooter = SHOOTERS.includes(p);
          const ms = stats.byPosition[p].possessionMs;
          const shotsMade = stats.byPosition[p].shotsMade;
          const intercepts = stats.byPosition[p].intercepts;
          const isCaptain = !!captainName && !!name && captainName.toLowerCase() === name.toLowerCase();
          const isCpTaker = !!cpTaker && cpTaker.side === side && cpTaker.position === p && Date.now() - cpTaker.at < 3500;
          // The C card on the team that owns a pending centre pass should
          // pulse to show whose turn it is — the centre always takes it.
          const isPendingCp = pendingCentrePass && p === "C";
          return (
            <Btn
              key={p}
              position={p}
              playerName={name}
              isActive={isActive}
              isTracked={isTracked}
              isLive={isLive}
              isShooter={isShooter}
              isCaptain={isCaptain}
              isCpTaker={isCpTaker}
              isPendingCp={!!isPendingCp}
              possessionMs={ms}
              shotsMade={shotsMade}
              intercepts={intercepts}
              onTap={() => onTap(side, p)}
              onDoubleTap={() => onDoubleTap(side, p)}
            />
          );
        })}
      </div>
    </section>
  );
}

function Btn({
  position, playerName, isActive, isTracked, isLive, isShooter, isCaptain, isCpTaker, isPendingCp,
  possessionMs, shotsMade, intercepts, onTap, onDoubleTap,
}: {
  position: Position; playerName?: string; isActive: boolean; isTracked: boolean;
  isLive: boolean; isShooter: boolean; isCaptain: boolean; isCpTaker: boolean; isPendingCp: boolean;
  possessionMs: number; shotsMade: number; intercepts: number;
  onTap: () => void; onDoubleTap: () => void;
}) {
  const lastTapAt = useRef(0);
  const lastEndAt = useRef(0);
  const usingTouch = useRef(false);

  const handleEnd = (isTouch: boolean) => {
    if (!isLive) return;
    if (isTouch) usingTouch.current = true;
    else if (usingTouch.current) return;
    const now = Date.now();
    if (now - lastEndAt.current < GHOST_MS) return;
    lastEndAt.current = now;
    const since = now - lastTapAt.current;
    if (lastTapAt.current > 0 && since < DOUBLE_TAP_MS) {
      lastTapAt.current = 0;
      navigator.vibrate?.([15, 20, 15]);
      onDoubleTap();
    } else {
      lastTapAt.current = now;
      navigator.vibrate?.(10);
      onTap();
    }
  };

  const baseClass = isTracked ? "bg-navy border-gold/40 text-gold" : "bg-navy border-red-400/40 text-red-300";
  const activeClass = isTracked
    ? "bg-gold text-navy-dark border-gold scale-110 z-10 shadow-lg shadow-gold/40"
    : "bg-red-500 text-white border-red-300 scale-110 z-10 shadow-lg shadow-red-500/40";

  return (
    <button
      disabled={!isLive}
      onTouchEnd={(e) => { e.preventDefault(); handleEnd(true); }}
      onMouseUp={() => handleEnd(false)}
      className={`
        relative rounded-md border-2 py-2 px-1
        flex flex-col items-center justify-center
        font-bold transition-all duration-200 ease-out
        min-h-[76px] touch-none
        ${isLive ? "active:scale-95" : "opacity-40 grayscale"}
        ${isActive ? activeClass : baseClass}
        ${isPendingCp && !isActive ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-navy-dark animate-cp" : ""}
      `}
    >
      <span className="font-display text-xl leading-none tracking-wider">{position}</span>
      {playerName && (
        <span className="text-[8px] uppercase tracking-wider mt-0.5 truncate max-w-full opacity-80">
          {playerName}
        </span>
      )}
      {possessionMs > 1000 && (
        <span className="text-[8px] font-mono tabular-nums mt-0.5 opacity-60">{fmtMs(possessionMs)}</span>
      )}
      {isShooter && shotsMade > 0 && (
        <span className={`absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-navy-dark ${isTracked ? "bg-gold text-navy-dark" : "bg-red-500 text-white"}`}>
          {shotsMade}
        </span>
      )}
      {intercepts > 0 && (
        <span className="absolute -bottom-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-emerald-500 text-emerald-950 ring-2 ring-navy-dark">
          {intercepts}
        </span>
      )}
      {isCaptain && (
        <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center bg-emerald-400 text-emerald-950 ring-2 ring-navy-dark">
          C
        </span>
      )}
      {isCpTaker && (
        <span className="absolute inset-x-0 -bottom-2 mx-auto w-fit px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-amber-400 text-navy-dark ring-2 ring-navy-dark whitespace-nowrap animate-cp">
          ✦ CP
        </span>
      )}
      {isPendingCp && (
        <span className="absolute inset-x-0 -top-2.5 mx-auto w-fit px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-amber-400 text-navy-dark ring-2 ring-navy-dark whitespace-nowrap z-20">
          ✦ TAKE CP
        </span>
      )}
    </button>
  );
}
