"use client";

import { useMemo, useState } from "react";
import { Derived, fmtMs, pomScore } from "@/lib/stats";
import { Division, MatchState, Position, SavedMatch } from "@/lib/types";
import { LadderRow, buildBestAndFairest, buildLadder, buildSeasonPlayerTotals } from "@/lib/season";
import { downloadFile, exportEventsCsv, exportSummaryCsv } from "@/lib/export";

type Tab = "match" | "players" | "season" | "ladder";

export function Stats({
  match,
  derived,
  saved,
  division,
  squadPlayers,
  onBack,
  onReset,
  onSetVote,
  onAddTeam,
  onRemoveTeam,
  onSetDivisionName,
  onAddManual,
  onRemoveManual,
  onRemoveSaved,
}: {
  match: MatchState;
  derived: Derived;
  saved: SavedMatch[];
  division: Division;
  squadPlayers: string[];
  onBack: () => void;
  onReset: () => void;
  onSetVote: (slot: "first" | "second", name: string) => void;
  onAddTeam: (n: string) => void;
  onRemoveTeam: (n: string) => void;
  onSetDivisionName: (n: string) => void;
  onAddManual: (r: { homeTeam: string; awayTeam: string; homeGoals: number; awayGoals: number }) => void;
  onRemoveManual: (id: string) => void;
  onRemoveSaved: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("match");
  return (
    <main className="min-h-[100dvh] bg-navy-dark text-cream flex flex-col">
      <header className="bg-navy border-b border-gold/30 px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} className="text-gold text-sm">← Back</button>
        <div className="font-display text-gold tracking-widest">STATS</div>
        <button onClick={onReset} className="text-red-400 text-xs uppercase tracking-widest">Reset</button>
      </header>
      <div className="grid grid-cols-4 border-b border-white/5 bg-navy">
        {(["match", "players", "season", "ladder"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2.5 text-center ${tab === t ? "border-b-2 border-gold bg-gold/5" : "border-b-2 border-transparent"}`}>
            <span className={`font-display tracking-widest text-sm ${tab === t ? "text-gold" : "text-cream/60"}`}>
              {t.toUpperCase()}
            </span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "match" && <MatchTab match={match} derived={derived} onSetVote={onSetVote} squadPlayers={squadPlayers} />}
        {tab === "players" && <PlayersTab match={match} derived={derived} />}
        {tab === "season" && <SeasonTab saved={saved} onRemoveSaved={onRemoveSaved} />}
        {tab === "ladder" && <LadderTab division={division} saved={saved} lhcName={match.lhcName}
          onAddTeam={onAddTeam} onRemoveTeam={onRemoveTeam} onSetDivisionName={onSetDivisionName}
          onAddManual={onAddManual} onRemoveManual={onRemoveManual} />}
      </div>
    </main>
  );
}

function MatchTab({ match, derived, onSetVote, squadPlayers }: { match: MatchState; derived: Derived; onSetVote: (s: "first" | "second", n: string) => void; squadPlayers: string[] }) {
  // POM candidate ranking
  const ranked = useMemo(() => {
    const lhcPlayers = Object.values(derived.lhc.byPlayer);
    return [...lhcPlayers].sort((a, b) => pomScore(b) - pomScore(a));
  }, [derived]);
  const firstName = match.votes?.first;
  const secondName = match.votes?.second;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <ScoreBox name={match.lhcName} goals={derived.lhc.goals} shots={derived.lhc.shotsAttempted} accent="gold" />
        <ScoreBox name={match.oppName} goals={derived.opp.goals} shots={derived.opp.shotsAttempted} accent="red" />
      </div>

      <Card title={`${match.lhcName} — Awards`}>
        {match.captain && (
          <div className="flex items-center gap-3 pb-3 mb-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold">C</div>
            <div className="flex-1">
              <div className="text-[9px] uppercase tracking-widest text-cream/50">Captain</div>
              <div className="font-bold text-base">{match.captain}</div>
            </div>
          </div>
        )}
        <div className="text-[10px] uppercase tracking-widest text-gold/80 font-bold mb-2">Best &amp; Fairest Vote</div>
        <div className="space-y-2 mb-3">
          <VoteSlot label="Best on Court" points={2} value={firstName} suggested={!firstName ? ranked[0]?.name : undefined} onClear={() => onSetVote("first", "")} />
          <VoteSlot label="Second" points={1} value={secondName} suggested={!secondName ? ranked[1]?.name : undefined} onClear={() => onSetVote("second", "")} />
        </div>
        {ranked.length === 0 ? (
          <div className="text-center text-cream/40 py-3 text-sm">No stats yet.</div>
        ) : (
          <div className="space-y-1.5">
            {ranked.map((p, i) => {
              const isFirst = firstName === p.name, isSecond = secondName === p.name;
              const tap = () => {
                if (isFirst) onSetVote("first", "");
                else if (isSecond) onSetVote("first", p.name);
                else if (!firstName) onSetVote("first", p.name);
                else if (!secondName) onSetVote("second", p.name);
                else onSetVote("second", p.name);
              };
              return (
                <button key={p.name} onClick={tap}
                  className={`w-full flex items-center gap-3 rounded-lg border p-2.5 ${isFirst ? "bg-gold/25 border-gold ring-2 ring-gold/40" : isSecond ? "bg-gold/10 border-gold/60" : "bg-navy/40 border-white/10"}`}>
                  <div className="text-[10px] font-mono w-6 text-cream/40 text-center">{i + 1}</div>
                  <div className="flex-1 text-left min-w-0">
                    <div className={`text-sm font-bold truncate ${isFirst || isSecond ? "text-gold" : "text-cream"}`}>{p.name}</div>
                    <div className="text-[9px] text-cream/50 mt-0.5 truncate">
                      {[p.shotsMade && `${p.shotsMade}G`, p.intercepts && `${p.intercepts} INT`, p.deflections && `${p.deflections} DEF`, p.possessionMs && fmtMs(p.possessionMs)].filter(Boolean).join(" · ") || "no stats yet"}
                    </div>
                  </div>
                  {isFirst && <span className="font-display tracking-widest text-xs text-gold px-2 py-1 rounded bg-gold/20 border border-gold/40">1ST · 2 PTS</span>}
                  {isSecond && <span className="font-display tracking-widest text-xs text-gold px-2 py-1 rounded bg-gold/10 border border-gold/30">2ND · 1 PT</span>}
                  {!isFirst && !isSecond && <div className="font-mono tabular-nums text-sm text-cream/60">{pomScore(p).toFixed(1)}</div>}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Score by Quarter">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((q) => {
            const d = derived.byQuarter[q as 1 | 2 | 3 | 4];
            const lhcWon = d.lhcGoals > d.oppGoals, oppWon = d.oppGoals > d.lhcGoals;
            return (
              <div key={q} className="bg-navy/60 rounded-md p-2 text-center">
                <div className="text-[9px] uppercase tracking-widest text-cream/50">Q{q}</div>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <span className={`font-display text-xl tabular-nums leading-none text-gold ${lhcWon ? "" : "opacity-50"}`}>{d.lhcGoals}</span>
                  <span className="text-[10px] text-cream/30">—</span>
                  <span className={`font-display text-xl tabular-nums leading-none text-red-300 ${oppWon ? "" : "opacity-50"}`}>{d.oppGoals}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Time by Court Third (LHC perspective)">
        <div className="grid grid-cols-3 gap-2 text-center">
          <ThirdStat label="LHC Attack" value={fmtMs(derived.byThird.lhcAttack)} accent="gold" />
          <ThirdStat label="Centre" value={fmtMs(derived.byThird.centre)} />
          <ThirdStat label="LHC Defence" value={fmtMs(derived.byThird.lhcDefence)} accent="red" />
        </div>
      </Card>

      <Card title="Centre Pass Conversion">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label={match.lhcName}
            value={`${derived.cpConversion.lhcMade}/${derived.cpConversion.lhcTotal}`}
            accent="gold" />
          <Stat label={match.oppName}
            value={`${derived.cpConversion.oppMade}/${derived.cpConversion.oppTotal}`}
            accent="red" />
        </div>
        <div className="text-[10px] text-cream/40 mt-2 leading-relaxed">
          Centre passes converted directly into a goal (before the other side touched the ball).
        </div>
      </Card>

      <Card title="Possession & Turnovers">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label={`Possession (${match.lhcName})`} value={fmtMs(derived.lhc.possessionMs)} />
          <Stat label={`Possession (${match.oppName})`} value={fmtMs(derived.opp.possessionMs)} accent="red" />
          <Stat label="Turnovers Won" value={String(derived.lhc.turnoversWon)} />
          <Stat label="Turnovers Lost" value={String(derived.lhc.turnoversLost)} accent="red" />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <button onClick={() => downloadFile(`lhc-summary-${new Date(match.createdAt).toISOString().slice(0, 10)}.csv`, exportSummaryCsv(match))}
          className="bg-navy border border-gold/40 text-gold py-3 rounded-lg text-xs uppercase tracking-widest font-bold">
          ↓ Summary CSV
        </button>
        <button onClick={() => downloadFile(`lhc-events-${new Date(match.createdAt).toISOString().slice(0, 10)}.csv`, exportEventsCsv(match))}
          className="bg-navy border border-gold/40 text-gold py-3 rounded-lg text-xs uppercase tracking-widest font-bold">
          ↓ Event Log CSV
        </button>
      </div>
    </>
  );
}

function PlayersTab({ match, derived }: { match: MatchState; derived: Derived }) {
  // Always show all lineup players by name, layered with their stats
  const players = useMemo(() => {
    const map: Record<string, any> = {};
    for (const p of (["GS","GA","WA","C","WD","GD","GK"] as Position[])) {
      const name = match.lineup[p];
      if (!name) continue;
      const k = name.toLowerCase();
      if (!map[k]) map[k] = { name, positions: [p], possessionMs: 0, shotsMade: 0, shotsMissed: 0, intercepts: 0, deflections: 0, turnoversLost: 0, penalties: 0 };
      else if (!map[k].positions.includes(p)) map[k].positions.push(p);
    }
    for (const p of Object.values(derived.lhc.byPlayer)) {
      const k = p.name.toLowerCase();
      map[k] = { ...p };
    }
    return Object.values(map).sort((a: any, b: any) => b.possessionMs - a.possessionMs);
  }, [match.lineup, derived]);

  return (
    <Card title={`${match.lhcName} — By Player`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[9px] uppercase tracking-widest text-gold/70">
              <th className="text-left py-1">Player</th>
              <th className="text-left">Pos</th>
              <th className="text-right">Poss</th>
              <th className="text-right">INT</th>
              <th className="text-right">DEF</th>
              <th className="text-right">TO</th>
              <th className="text-right">PEN</th>
              <th className="text-right">Sh</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p: any) => (
              <tr key={p.name} className="border-t border-white/5">
                <td className="py-1.5 font-bold text-gold">{p.name}</td>
                <td className="text-cream/60 text-[10px]">{p.positions.join(", ")}</td>
                <td className="text-right font-mono tabular-nums">{fmtMs(p.possessionMs)}</td>
                <td className="text-right font-mono tabular-nums text-emerald-300">{p.intercepts || ""}</td>
                <td className="text-right font-mono tabular-nums text-teal-300">{p.deflections || ""}</td>
                <td className="text-right font-mono tabular-nums text-amber-300/80">{p.turnoversLost || ""}</td>
                <td className="text-right font-mono tabular-nums text-rose-300/80">{p.penalties || ""}</td>
                <td className="text-right font-mono tabular-nums">{p.shotsMade + p.shotsMissed > 0 ? `${p.shotsMade}/${p.shotsMade + p.shotsMissed}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SeasonTab({ saved, onRemoveSaved }: { saved: SavedMatch[]; onRemoveSaved: (id: string) => void }) {
  const players = useMemo(() => buildSeasonPlayerTotals(saved), [saved]);
  const bf = useMemo(() => buildBestAndFairest(saved), [saved]);
  const matchesWithVotes = useMemo(() => [...saved].filter((m) => m.votes && (m.votes.first || m.votes.second)).sort((a, b) => a.createdAt - b.createdAt), [saved]);
  return (
    <>
      <Card title="Season Summary">
        <div className="grid grid-cols-3 gap-2 text-center">
          <SmallStat label="Matches" value={String(saved.length)} />
          <SmallStat label="Goals For" value={String(saved.reduce((a, m) => a + m.lhcGoals, 0))} />
          <SmallStat label="Goals Ag." value={String(saved.reduce((a, m) => a + m.oppGoals, 0))} />
        </div>
      </Card>
      {bf.length > 0 && (
        <Card title="Best & Fairest — Season">
          <div className="space-y-1.5">
            {bf.map((row, i) => (
              <div key={row.name}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${i === 0 ? "bg-gold/15 border-gold" : "bg-navy/40 border-white/10"}`}>
                <div className="text-[10px] font-mono w-6 text-cream/40 text-center">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${i === 0 ? "text-gold" : "text-cream"}`}>
                    {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : ""}{row.name}
                  </div>
                  <div className="text-[10px] text-cream/50 mt-0.5">
                    {row.firsts > 0 && `${row.firsts}× best`}{row.firsts > 0 && row.seconds > 0 && " · "}{row.seconds > 0 && `${row.seconds}× 2nd`}
                  </div>
                </div>
                <div className={`font-display text-2xl tabular-nums ${i === 0 ? "text-gold" : "text-cream/80"}`}>{row.pts}</div>
              </div>
            ))}
            <div className="text-[9px] text-cream/40 pt-1">2 pts best on court · 1 pt second</div>
          </div>
        </Card>
      )}
      {matchesWithVotes.length > 0 && bf.length > 0 && (
        <Card title="Votes — Round by Round">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-[9px] uppercase tracking-widest text-gold/70">
                  <th className="text-left py-1 pr-2 sticky left-0 bg-navy/60 z-10">Player</th>
                  {matchesWithVotes.map((m, i) => (
                    <th key={m.id} className="text-center px-1 min-w-[44px]" title={`Round ${i + 1} vs ${m.oppName}`}>R{i + 1}</th>
                  ))}
                  <th className="text-right pl-2 sticky right-0 bg-navy/60">Total</th>
                </tr>
              </thead>
              <tbody>
                {bf.map((row, i) => (
                  <tr key={row.name} className={`border-t border-white/5 ${i === 0 ? "bg-gold/5" : ""}`}>
                    <td className={`py-1.5 pr-2 sticky left-0 bg-navy/60 z-10 font-bold ${i === 0 ? "text-gold" : "text-cream"}`}>
                      {row.name}
                    </td>
                    {matchesWithVotes.map((m) => {
                      const pts = m.votes?.first === row.name ? 2 : m.votes?.second === row.name ? 1 : 0;
                      return (
                        <td key={m.id} className={`text-center px-1 font-mono tabular-nums ${
                          pts === 2 ? "text-gold font-bold" : pts === 1 ? "text-gold/70" : "text-cream/15"
                        }`}>{pts || "·"}</td>
                      );
                    })}
                    <td className={`text-right pl-2 font-mono tabular-nums font-bold sticky right-0 bg-navy/60 ${i === 0 ? "text-gold" : "text-cream"}`}>
                      {row.pts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {players.length > 0 && (
        <Card title="Players — Season Totals">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] uppercase tracking-widest text-gold/70">
                  <th className="text-left py-1">Player</th>
                  <th className="text-right">M</th>
                  <th className="text-right">Poss</th>
                  <th className="text-right">G</th>
                  <th className="text-right">INT</th>
                  <th className="text-right">DEF</th>
                  <th className="text-right">TO</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.name} className="border-t border-white/5">
                    <td className="py-1.5 font-bold text-gold">{p.name}</td>
                    <td className="text-right font-mono tabular-nums">{p.matches}</td>
                    <td className="text-right font-mono tabular-nums">{fmtMs(p.possessionMs)}</td>
                    <td className="text-right font-mono tabular-nums">{p.shotsMade}</td>
                    <td className="text-right font-mono tabular-nums text-emerald-300">{p.intercepts}</td>
                    <td className="text-right font-mono tabular-nums text-teal-300">{p.deflections}</td>
                    <td className="text-right font-mono tabular-nums text-amber-300/80">{p.turnoversLost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card title="Saved Matches">
        {saved.length === 0 ? (
          <div className="text-center text-cream/40 py-6 text-sm">No matches saved yet. Tap <span className="text-gold font-bold">FINISH</span> when Q4 ends.</div>
        ) : (
          <div className="space-y-2">
            {[...saved].sort((a, b) => b.createdAt - a.createdAt).map((m) => {
              const result = m.lhcGoals > m.oppGoals ? "W" : m.lhcGoals < m.oppGoals ? "L" : "D";
              const colour = result === "W" ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                : result === "L" ? "bg-red-500/20 text-red-300 border-red-400/30"
                : "bg-amber-500/20 text-amber-300 border-amber-400/30";
              return (
                <div key={m.id} className="bg-navy/60 border border-white/5 rounded-lg p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded border flex items-center justify-center font-display tracking-widest text-lg ${colour}`}>{result}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">vs {m.oppName}</div>
                    <div className="text-[10px] text-cream/50">{new Date(m.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</div>
                    {(m.votes?.first || m.votes?.second) && (
                      <div className="text-[10px] mt-0.5 flex items-center gap-2">
                        {m.votes?.first && <span className="text-gold">★ {m.votes.first}</span>}
                        {m.votes?.second && <span className="text-gold/70">2nd: {m.votes.second}</span>}
                      </div>
                    )}
                  </div>
                  <div className="font-mono tabular-nums text-lg font-bold text-gold">{m.lhcGoals} — {m.oppGoals}</div>
                  <button onClick={() => { if (confirm(`Delete match vs ${m.oppName}?`)) onRemoveSaved(m.id); }}
                    className="text-red-400/70 text-lg">✗</button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}

function LadderTab({ division, saved, lhcName, onAddTeam, onRemoveTeam, onSetDivisionName, onAddManual, onRemoveManual }: {
  division: Division; saved: SavedMatch[]; lhcName: string;
  onAddTeam: (n: string) => void; onRemoveTeam: (n: string) => void;
  onSetDivisionName: (n: string) => void;
  onAddManual: (r: { homeTeam: string; awayTeam: string; homeGoals: number; awayGoals: number }) => void;
  onRemoveManual: (id: string) => void;
}) {
  const ladder = useMemo(() => buildLadder(division, saved, lhcName), [division, saved, lhcName]);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(division.name);
  const [newTeam, setNewTeam] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [mh, setMh] = useState(""); const [ma, setMa] = useState("");
  const [mhg, setMhg] = useState(""); const [mag, setMag] = useState("");

  return (
    <>
      <Card title="Division">
        {editing ? (
          <div className="flex items-center gap-2">
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)}
              className="flex-1 bg-navy border border-gold/40 rounded-md px-3 py-2 text-cream text-sm" />
            <button onClick={() => { onSetDivisionName(draftName.trim() || division.name); setEditing(false); }}
              className="px-3 py-2 rounded-md bg-gold text-navy-dark text-xs uppercase tracking-widest font-bold">Save</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="font-display text-gold text-2xl tracking-widest">{division.name.toUpperCase()}</div>
            <button onClick={() => { setDraftName(division.name); setEditing(true); }} className="text-[10px] uppercase tracking-widest text-cream/50">Edit</button>
          </div>
        )}
      </Card>

      <Card title="Ladder">
        {ladder.every((r) => r.P === 0) ? (
          <div className="text-center text-cream/40 py-6 text-sm">No results yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] uppercase tracking-widest text-gold/70">
                  <th className="text-left py-1">#</th>
                  <th className="text-left">Team</th>
                  <th className="text-right">P</th><th className="text-right">W</th><th className="text-right">D</th><th className="text-right">L</th>
                  <th className="text-right">GF</th><th className="text-right">GA</th><th className="text-right">±</th><th className="text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {ladder.map((r, i) => (
                  <tr key={r.team} className={`border-t border-white/5 ${r.isLhc ? "bg-gold/10" : ""}`}>
                    <td className="py-1.5 text-cream/40 font-mono">{i + 1}</td>
                    <td className={`py-1.5 font-bold truncate max-w-[120px] ${r.isLhc ? "text-gold" : "text-cream/80"}`}>{r.team}</td>
                    <td className="text-right font-mono tabular-nums">{r.P}</td>
                    <td className="text-right font-mono tabular-nums text-emerald-300">{r.W}</td>
                    <td className="text-right font-mono tabular-nums text-amber-300/80">{r.D}</td>
                    <td className="text-right font-mono tabular-nums text-red-300/80">{r.L}</td>
                    <td className="text-right font-mono tabular-nums">{r.GF}</td>
                    <td className="text-right font-mono tabular-nums">{r.GA}</td>
                    <td className={`text-right font-mono tabular-nums ${r.diff > 0 ? "text-emerald-300" : r.diff < 0 ? "text-red-300" : ""}`}>{r.diff > 0 ? "+" : ""}{r.diff}</td>
                    <td className="text-right font-mono tabular-nums font-bold text-gold">{r.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[9px] text-cream/40 mt-2">Win 4 · Draw 2 · Loss 1</div>
          </div>
        )}
      </Card>

      <Card title="Teams in Division">
        <div className="space-y-1.5 mb-3">
          {division.teams.map((t) => (
            <div key={t} className="flex items-center gap-2 bg-navy/40 rounded-md px-3 py-1.5">
              <div className={`flex-1 text-sm ${t.toLowerCase() === lhcName.toLowerCase() ? "text-gold font-bold" : "text-cream/80"}`}>{t}</div>
              <button onClick={() => onRemoveTeam(t)} className="text-red-400/70 text-sm px-1">✗</button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <input value={newTeam} onChange={(e) => setNewTeam(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newTeam.trim()) { onAddTeam(newTeam); setNewTeam(""); }}}
            placeholder="Add team…" className="flex-1 bg-navy border border-gold/30 rounded-md px-3 py-2 text-cream text-sm" />
          <button onClick={() => { if (newTeam.trim()) { onAddTeam(newTeam); setNewTeam(""); }}}
            disabled={!newTeam.trim()}
            className={`px-3 h-10 rounded-md font-bold uppercase tracking-widest text-xs ${newTeam.trim() ? "bg-gold text-navy-dark" : "bg-navy border border-white/10 text-cream/30"}`}>
            + Add
          </button>
        </div>
      </Card>

      <Card title="Manual Match Result">
        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="w-full bg-navy border border-gold/30 text-gold py-3 rounded-lg text-xs uppercase tracking-widest font-bold">
            + Add a result (other teams)
          </button>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select value={mh} onChange={(e) => setMh(e.target.value)} className="bg-navy border border-white/10 rounded-md px-2 py-2 text-cream text-sm">
                <option value="">Home team…</option>
                {division.teams.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={ma} onChange={(e) => setMa(e.target.value)} className="bg-navy border border-white/10 rounded-md px-2 py-2 text-cream text-sm">
                <option value="">Away team…</option>
                {division.teams.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" inputMode="numeric" placeholder="Home goals" value={mhg} onChange={(e) => setMhg(e.target.value)}
                className="bg-navy border border-white/10 rounded-md px-3 py-2 text-cream text-sm" />
              <input type="number" inputMode="numeric" placeholder="Away goals" value={mag} onChange={(e) => setMag(e.target.value)}
                className="bg-navy border border-white/10 rounded-md px-3 py-2 text-cream text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setShowForm(false); setMh(""); setMa(""); setMhg(""); setMag(""); }}
                className="py-2 rounded-md border border-white/15 text-cream/60 text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={() => {
                const hg = parseInt(mhg, 10); const ag = parseInt(mag, 10);
                if (mh && ma && mh !== ma && !isNaN(hg) && !isNaN(ag)) {
                  onAddManual({ homeTeam: mh, awayTeam: ma, homeGoals: hg, awayGoals: ag });
                  setShowForm(false); setMh(""); setMa(""); setMhg(""); setMag("");
                }
              }} disabled={!mh || !ma || mh === ma || !mhg || !mag}
                className="py-2 rounded-md bg-gold text-navy-dark text-xs uppercase tracking-widest font-bold disabled:opacity-30">Save</button>
            </div>
          </div>
        )}
        {division.manualResults.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
            {division.manualResults.map((r) => (
              <div key={r.id} className="flex items-center gap-2 bg-navy/40 rounded px-2 py-1.5 text-xs">
                <span className="flex-1 truncate">{r.homeTeam} {r.homeGoals} — {r.awayGoals} {r.awayTeam}</span>
                <button onClick={() => onRemoveManual(r.id)} className="text-red-400/70 px-1">✗</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

// Reusable bits
function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="bg-navy/60 border border-white/5 rounded-lg p-3">
      {title && <div className="text-[10px] uppercase tracking-widest text-gold/80 mb-2 font-bold">{title}</div>}
      {children}
    </section>
  );
}
function ScoreBox({ name, goals, shots, accent }: { name: string; goals: number; shots: number; accent: "gold" | "red" }) {
  return (
    <div className={`rounded-lg p-4 border ${accent === "gold" ? "bg-gold/10 border-gold/30" : "bg-red-500/10 border-red-400/30"}`}>
      <div className={`text-[10px] uppercase tracking-widest truncate ${accent === "gold" ? "text-gold/70" : "text-red-300/70"}`}>{name}</div>
      <div className={`font-display text-6xl leading-none mt-1 ${accent === "gold" ? "text-gold" : "text-red-300"}`}>{goals}</div>
      <div className="text-[10px] text-cream/50 mt-1">{shots} shots</div>
    </div>
  );
}
function Stat({ label, value, accent = "gold" as "gold" | "red" }: { label: string; value: string; accent?: "gold" | "red" }) {
  return (
    <div className={`rounded-lg p-3 border ${accent === "gold" ? "bg-gold/10 border-gold/30" : "bg-red-500/10 border-red-400/30"}`}>
      <div className="text-[9px] uppercase tracking-widest text-cream/60 truncate">{label}</div>
      <div className={`font-display text-2xl tracking-wider ${accent === "gold" ? "text-gold" : "text-red-300"}`}>{value}</div>
    </div>
  );
}
function ThirdStat({ label, value, accent }: { label: string; value: string; accent?: "gold" | "red" }) {
  return (
    <div className={`rounded-md p-2 border ${
      accent === "gold" ? "bg-gold/10 border-gold/30" :
      accent === "red" ? "bg-red-500/10 border-red-400/30" :
      "bg-navy/40 border-white/10"
    }`}>
      <div className="text-[9px] uppercase tracking-widest text-cream/50">{label}</div>
      <div className={`font-mono tabular-nums text-lg ${accent === "gold" ? "text-gold" : accent === "red" ? "text-red-300" : "text-cream"}`}>{value}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy/40 rounded-md p-2">
      <div className="text-[9px] uppercase tracking-widest text-cream/50">{label}</div>
      <div className="font-display text-2xl text-gold tabular-nums leading-none mt-1">{value}</div>
    </div>
  );
}
function VoteSlot({ label, points, value, suggested, onClear }: { label: string; points: 1 | 2; value?: string; suggested?: string; onClear: () => void }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${value ? "bg-gold/15 border-gold/50" : "bg-navy/40 border-white/10"}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-display tracking-widest text-sm ${value ? "bg-gold text-navy-dark" : "bg-navy border border-white/10 text-cream/40"}`}>{points}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] uppercase tracking-widest text-cream/50">{label} · {points} pt{points > 1 ? "s" : ""}</div>
        {value ? <div className="text-base font-bold text-gold truncate">{value}</div>
          : suggested ? <div className="text-sm text-cream/60 truncate">{suggested} <span className="text-[10px] text-cream/40">(suggested)</span></div>
          : <div className="text-sm text-cream/40">not awarded</div>}
      </div>
      {value && <button onClick={onClear} className="text-[10px] uppercase tracking-widest text-red-400/70 px-2">Clear</button>}
    </div>
  );
}
