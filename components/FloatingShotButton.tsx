"use client";

import { useRef } from "react";
import { Side } from "@/lib/types";

const LONG_PRESS_MS = 500;

/**
 * Big circular action button anchored bottom-right.
 * Only rendered when a shooter (GS or GA) on EITHER team has the ball.
 *
 *  - Tap (short press)   → goal
 *  - Long press (>=500ms) → miss
 *
 * Coloured to match whichever side has possession so it's obvious whose
 * goal you're about to log.
 */
export function FloatingShotButton({
  side,
  onGoal,
  onMiss,
}: {
  side: Side;
  onGoal: () => void;
  onMiss: () => void;
}) {
  const longTimer = useRef<number | null>(null);
  const longFired = useRef(false);
  const usingTouch = useRef(false);

  const start = (isTouch: boolean) => {
    if (isTouch) usingTouch.current = true;
    else if (usingTouch.current) return;
    longFired.current = false;
    longTimer.current = window.setTimeout(() => {
      longFired.current = true;
      navigator.vibrate?.([40, 30, 60]);
      onMiss();
    }, LONG_PRESS_MS);
  };
  const end = (isTouch: boolean) => {
    if (!isTouch && usingTouch.current) return;
    if (longTimer.current) {
      window.clearTimeout(longTimer.current);
      longTimer.current = null;
    }
    if (longFired.current) return;
    navigator.vibrate?.(15);
    onGoal();
  };
  const cancel = () => {
    if (longTimer.current) {
      window.clearTimeout(longTimer.current);
      longTimer.current = null;
    }
    longFired.current = false;
  };

  const isLhc = side === "lhc";
  const btnClass = isLhc
    ? "bg-emerald-500 border-emerald-300 text-emerald-950 shadow-emerald-500/40"
    : "bg-rose-500 border-rose-300 text-white shadow-rose-500/40";

  return (
    <div className="fixed bottom-16 right-3 z-40 flex flex-col items-end gap-1.5 pointer-events-none">
      <div className="text-[9px] uppercase tracking-widest text-cream/60 font-bold pr-1 select-none">
        Tap = goal · Hold = miss
      </div>
      <button
        onTouchStart={(e) => { e.preventDefault(); start(true); }}
        onTouchEnd={(e) => { e.preventDefault(); end(true); }}
        onTouchCancel={cancel}
        onMouseDown={() => start(false)}
        onMouseUp={() => end(false)}
        onMouseLeave={cancel}
        style={{ touchAction: "manipulation" }}
        className={`
          pointer-events-auto
          w-20 h-20 rounded-full border-4 shadow-xl
          active:scale-90 transition-transform
          flex flex-col items-center justify-center
          font-display tracking-widest
          ${btnClass}
        `}
        aria-label="Goal (tap) or miss (long-press)"
      >
        <span className="text-2xl leading-none">✓</span>
        <span className="text-[10px] leading-none mt-0.5">GOAL</span>
      </button>
    </div>
  );
}
