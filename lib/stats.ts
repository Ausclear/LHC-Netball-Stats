import {
  GameEvent,
  Lineup,
  MatchState,
  POSITIONS,
  Position,
  Quarter,
  Side,
} from "./types";

const MAX_POSSESSION_SPAN_MS = 60_000; // hard ceiling

export interface PlayerLine {
  name: string;
  positions: Position[];
  possessionMs: number;
  passes: number;
  shotsMade: number;
  shotsMissed: number;
  intercepts: number;
  deflections: number;
  turnoversLost: number;
  penalties: number;
}

export interface SideStats {
  possessionMs: number;
  goals: number;
  shotsAttempted: number;
  intercepts: number;
  deflections: number;
  turnoversWon: number;
  turnoversLost: number;
  penalties: number;
  centrePasses: number;
  byPosition: Record<Position, PlayerLine>;
  byPlayer: Record<string, PlayerLine>; // keyed by name lowercased; LHC only
}

export interface Derived {
  lhc: SideStats;
  opp: SideStats;
  byQuarter: Record<Quarter, { lhcGoals: number; oppGoals: number }>;
  lastGoal?: { side: Side; position: Position; at: number };
  pendingCentrePass?: Side;
  // Time accumulated in each court third (only LHC perspective —
  // attack = LHC shooters' end, centre = midcourt, defence = LHC GD/GK end)
  byThird: { lhcAttack: number; centre: number; lhcDefence: number };
  // Centre pass conversion: how many centre passes for each side were
  // converted directly into a goal before the other side touched the ball.
  cpConversion: { lhcMade: number; lhcTotal: number; oppMade: number; oppTotal: number };
  // The most recent CP taker (so the live UI can flash their button)
  cpTaker?: { side: Side; position: Position; at: number };
}

function emptyLine(name: string): PlayerLine {
  return {
    name,
    positions: [],
    possessionMs: 0,
    passes: 0,
    shotsMade: 0,
    shotsMissed: 0,
    intercepts: 0,
    deflections: 0,
    turnoversLost: 0,
    penalties: 0,
  };
}

function emptySide(): SideStats {
  return {
    possessionMs: 0,
    goals: 0,
    shotsAttempted: 0,
    intercepts: 0,
    deflections: 0,
    turnoversWon: 0,
    turnoversLost: 0,
    penalties: 0,
    centrePasses: 0,
    byPosition: POSITIONS.reduce((acc, p) => {
      acc[p] = emptyLine("");
      acc[p].positions.push(p);
      return acc;
    }, {} as Record<Position, PlayerLine>),
    byPlayer: {},
  };
}

function ensurePlayer(s: SideStats, name: string, position: Position): PlayerLine | null {
  const clean = name?.trim();
  if (!clean) return null;
  const key = clean.toLowerCase();
  let p = s.byPlayer[key];
  if (!p) {
    p = emptyLine(clean);
    s.byPlayer[key] = p;
  }
  if (!p.positions.includes(position)) p.positions.push(position);
  return p;
}

