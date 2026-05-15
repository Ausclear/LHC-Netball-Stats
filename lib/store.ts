"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_DIVISION,
  DEFAULT_SQUAD,
  Division,
  GameEvent,
  Lineup,
  ManualResult,
  MatchState,
  Position,
  QUARTER_LENGTH_MS,
  Quarter,
  SavedMatch,
  Side,
  Squad,
  newMatchState,
} from "./types";

const STORAGE = {
  match: "lhc.match.v2",
  squad: "lhc.squad.v2",
  division: "lhc.division.v2",
  saved: "lhc.saved.v2",
};

function uid() { return Math.random().toString(36).slice(2, 10); }

function safeLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function safeSave<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function useStore() {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [division, setDivision] = useState<Division | null>(null);
  const [saved, setSaved] = useState<SavedMatch[]>([]);

  // Live tick — re-render once per second when running for clock + possession.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!match?.running) return;
    const id = setInterval(() => setTick((x) => x + 1), 500);
    return () => clearInterval(id);
  }, [match?.running]);

  // Hydrate on mount.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    let m = safeLoad<MatchState | null>(STORAGE.match, null);
    if (!m) m = newMatchState();
    // ALWAYS restore paused — wall-clock drift while app was closed must
    // not silently accumulate possession time.
    if (m.running) m.running = false;
    if (m.quarterStartedAt) m.quarterStartedAt = undefined;
    setMatch(m);

    const sq = safeLoad<Squad>(STORAGE.squad, DEFAULT_SQUAD);
    setSquad(sq);

    const div = safeLoad<Division>(STORAGE.division, DEFAULT_DIVISION);
    setDivision(div);

    const sv = safeLoad<SavedMatch[]>(STORAGE.saved, []);
    setSaved(sv);
  }, []);

  // Persist on change.
  useEffect(() => { if (match) safeSave(STORAGE.match, match); }, [match]);
  useEffect(() => { if (squad) safeSave(STORAGE.squad, squad); }, [squad]);
  useEffect(() => { if (division) safeSave(STORAGE.division, division); }, [division]);
  useEffect(() => { safeSave(STORAGE.saved, saved); }, [saved]);

  // ----------------------------------------------------------------
  // Live elapsed (in milliseconds, in current quarter)
  // ----------------------------------------------------------------
  const elapsedMs = (m: MatchState | null = match): number => {
    if (!m) return 0;
    let elapsed = m.quarterElapsedMs;
    if (m.running && m.quarterStartedAt) {
      elapsed += Date.now() - m.quarterStartedAt;
    }
    return Math.min(elapsed, QUARTER_LENGTH_MS);
  };

  // ----------------------------------------------------------------
  // Append a single event with the right metadata
  // ----------------------------------------------------------------
  const appendEvent = useCallback(
    (e: Omit<GameEvent, "id" | "t" | "q">) => {
      setMatch((prev) => {
        if (!prev) return prev;
        const full: GameEvent = { ...(e as any), id: uid(), t: Date.now(), q: prev.currentQuarter };
        return { ...prev, events: [...prev.events, full] };
      });
    },
    []
  );

  // ----------------------------------------------------------------
  // Match control
  // ----------------------------------------------------------------
  const startMatch = useCallback(() => {
    setMatch((prev) => {
      if (!prev) return prev;
      // If no match_start has been logged, this is the first start
      const isFirstStart = !prev.events.some((e) => e.type === "match_start");
      const now = Date.now();
      const events = [...prev.events];
      if (isFirstStart) {
        events.push({ id: uid(), t: now, q: 1, type: "match_start" });
        events.push({ id: uid(), t: now, q: 1, type: "quarter_start" });
        events.push({ id: uid(), t: now, q: 1, type: "lineup", lineup: { ...prev.lineup } });
        // Q1 first centre to coin-toss winner
        events.push({
          id: uid(), t: now + 1, q: 1, type: "centre_pass",
          side: prev.coinTossWinner,
        });
      }
      return {
        ...prev,
        events,
        running: true,
        quarterStartedAt: now,
      };
    });
  }, []);

  const pauseMatch = useCallback(() => {
    setMatch((prev) => {
      if (!prev || !prev.running) return prev;
      const now = Date.now();
      const startedAt = prev.quarterStartedAt ?? now;
      const newElapsed = Math.min(prev.quarterElapsedMs + (now - startedAt), QUARTER_LENGTH_MS);
      return { ...prev, running: false, quarterStartedAt: undefined, quarterElapsedMs: newElapsed };
    });
  }, []);

  const advanceQuarter = useCallback(() => {
    setMatch((prev) => {
      if (!prev) return prev;
      if (prev.currentQuarter >= 4) return prev;
      const nextQ = (prev.currentQuarter + 1) as Quarter;
      const now = Date.now();
      const events = [...prev.events,
        { id: uid(), t: now, q: prev.currentQuarter, type: "quarter_end" as const },
        { id: uid(), t: now, q: nextQ, type: "quarter_start" as const },
      ];
      // Q1/Q3 → coin toss winner; Q2/Q4 → other team
      const winner = prev.coinTossWinner;
      const other: Side = winner === "lhc" ? "opp" : "lhc";
      const cpSide: Side = nextQ === 1 || nextQ === 3 ? winner : other;
      events.push({ id: uid(), t: now + 1, q: nextQ, type: "centre_pass", side: cpSide });
      return {
        ...prev,
        currentQuarter: nextQ,
        quarterElapsedMs: 0,
        quarterStartedAt: prev.running ? now : undefined,
        events,
      };
    });
  }, []);

  // ----------------------------------------------------------------
  // High-level actions
  // ----------------------------------------------------------------
  const tapPlayer = useCallback((side: Side, position: Position) => {
    setMatch((prev) => {
      if (!prev || !prev.running) return prev;
      // Find the most recent possession event to determine if this is a pass
      const lastPoss = [...prev.events].reverse().find((e) => e.type === "possession") as
        | (GameEvent & { type: "possession" })
        | undefined;
      // Skip duplicates
      if (lastPoss && lastPoss.side === side && lastPoss.position === position) return prev;
      const newEvents: GameEvent[] = [...prev.events];
      if (lastPoss && lastPoss.side === side && lastPoss.position !== position) {
        newEvents.push({ id: uid(), t: Date.now(), q: prev.currentQuarter, type: "pass", side, from: lastPoss.position, to: position });
      }
      newEvents.push({ id: uid(), t: Date.now(), q: prev.currentQuarter, type: "possession", side, position });
      return { ...prev, events: newEvents };
    });
  }, []);

  const logShot = useCallback((side: Side, position: Position, made: boolean) => {
    setMatch((prev) => {
      if (!prev) return prev;
      const now = Date.now();
      const events: GameEvent[] = [
        ...prev.events,
        { id: uid(), t: now, q: prev.currentQuarter, type: "shot", side, position, made },
      ];
      // On a made goal, append the next centre pass to the OPPOSITE side
      // of the last centre pass. Netball rule: centres alternate after
      // every goal, regardless of who scored.
      if (made) {
        let lastCp: Side | undefined;
        for (let i = prev.events.length - 1; i >= 0; i--) {
          const e = prev.events[i];
          if (e.type === "centre_pass") { lastCp = e.side; break; }
        }
        const nextCp: Side = lastCp
          ? (lastCp === "lhc" ? "opp" : "lhc")
          : prev.coinTossWinner;
        events.push({
          id: uid(), t: now + 1, q: prev.currentQuarter,
          type: "centre_pass", side: nextCp,
        });
      }
      return { ...prev, events };
    });
  }, []);

  const logIntercept = useCallback((side: Side, position: Position) => {
    setMatch((prev) => {
      if (!prev) return prev;
      const events = [...prev.events];
      // If the most recent possession event is for this same player, that
      // possession was logged by the single-tap part of a double-tap (the
      // user tapped a defender as they intercepted; we then opened the
      // action menu via double-tap). Strip that bare possession and
      // replace with intercept + possession in order, so stats credit
      // the intercept properly.
      const lastIdx = (() => {
        for (let i = events.length - 1; i >= 0; i--) {
          const e = events[i];
          if (e.type === "possession") return i;
          if (e.type === "shot" || e.type === "turnover_lost" || e.type === "centre_pass") return -1;
        }
        return -1;
      })();
      if (lastIdx >= 0) {
        const last = events[lastIdx] as GameEvent & { type: "possession" };
        if (last.side === side && last.position === position) {
          events.splice(lastIdx, 1);
        }
      }
      const t = Date.now();
      events.push({ id: uid(), t, q: prev.currentQuarter, type: "intercept", side, position });
      events.push({ id: uid(), t: t + 1, q: prev.currentQuarter, type: "possession", side, position });
      return { ...prev, events };
    });
  }, []);

  const logDeflection = useCallback((side: Side, position: Position) => {
    setMatch((prev) => {
      if (!prev) return prev;
      const events = [...prev.events];
      // Deflection: defender tipped it but possession may or may not still
      // be with them. Just append the deflection event.
      events.push({ id: uid(), t: Date.now(), q: prev.currentQuarter, type: "deflection", side, position });
      return { ...prev, events };
    });
  }, []);

  const logTurnoverLost = useCallback((side: Side, position: Position) => {
    appendEvent({ type: "turnover_lost", side, position } as any);
  }, [appendEvent]);

  const logPenalty = useCallback((side: Side, position: Position) => {
    appendEvent({ type: "penalty", side, position } as any);
  }, [appendEvent]);

  // ----------------------------------------------------------------
  // Match metadata setters
  // ----------------------------------------------------------------
  const setLhcName = useCallback((name: string) => setMatch((m) => m ? { ...m, lhcName: name } : m), []);
  const setOppName = useCallback((name: string) => setMatch((m) => m ? { ...m, oppName: name } : m), []);
  const setLineup = useCallback((lineup: Lineup) => setMatch((m) => {
    if (!m) return m;
    // De-dupe: a player can only hold one position
    const cleaned: Lineup = { ...lineup };
    const seen = new Set<string>();
    for (const p of (Object.keys(cleaned) as Position[])) {
      const name = cleaned[p];
      if (!name) continue;
      const k = name.toLowerCase();
      if (seen.has(k)) cleaned[p] = "";
      else seen.add(k);
    }
    // If the match has started, log a lineup event for stats partitioning
    const matchStarted = m.events.some((e) => e.type === "match_start");
    const events = [...m.events];
    if (matchStarted) {
      events.push({ id: uid(), t: Date.now(), q: m.currentQuarter, type: "lineup", lineup: cleaned });
    }
    return { ...m, lineup: cleaned, events };
  }), []);
  const setCaptain = useCallback((name: string) => setMatch((m) => m ? { ...m, captain: name || undefined } : m), []);
  const setCoinTossWinner = useCallback((side: Side) => setMatch((m) => m ? { ...m, coinTossWinner: side } : m), []);
  const setVote = useCallback((slot: "first" | "second", name: string) => setMatch((m) => {
    if (!m) return m;
    const votes = { ...(m.votes || {}) };
    if (!name) { delete votes[slot]; }
    else {
      votes[slot] = name;
      const other = slot === "first" ? "second" : "first";
      if (votes[other] === name) delete votes[other];
    }
    return { ...m, votes: votes.first || votes.second ? votes : undefined };
  }), []);

  const swapPositions = useCallback((posA: Position, posB: Position) => {
    setMatch((m) => {
      if (!m) return m;
      const nameA = m.lineup[posA];
      const nameB = m.lineup[posB];
      const lineup: Lineup = { ...m.lineup, [posA]: nameB, [posB]: nameA };
      const events = [...m.events];
      const matchStarted = m.events.some((e) => e.type === "match_start");
      if (matchStarted) {
        events.push({ id: uid(), t: Date.now(), q: m.currentQuarter, type: "lineup", lineup });
      }
      return { ...m, lineup, events };
    });
  }, []);

  // ----------------------------------------------------------------
  // Reset & finish
  // ----------------------------------------------------------------
  const resetMatch = useCallback(() => {
    setMatch((m) => {
      const base = newMatchState();
      if (m) {
        // Preserve team names and coin toss winner choice
        base.lhcName = m.lhcName;
        base.oppName = m.oppName;
        base.lineup = m.lineup;
        base.captain = m.captain;
        base.coinTossWinner = m.coinTossWinner;
      }
      return base;
    });
  }, []);

  const finishMatch = useCallback((lhcGoals: number, oppGoals: number) => {
    setMatch((prev) => {
      if (!prev) return prev;
      const sm: SavedMatch = {
        id: prev.id,
        createdAt: prev.createdAt,
        finishedAt: Date.now(),
        lhcName: prev.lhcName,
        oppName: prev.oppName,
        lhcGoals,
        oppGoals,
        captain: prev.captain,
        votes: prev.votes,
        events: prev.events,
      };
      setSaved((arr) => arr.some((x) => x.id === sm.id) ? arr : [...arr, sm]);
      return { ...prev, running: false, quarterStartedAt: undefined };
    });
  }, []);

  // Remove a single event (for FIX)
  const removeEvent = useCallback((eventId: string) => {
    setMatch((m) => m ? { ...m, events: m.events.filter((e) => e.id !== eventId) } : m);
  }, []);

  // ----------------------------------------------------------------
  // Squad CRUD
  // ----------------------------------------------------------------
  const squadAddPlayer = useCallback((name: string) => setSquad((s) => {
    if (!s) return s;
    const clean = name.trim();
    if (!clean) return s;
    if (s.players.some((p) => p.toLowerCase() === clean.toLowerCase())) return s;
    return { ...s, players: [...s.players, clean] };
  }), []);
  const squadRemovePlayer = useCallback((index: number) => setSquad((s) => {
    if (!s) return s;
    return { ...s, players: s.players.filter((_, i) => i !== index) };
  }), []);
  const squadUpdatePlayer = useCallback((index: number, name: string) => setSquad((s) => {
    if (!s) return s;
    const players = [...s.players];
    players[index] = name;
    return { ...s, players };
  }), []);
  const squadSetTeamName = useCallback((name: string) => setSquad((s) => s ? { ...s, teamName: name } : s), []);

  // ----------------------------------------------------------------
  // Division CRUD
  // ----------------------------------------------------------------
  const divSetName = useCallback((name: string) => setDivision((d) => d ? { ...d, name } : d), []);
  const divAddTeam = useCallback((name: string) => setDivision((d) => {
    if (!d) return d;
    const clean = name.trim();
    if (!clean || d.teams.some((t) => t.toLowerCase() === clean.toLowerCase())) return d;
    return { ...d, teams: [...d.teams, clean] };
  }), []);
  const divRemoveTeam = useCallback((name: string) => setDivision((d) => {
    if (!d) return d;
    return { ...d, teams: d.teams.filter((t) => t !== name) };
  }), []);
  const divAddManual = useCallback((r: Omit<ManualResult, "id">) => setDivision((d) => {
    if (!d) return d;
    return { ...d, manualResults: [...d.manualResults, { ...r, id: uid() }] };
  }), []);
  const divRemoveManual = useCallback((id: string) => setDivision((d) => {
    if (!d) return d;
    return { ...d, manualResults: d.manualResults.filter((r) => r.id !== id) };
  }), []);

  const removeSavedMatch = useCallback((id: string) => {
    setSaved((arr) => arr.filter((m) => m.id !== id));
  }, []);

  return {
    match, squad, division, saved,
    elapsedMs: () => elapsedMs(match),
    startMatch, pauseMatch, advanceQuarter, finishMatch, resetMatch,
    tapPlayer, logShot, logIntercept, logDeflection, logTurnoverLost, logPenalty,
    setLhcName, setOppName, setLineup, setCaptain, setCoinTossWinner, setVote,
    swapPositions,
    removeEvent,
    squadAddPlayer, squadRemovePlayer, squadUpdatePlayer, squadSetTeamName,
    divSetName, divAddTeam, divRemoveTeam, divAddManual, divRemoveManual,
    removeSavedMatch,
  };
}
