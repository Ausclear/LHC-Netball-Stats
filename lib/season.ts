import { deriveStats } from "./stats";
import { Division, MatchState, SavedMatch } from "./types";

export interface LadderRow {
  team: string;
  P: number;
  W: number;
  D: number;
  L: number;
  GF: number;
  GA: number;
  diff: number;
  pts: number;
  isLhc: boolean;
}

const WIN = 4, DRAW = 2, LOSS = 1;

export function buildLadder(division: Division, saved: SavedMatch[], lhcName: string): LadderRow[] {
  const rows = new Map<string, LadderRow>();
  const ensure = (team: string): LadderRow => {
    const key = team.toLowerCase();
    let r = rows.get(key);
    if (!r) {
      r = { team, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, diff: 0, pts: 0, isLhc: team.toLowerCase() === lhcName.toLowerCase() };
      rows.set(key, r);
    }
    return r;
  };
  for (const t of division.teams) ensure(t);

  const apply = (home: string, away: string, hg: number, ag: number) => {
    const H = ensure(home), A = ensure(away);
    H.P++; A.P++;
    H.GF += hg; H.GA += ag; A.GF += ag; A.GA += hg;
    if (hg > ag) { H.W++; A.L++; H.pts += WIN; A.pts += LOSS; }
    else if (ag > hg) { A.W++; H.L++; A.pts += WIN; H.pts += LOSS; }
    else { H.D++; A.D++; H.pts += DRAW; A.pts += DRAW; }
  };

  for (const m of saved) apply(m.lhcName, m.oppName, m.lhcGoals, m.oppGoals);
  for (const r of division.manualResults) apply(r.homeTeam, r.awayTeam, r.homeGoals, r.awayGoals);

  for (const r of rows.values()) r.diff = r.GF - r.GA;

  return [...rows.values()].sort((a, b) =>
    b.pts - a.pts || b.diff - a.diff || b.GF - a.GF
  );
}

export interface BfRow {
  name: string;
  firsts: number;
  seconds: number;
  pts: number;
}

export function buildBestAndFairest(saved: SavedMatch[]): BfRow[] {
  const map = new Map<string, BfRow>();
  const ensure = (n: string): BfRow => {
    const key = n.toLowerCase();
    let r = map.get(key);
    if (!r) { r = { name: n, firsts: 0, seconds: 0, pts: 0 }; map.set(key, r); }
    return r;
  };
  for (const m of saved) {
    if (!m.votes) continue;
    if (m.votes.first) { const r = ensure(m.votes.first); r.firsts++; r.pts += 2; }
    if (m.votes.second) { const r = ensure(m.votes.second); r.seconds++; r.pts += 1; }
  }
  return [...map.values()].sort((a, b) =>
    b.pts - a.pts || b.firsts - a.firsts || a.name.localeCompare(b.name)
  );
}

// Aggregated season player stats by reconstructing a MatchState from each
// SavedMatch and walking deriveStats.
export function buildSeasonPlayerTotals(saved: SavedMatch[]) {
  const totals: Record<string, {
    name: string;
    matches: number;
    possessionMs: number;
    shotsMade: number;
    shotsMissed: number;
    intercepts: number;
    deflections: number;
    turnoversLost: number;
    penalties: number;
  }> = {};
  for (const sm of saved) {
    const fakeState: MatchState = {
      id: sm.id, createdAt: sm.createdAt,
      lhcName: sm.lhcName, oppName: sm.oppName,
      lineup: { GS: "", GA: "", WA: "", C: "", WD: "", GD: "", GK: "" },
      coinTossWinner: "lhc", currentQuarter: 4,
      events: sm.events, running: false, quarterElapsedMs: 0,
    };
    const ds = deriveStats(fakeState);
    for (const p of Object.values(ds.lhc.byPlayer)) {
      const key = p.name.toLowerCase();
      let t = totals[key];
      if (!t) {
        t = { name: p.name, matches: 0, possessionMs: 0, shotsMade: 0, shotsMissed: 0, intercepts: 0, deflections: 0, turnoversLost: 0, penalties: 0 };
        totals[key] = t;
      }
      t.matches++;
      t.possessionMs += p.possessionMs;
      t.shotsMade += p.shotsMade;
      t.shotsMissed += p.shotsMissed;
      t.intercepts += p.intercepts;
      t.deflections += p.deflections;
      t.turnoversLost += p.turnoversLost;
      t.penalties += p.penalties;
    }
  }
  return Object.values(totals).sort((a, b) => b.possessionMs - a.possessionMs);
}
