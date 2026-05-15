"use client";

import { useEffect, useState } from "react";

export function GoalToast({
  lastGoal,
  teamName,
  isTracked,
  playerName,
}: {
  lastGoal?: { side: string; at: number };
  teamName: string;
  isTracked: boolean;
  playerName?: string;
}) {
  const [show, setShow] = useState(false);
  const [stamp, setStamp] = useState(0);
  useEffect(() => {
    if (!lastGoal) return;
    if (lastGoal.at <= stamp) return;
    setStamp(lastGoal.at);
    setShow(true);
    const id = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(id);
  }, [lastGoal?.at, stamp]);

  if (!show || !lastGoal) return null;
  return (
    <div onClick={() => setShow(false)}
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-auto bg-black/40 backdrop-blur-sm">
      <div className={`text-center px-8 py-4 rounded-2xl border-4 shadow-2xl ${isTracked ? "bg-gold/30 border-gold text-gold" : "bg-red-500/30 border-red-400 text-red-200"}`}>
        <div className="font-display text-6xl tracking-widest">GOAL!</div>
        <div className="text-sm uppercase tracking-widest opacity-80 mt-1">{teamName}{playerName ? ` · ${playerName}` : ""}</div>
        <div className="text-[10px] uppercase tracking-widest opacity-50 mt-2">Tap to dismiss</div>
      </div>
    </div>
  );
}
