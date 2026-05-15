"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { deriveStats } from "@/lib/stats";
import { POSITIONS, Position, SHOOTERS, Side } from "@/lib/types";
import { TopBar } from "@/components/TopBar";
import { Scoreboard } from "@/components/Scoreboard";
import { PositionGrid } from "@/components/PositionGrid";
import { ActionSheet, ActionKind } from "@/components/ActionSheet";
import { Setup } from "@/components/Setup";
import { Stats } from "@/components/Stats";
import { FixSheet } from "@/components/FixSheet";
import { GoalToast } from "@/components/GoalToast";

type Screen = "track" | "setup" | "stats";

export default function Page() {
  const s = useStore();
  const [screen, setScreen] = useState<Screen>("track");
  const [actionFor, setActionFor] = useState<{ side: Side; position: Position } | null>(null);
  const [fixOpen, setFixOpen] = useState(false);

  if (!s.match || !s.squad || !s.division) {
    return <main className="min-h-screen flex items-center justify-center text-cream/50">Loading…</main>;
  }

  const matchStarted = s.match.events.some((e) => e.type === "match_start");
  // Force setup screen until the match has started
  const effectiveScreen: Screen = !matchStarted && screen === "track" ? "setup" : screen;

  const derived = deriveStats(s.match);
  const currentPossession = (() => {
    // Find last possession event whose side is still active (not closed by shot/turnover)
    const events = s.match.events;
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.type === "possession") return { side: e.side, position: e.position };
      if (e.type === "shot" && e.made) return undefined;
      if (e.type === "turnover_lost") return undefined;
      if (e.type === "centre_pass") return undefined;
    }
    return undefined;
  })();

  // SETUP ---------------------------------------------------------------
  if (effectiveScreen === "setup") {
    return (
      <Setup
        lhcName={s.match.lhcName}
        oppName={s.match.oppName}
        lineup={s.match.lineup}
        captain={s.match.captain}
        coinTossWinner={s.match.coinTossWinner}
        squad={s.squad}
        matchStarted={matchStarted}
        currentQuarter={s.match.currentQuarter}
        onLhcName={s.setLhcName}
        onOppName={s.setOppName}
        onLineup={s.setLineup}
        onCaptain={s.setCaptain}
        onCoinTossWinner={s.setCoinTossWinner}
        onSquadAdd={s.squadAddPlayer}
        onSquadUpdate={s.squadUpdatePlayer}
        onSquadRemove={s.squadRemovePlayer}
        onSquadTeamName={s.squadSetTeamName}
        onStart={() => { s.startMatch(); setScreen("track"); }}
        onResume={() => setScreen("track")}
        onReset={() => { if (confirm("Reset the current match? This cannot be undone.")) { s.resetMatch(); }}}
      />
    );
  }

  // STATS ---------------------------------------------------------------
  if (effectiveScreen === "stats") {
    return (
      <Stats
        match={s.match}
        derived={derived}
        saved={s.saved}
        division={s.division}
        squadPlayers={s.squad.players}
        onBack={() => setScreen("track")}
        onReset={() => { if (confirm("Reset the current match? This cannot be undone.")) { s.resetMatch(); setScreen("setup"); }}}
        onSetVote={s.setVote}
        onAddTeam={s.divAddTeam}
        onRemoveTeam={s.divRemoveTeam}
        onSetDivisionName={s.divSetName}
        onAddManual={s.divAddManual}
        onRemoveManual={s.divRemoveManual}
        onRemoveSaved={s.removeSavedMatch}
      />
    );
  }

  // LIVE TRACKING -------------------------------------------------------
  const handleTap = (side: Side, position: Position) => {
    s.tapPlayer(side, position);
  };
  const handleDoubleTap = (side: Side, position: Position) => {
    if (!s.match!.running) return;
    setActionFor({ side, position });
  };

  const handleAction = (kind: ActionKind) => {
    if (!actionFor) return;
    const { side, position } = actionFor;
    switch (kind) {
      case "goal": s.logShot(side, position, true); break;
      case "miss": s.logShot(side, position, false); break;
      case "intercept": s.logIntercept(side, position); break;
      case "deflection": s.logDeflection(side, position); break;
      case "turnover": s.logTurnoverLost(side, position); break;
      case "penalty": s.logPenalty(side, position); break;
    }
    setActionFor(null);
  };

  const onFinish = () => {
    if (s.match!.currentQuarter < 4) return;
    s.finishMatch(derived.lhc.goals, derived.opp.goals);
    setScreen("stats");
  };

  const actionTeamName = actionFor?.side === "lhc" ? s.match.lhcName : s.match.oppName;
  const actionPlayerName = actionFor?.side === "lhc" ? s.match.lineup[actionFor.position] : undefined;
  const actionHasPossession = !!actionFor && currentPossession?.side === actionFor.side && currentPossession?.position === actionFor.position;

  // POM lookup for the goal toast (LHC only)
  const lastGoalPlayerName = derived.lastGoal && derived.lastGoal.side === "lhc"
    ? s.match.lineup[derived.lastGoal.position]
    : undefined;
  const lastGoalTeamName = derived.lastGoal?.side === "lhc" ? s.match.lhcName : s.match.oppName;
  const lastGoalIsTracked = derived.lastGoal?.side === "lhc";

  return (
    <main className="h-[100dvh] flex flex-col overflow-hidden">
      <TopBar
        quarter={s.match.currentQuarter}
        elapsedMs={s.elapsedMs()}
        running={s.match.running}
        onStartPause={() => { if (s.match!.running) s.pauseMatch(); else s.startMatch(); }}
        onSetup={() => setScreen("setup")}
        onFix={() => setFixOpen(true)}
        onNext={() => { if (s.match!.currentQuarter >= 4) onFinish(); else s.advanceQuarter(); }}
        onStats={() => setScreen("stats")}
      />
      <Scoreboard lhcName={s.match.lhcName} oppName={s.match.oppName} lhc={derived.lhc} opp={derived.opp} />

      <div className="flex-1 flex flex-col gap-2.5 p-2.5 min-h-0 overflow-y-auto">
        <PositionGrid
          side="lhc"
          teamName={s.match.lhcName}
          stats={derived.lhc}
          lineup={s.match.lineup}
          currentPossession={currentPossession}
          isTracked={true}
          isLive={s.match.running}
          pendingCentrePass={derived.pendingCentrePass === "lhc"}
          captainName={s.match.captain}
          onTap={handleTap}
          onDoubleTap={handleDoubleTap}
        />
        <PositionGrid
          side="opp"
          teamName={s.match.oppName}
          stats={derived.opp}
          currentPossession={currentPossession}
          isTracked={false}
          isLive={s.match.running}
          pendingCentrePass={derived.pendingCentrePass === "opp"}
          onTap={handleTap}
          onDoubleTap={handleDoubleTap}
        />
      </div>

      <footer className="border-t border-gold/30 bg-navy py-2 px-3 text-[10px] uppercase tracking-widest text-cream/50 text-center">
        {s.match.running ? (
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-gold font-bold">TAP</span> = they have the ball</div>
            <div><span className="text-gold font-bold">DOUBLE-TAP</span> = action menu</div>
          </div>
        ) : (
          <div className="text-red-300">⏸ Paused — tap <span className="text-emerald-300 font-bold">START</span> in the top bar</div>
        )}
      </footer>

      {actionFor && (
        <ActionSheet
          side={actionFor.side}
          position={actionFor.position}
          playerName={actionPlayerName}
          teamName={actionTeamName || ""}
          isTracked={actionFor.side === "lhc"}
          hasPossession={actionHasPossession}
          onPick={handleAction}
          onClose={() => setActionFor(null)}
        />
      )}

      {fixOpen && (
        <FixSheet match={s.match} onRemove={s.removeEvent} onClose={() => setFixOpen(false)} />
      )}

      <GoalToast lastGoal={derived.lastGoal} teamName={lastGoalTeamName} isTracked={!!lastGoalIsTracked} playerName={lastGoalPlayerName} />
    </main>
  );
}
