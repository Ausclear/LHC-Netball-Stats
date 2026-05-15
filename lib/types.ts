// Core domain types. Keep this file tiny.

export type Side = "lhc" | "opp";
export type Position = "GS" | "GA" | "WA" | "C" | "WD" | "GD" | "GK";
export type Quarter = 1 | 2 | 3 | 4;

export const POSITIONS: Position[] = ["GS", "GA", "WA", "C", "WD", "GD", "GK"];
export const SHOOTERS: Position[] = ["GS", "GA"];

export type Lineup = Record<Position, string>;

export const EMPTY_LINEUP: Lineup = {
  GS: "",
  GA: "",
  WA: "",
  C: "",
  WD: "",
  GD: "",
  GK: "",
};

// Every recorded event. Append-only.
export type GameEvent =
  | { id: string; t: number; q: Quarter; type: "match_start" }
  | { id: string; t: number; q: Quarter; type: "quarter_start" }
  | { id: string; t: number; q: Quarter; type: "quarter_end" }
  | { id: string; t: number; q: Quarter; type: "centre_pass"; side: Side }
  | { id: string; t: number; q: Quarter; type: "possession"; side: Side; position: Position }
  | { id: string; t: number; q: Quarter; type: "pass"; side: Side; from: Position; to: Position }
  | { id: string; t: number; q: Quarter; type: "shot"; side: Side; position: Position; made: boolean }
  | { id: string; t: number; q: Quarter; type: "intercept"; side: Side; position: Position }
  | { id: string; t: number; q: Quarter; type: "deflection"; side: Side; position: Position }
  | { id: string; t: number; q: Quarter; type: "turnover_lost"; side: Side; position: Position }
  | { id: string; t: number; q: Quarter; type: "penalty"; side: Side; position: Position }
  | { id: string; t: number; q: Quarter; type: "lineup"; lineup: Lineup };

export interface Squad {
  teamName: string;
  players: string[];
}

export const DEFAULT_SQUAD: Squad = {
  teamName: "Langhorne Creek",
  players: ["Cerise", "Ruby", "Charlotte", "Emily", "Sierra", "Eliza", "Bailey", "Laila"],
};

export interface MatchState {
  id: string;
  createdAt: number;
  lhcName: string;
  oppName: string;
  lineup: Lineup;            // current LHC lineup
  captain?: string;
  coinTossWinner: Side;      // who takes 1st CP of Q1
  currentQuarter: Quarter;
  events: GameEvent[];
  running: boolean;
  quarterStartedAt?: number; // wall-clock ms when current quarter started running
  quarterElapsedMs: number;  // accumulated elapsed ms in current quarter (only counts while running)
  votes?: { first?: string; second?: string };
}

export const QUARTER_LENGTH_MS = 15 * 60 * 1000;

export function newMatchState(): MatchState {
  return {
    id: Math.random().toString(36).slice(2, 10),
    createdAt: Date.now(),
    lhcName: "Langhorne Creek",
    oppName: "Opposition",
    lineup: { ...EMPTY_LINEUP },
    coinTossWinner: "lhc",
    currentQuarter: 1,
    events: [],
    running: false,
    quarterElapsedMs: 0,
  };
}

export interface SavedMatch {
  id: string;
  createdAt: number;
  finishedAt: number;
  lhcName: string;
  oppName: string;
  lhcGoals: number;
  oppGoals: number;
  captain?: string;
  votes?: { first?: string; second?: string };
  events: GameEvent[];
}

export interface Division {
  name: string;
  teams: string[];
  manualResults: ManualResult[];
}

export interface ManualResult {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
}

export const DEFAULT_DIVISION: Division = {
  name: "Inter 4",
  teams: ["Langhorne Creek"],
  manualResults: [],
};