export function deriveStats(state: MatchState, nowMs: number = Date.now()): Derived {
  const lhc = emptySide();
  const opp = emptySide();
  const byQuarter: Derived["byQuarter"] = {
    1: { lhcGoals: 0, oppGoals: 0 },
    2: { lhcGoals: 0, oppGoals: 0 },
    3: { lhcGoals: 0, oppGoals: 0 },
    4: { lhcGoals: 0, oppGoals: 0 },
  };
  let lastGoal: Derived["lastGoal"];
  let pendingCentrePass: Side | undefined;
  let cpTaker: Derived["cpTaker"];

  // Court third lookup from position (LHC-relative)
  const thirdOf = (p: Position): "attack" | "centre" | "defence" => {
    if (p === "GS" || p === "GA") return "attack";
    if (p === "GD" || p === "GK") return "defence";
    return "centre";
  };
  const byThird = { lhcAttack: 0, centre: 0, lhcDefence: 0 };

  // CP conversion tracking
  const cpConversion = { lhcMade: 0, lhcTotal: 0, oppMade: 0, oppTotal: 0 };
  let cpInProgress: Side | undefined;

  // Track current LHC lineup as we walk events.
  // Opposition has no names tracked.
  let currentLineup: Lineup = { ...state.lineup };
  // Override with first lineup event if there is one (start of match).
  const firstLineup = state.events.find((e) => e.type === "lineup");
  if (firstLineup && firstLineup.type === "lineup") {
    currentLineup = { ...firstLineup.lineup };
  }

  // Open possession span tracking
  let open: { side: Side; position: Position; t: number; playerName: string } | null = null;
  const closeSpan = (endAt: number) => {
    if (!open) return;
    const duration = Math.min(Math.max(0, endAt - open.t), MAX_POSSESSION_SPAN_MS);
    const s = open.side === "lhc" ? lhc : opp;
    s.possessionMs += duration;
    s.byPosition[open.position].possessionMs += duration;
    if (open.side === "lhc" && open.playerName) {
      const p = ensurePlayer(s, open.playerName, open.position);
      if (p) p.possessionMs += duration;
    }
    // Credit the court third (LHC perspective)
    const t = thirdOf(open.position);
    if (open.side === "lhc") {
      if (t === "attack") byThird.lhcAttack += duration;
      else if (t === "defence") byThird.lhcDefence += duration;
      else byThird.centre += duration;
    } else {
      // Opposition's attack = LHC's defence (mirrored)
      if (t === "attack") byThird.lhcDefence += duration;
      else if (t === "defence") byThird.lhcAttack += duration;
      else byThird.centre += duration;
    }
    open = null;
  };

  for (const e of state.events) {
    switch (e.type) {
      case "lineup":
        currentLineup = { ...e.lineup };
        break;
      case "centre_pass": {
        (e.side === "lhc" ? lhc : opp).centrePasses += 1;
        pendingCentrePass = e.side;
        cpInProgress = e.side;
        if (e.side === "lhc") cpConversion.lhcTotal += 1;
        else cpConversion.oppTotal += 1;
        cpTaker = undefined; // reset until we see the taker
        break;
      }
      case "possession": {
        closeSpan(e.t);
        const playerName = e.side === "lhc" ? currentLineup[e.position] || "" : "";
        open = { side: e.side, position: e.position, t: e.t, playerName };
        // If a centre pass is pending and this possession is for the
        // holding side, this is the centre pass taker.
        if (pendingCentrePass === e.side && !cpTaker) {
          cpTaker = { side: e.side, position: e.position, at: e.t };
        }
        // A possession event on the centre-pass-holding side resolves the pending CP
        if (pendingCentrePass === e.side) pendingCentrePass = undefined;
        // If a CP is in progress and the OTHER side gets the ball, the CP was lost
        if (cpInProgress && cpInProgress !== e.side) cpInProgress = undefined;
        break;
      }
      case "pass": {
        const s = e.side === "lhc" ? lhc : opp;
        s.byPosition[e.from].passes += 1;
        if (e.side === "lhc") {
          const fromPlayer = currentLineup[e.from];
          if (fromPlayer) {
            const p = ensurePlayer(s, fromPlayer, e.from);
            if (p) p.passes += 1;
          }
        }
        break;
      }
      case "shot": {
        const s = e.side === "lhc" ? lhc : opp;
        s.shotsAttempted += 1;
        if (e.made) {
          s.goals += 1;
          s.byPosition[e.position].shotsMade += 1;
          byQuarter[e.q][e.side === "lhc" ? "lhcGoals" : "oppGoals"] += 1;
          if (e.side === "lhc") {
            const playerName = currentLineup[e.position];
            if (playerName) {
              const p = ensurePlayer(s, playerName, e.position);
              if (p) p.shotsMade += 1;
            }
          }
          // CP conversion: if a centre pass was still in progress for THIS
          // side and they just scored, count it as a made conversion.
          if (cpInProgress === e.side) {
            if (e.side === "lhc") cpConversion.lhcMade += 1;
            else cpConversion.oppMade += 1;
          }
          cpInProgress = undefined;
          lastGoal = { side: e.side, position: e.position, at: e.t };
          closeSpan(e.t);
        } else {
          s.byPosition[e.position].shotsMissed += 1;
          if (e.side === "lhc") {
            const playerName = currentLineup[e.position];
            if (playerName) {
              const p = ensurePlayer(s, playerName, e.position);
              if (p) p.shotsMissed += 1;
            }
          }
        }
        break;
      }
      case "intercept": {
        const s = e.side === "lhc" ? lhc : opp;
        const otherSide = e.side === "lhc" ? opp : lhc;
        s.intercepts += 1;
        s.turnoversWon += 1;
        otherSide.turnoversLost += 1;
        s.byPosition[e.position].intercepts += 1;
        if (e.side === "lhc") {
          const playerName = currentLineup[e.position];
          if (playerName) {
            const p = ensurePlayer(s, playerName, e.position);
            if (p) p.intercepts += 1;
          }
        }
        // If the CP holder just lost the ball, CP conversion fails
        if (cpInProgress && cpInProgress !== e.side) cpInProgress = undefined;
        break;
      }
      case "deflection": {
        const s = e.side === "lhc" ? lhc : opp;
        s.deflections += 1;
        s.byPosition[e.position].deflections += 1;
        if (e.side === "lhc") {
          const playerName = currentLineup[e.position];
          if (playerName) {
            const p = ensurePlayer(s, playerName, e.position);
            if (p) p.deflections += 1;
          }
        }
        break;
      }
      case "turnover_lost": {
        const s = e.side === "lhc" ? lhc : opp;
        const otherSide = e.side === "lhc" ? opp : lhc;
        s.turnoversLost += 1;
        otherSide.turnoversWon += 1;
        s.byPosition[e.position].turnoversLost += 1;
        if (e.side === "lhc") {
          const playerName = currentLineup[e.position];
          if (playerName) {
            const p = ensurePlayer(s, playerName, e.position);
            if (p) p.turnoversLost += 1;
          }
        }
        if (cpInProgress === e.side) cpInProgress = undefined;
        closeSpan(e.t);
        break;
      }
      case "penalty": {
        const s = e.side === "lhc" ? lhc : opp;
        s.penalties += 1;
        s.byPosition[e.position].penalties += 1;
        if (e.side === "lhc") {
          const playerName = currentLineup[e.position];
          if (playerName) {
            const p = ensurePlayer(s, playerName, e.position);
            if (p) p.penalties += 1;
          }
        }
        break;
      }
      case "quarter_end":
        closeSpan(e.t);
        break;
      case "match_start":
      case "quarter_start":
        break;
    }
  }

  // Live close if match is running
  if (open && state.running) {
    closeSpan(Math.min(nowMs, open.t + MAX_POSSESSION_SPAN_MS));
  } else if (open && !state.running) {
    // Match paused: don't extend the open possession further
    closeSpan(open.t);
  }

  // Wire LHC player names onto positions in byPosition for display
  for (const pos of POSITIONS) {
    const name = currentLineup[pos];
    if (name) lhc.byPosition[pos].name = name;
  }

  return { lhc, opp, byQuarter, lastGoal, pendingCentrePass, byThird, cpConversion, cpTaker };
}

export function fmtMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtRemaining(elapsedMs: number, quarterLengthMs: number): string {
  return fmtMs(Math.max(0, quarterLengthMs - elapsedMs));
}

// For B&F suggestion only — simple weighted score.
export function pomScore(p: PlayerLine): number {
  return (
    p.shotsMade * 3 +
    p.intercepts * 2 +
    p.deflections * 1 +
    (p.possessionMs / 60_000) * 0.25 -
    p.turnoversLost * 1 -
    p.penalties * 0.5
  );
}
