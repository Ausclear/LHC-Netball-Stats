"use client";

import { useState } from "react";
import { Lineup, POSITIONS, Position, Side, Squad } from "@/lib/types";

export function Setup({
  lhcName,
  oppName,
  lineup,
  captain,
  coinTossWinner,
  squad,
  matchStarted,
  currentQuarter,
  onLhcName,
  onOppName,
  onLineup,
  onCaptain,
  onCoinTossWinner,
  onSquadAdd,
  onSquadUpdate,
  onSquadRemove,
  onSquadTeamName,
  onStart,
  onResume,
  onReset,
}: {
  lhcName: string;
  oppName: string;
  lineup: Lineup;
  captain?: string;
  coinTossWinner: Side;
  squad: Squad;
  matchStarted: boolean;
  currentQuarter: number;
  onLhcName: (n: string) => void;
  onOppName: (n: string) => void;
  onLineup: (l: Lineup) => void;
  onCaptain: (n: string) => void;
  onCoinTossWinner: (s: Side) => void;
  onSquadAdd: (n: string) => void;
  onSquadUpdate: (i: number, n: string) => void;
  onSquadRemove: (i: number) => void;
  onSquadTeamName: (n: string) => void;
  onStart: () => void;
  onResume: () => void;
  onReset: () => void;
}) {
  const [tab, setTab] = useState<"lineup" | "squad">("lineup");
  const [newPlayerName, setNewPlayerName] = useState("");

  // Auto-strip duplicate names from lineup
  const setSlot = (p: Position, name: string) => {
    const next: Lineup = { ...lineup, [p]: name };
    if (name) {
      for (const other of POSITIONS) {
        if (other !== p && next[other] === name) next[other] = "";
      }
    }
    onLineup(next);
  };

  return (
    <main className="min-h-[100dvh] bg-navy-dark text-cream flex flex-col">
      <header className="bg-navy border-b border-gold/30 px-4 pt-4 pb-2">
        <div className="font-display text-gold text-3xl tracking-widest leading-none">LHC NETBALL</div>
        <div className="text-[10px] uppercase tracking-widest text-cream/50 mt-1">Match Setup</div>
      </header>

      <div className="flex border-b border-white/5 bg-navy">
        <TabBtn active={tab === "lineup"} onClick={() => setTab("lineup")} label="Lineup" sub="This match" />
        <TabBtn active={tab === "squad"} onClick={() => setTab("squad")} label="Squad" sub="Saved roster" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "lineup" && (
          <>
            <Card>
              <Heading>Team Names</Heading>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-16 flex-none text-[10px] uppercase tracking-widest text-cream/50">LHC</div>
                  <input value={lhcName} onChange={(e) => onLhcName(e.target.value)}
                    className="flex-1 bg-navy border border-gold/60 rounded-md px-3 py-2 text-cream text-sm focus:outline-none focus:border-gold" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 flex-none text-[10px] uppercase tracking-widest text-cream/50">Opp</div>
                  <input value={oppName} onChange={(e) => onOppName(e.target.value)}
                    className="flex-1 bg-navy border border-white/15 rounded-md px-3 py-2 text-cream text-sm focus:outline-none focus:border-red-300" />
                </div>
              </div>
            </Card>

            <Card>
              <Heading>Coin Toss Winner</Heading>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onCoinTossWinner("lhc")}
                  className={`py-3 rounded-md border text-sm font-bold uppercase tracking-widest ${
                    coinTossWinner === "lhc" ? "bg-amber-500 text-amber-950 border-amber-300" : "bg-navy border-white/10 text-cream/60"
                  }`}>
                  ✦ {lhcName}
                </button>
                <button onClick={() => onCoinTossWinner("opp")}
                  className={`py-3 rounded-md border text-sm font-bold uppercase tracking-widest ${
                    coinTossWinner === "opp" ? "bg-amber-500 text-amber-950 border-amber-300" : "bg-navy border-white/10 text-cream/60"
                  }`}>
                  ✦ {oppName}
                </button>
              </div>
              <div className="text-[10px] text-cream/40 mt-2">Takes first centre of Q1 and Q3. Centres alternate after every goal.</div>
            </Card>

            <Card highlight>
              <Heading>★ {lhcName} Lineup</Heading>

              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gold/15">
                <div className="w-12 flex-none font-display tracking-wider text-center py-2 rounded bg-emerald-500/20 text-emerald-300 text-base">C</div>
                <select value={captain || ""} onChange={(e) => onCaptain(e.target.value)}
                  className="flex-1 bg-navy border border-emerald-400/30 rounded-md px-3 py-2 text-cream text-sm focus:outline-none focus:border-emerald-300 appearance-none">
                  <option value="">Captain (optional)</option>
                  {squad.players.filter(Boolean).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                {POSITIONS.map((p) => {
                  const value = lineup[p];
                  return (
                    <div key={p} className="flex items-center gap-2">
                      <div className="w-12 flex-none font-display tracking-wider text-center py-2 rounded bg-gold/20 text-gold">{p}</div>
                      <select value={value} onChange={(e) => setSlot(p, e.target.value)}
                        className="flex-1 bg-navy border border-white/10 rounded-md px-3 py-2 text-cream text-sm focus:outline-none focus:border-gold appearance-none">
                        <option value="">{positionLabel(p)}</option>
                        {value && !squad.players.includes(value) && <option value={value}>{value}</option>}
                        {squad.players.filter(Boolean).map((name) => {
                          const here = (Object.keys(lineup) as Position[]).find((k) => lineup[k] === name);
                          const label = !here ? `${name}  ·  available`
                            : here === p ? name
                            : `${name}  ·  ${here}`;
                          return <option key={name} value={name}>{label}</option>;
                        })}
                      </select>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}

        {tab === "squad" && (
          <>
            <Card>
              <Heading>Squad Team Name</Heading>
              <input value={squad.teamName} onChange={(e) => onSquadTeamName(e.target.value)}
                className="w-full bg-navy border border-white/10 rounded-md px-3 py-2 text-cream text-sm" />
            </Card>
            <Card highlight>
              <Heading>Players</Heading>
              <div className="space-y-1.5 mb-3">
                {squad.players.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-6 flex-none text-[10px] font-mono text-cream/40 text-right">{i + 1}.</div>
                    <input value={p} onChange={(e) => onSquadUpdate(i, e.target.value)}
                      placeholder="(blank slot)"
                      className="flex-1 bg-navy border border-white/10 rounded-md px-3 py-2 text-cream text-sm" />
                    <button onClick={() => onSquadRemove(i)}
                      className="w-10 h-10 rounded-md bg-navy border border-red-400/30 text-red-300 font-bold">
                      ✗
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newPlayerName.trim()) { onSquadAdd(newPlayerName); setNewPlayerName(""); }}}
                  placeholder="Add a player…"
                  className="flex-1 bg-navy border border-gold/30 rounded-md px-3 py-2 text-cream text-sm focus:outline-none focus:border-gold" />
                <button
                  onClick={() => { if (newPlayerName.trim()) { onSquadAdd(newPlayerName); setNewPlayerName(""); }}}
                  disabled={!newPlayerName.trim()}
                  className={`px-4 h-10 rounded-md font-bold uppercase tracking-widest text-xs ${newPlayerName.trim() ? "bg-gold text-navy-dark" : "bg-navy border border-white/10 text-cream/30"}`}>
                  + Add
                </button>
              </div>
            </Card>
          </>
        )}
      </div>

      <footer className="border-t border-gold/30 p-3 bg-navy space-y-2">
        {matchStarted ? (
          <>
            <button onClick={onResume}
              className="w-full bg-gold text-navy-dark font-display tracking-widest py-4 rounded-lg text-xl active:translate-y-px">
              ← BACK TO MATCH (Q{currentQuarter})
            </button>
            <button onClick={onReset}
              className="w-full bg-red-600/20 border border-red-400/40 text-red-300 font-display tracking-widest py-3 rounded-lg text-sm">
              ⟲ START NEW MATCH
            </button>
          </>
        ) : (
          <button onClick={onStart}
            className="w-full bg-gold text-navy-dark font-display tracking-widest py-4 rounded-lg text-xl active:translate-y-px">
            START MATCH →
          </button>
        )}
      </footer>
    </main>
  );
}

function TabBtn({ active, onClick, label, sub }: { active: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2.5 px-2 text-center transition-colors ${active ? "border-b-2 border-gold bg-gold/5" : "border-b-2 border-transparent"}`}>
      <div className={`font-display tracking-widest text-base leading-none ${active ? "text-gold" : "text-cream/60"}`}>{label.toUpperCase()}</div>
      <div className="text-[9px] uppercase tracking-widest text-cream/40 mt-0.5">{sub}</div>
    </button>
  );
}
function Card({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return <section className={`rounded-lg p-4 border ${highlight ? "bg-gold/5 border-gold/30" : "bg-navy/60 border-white/10"}`}>{children}</section>;
}
function Heading({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-gold/80 font-bold mb-2">{children}</div>;
}
function positionLabel(p: Position): string {
  return ({ GS: "Goal Shooter", GA: "Goal Attack", WA: "Wing Attack", C: "Centre", WD: "Wing Defence", GD: "Goal Defence", GK: "Goal Keeper" }[p]);
}
