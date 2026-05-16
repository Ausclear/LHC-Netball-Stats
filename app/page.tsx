"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { deriveStats } from "@/lib/stats";
import { POSITIONS, Position, Quarter, SHOOTERS, Side } from "@/lib/types";
import { TopBar } from "@/components/TopBar";
import { Scoreboard } from "@/components/Scoreboard";
import { PositionGrid } from "@/components/PositionGrid";
import { Setup } from "@/components/Setup";
import { Stats } from "@/components/Stats";
import { FixSheet } from "@/components/FixSheet";
import { GoalToast } from "@/components/GoalToast";
import { SwapSheet } from "@/components/SwapSheet";
import { QuarterLineupSheet } from "@/components/QuarterLineupSheet";
import { ConfirmModal } from "@/components/ConfirmModal";
import { QuickActionBar } from "@/components/QuickActionBar";

type Screen = "track" | "setup" | "stats";

export default function Page() {
  const s = useStore();
  const [screen, setScreen] = useState<Screen>("track");
  const [fixOpen, setFixOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [quarterSheet, setQuarterSheet] = useState<Quarter | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pickMode, setPickMode] = useState<"intercept" | "deflection" | null>(null);

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
      <>
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
          onReset={() => setConfirmReset(true)}
        />
        {confirmReset && (
          <ConfirmModal
            title="Reset Match?"
            body="This will clear all events and stats from the current match. This cannot be undone."
            confirmLabel="Reset"
            cancelLabel="Cancel"
            destructive
            onConfirm={() => { s.resetMatch(); setConfirmReset(false); }}
            onCancel={() => setConfirmReset(false)}
          />
        )}
      </>
    );
  }

  // STATS ---------------------------------------------------------------
  if (effectiveScreen === "stats") {
    return (
      <>
        <Stats
          match={s.match}
          derived={derived}
          saved={s.saved}
          division={s.division}
          squadPlayers={s.squad.players}
          onBack={() => setScreen("track")}
          onReset={() => setConfirmReset(true)}
          onSetVote={s.setVote}
          onAddTeam={s.divAddTeam}
          onRemoveTeam={s.divRemoveTeam}
          onSetDivisionName={s.divSetName}
          onAddManual={s.divAddManual}
          onRemoveManual={s.divRemoveManual}
          onRemoveSaved={s.removeSavedMatch}
        />
        {confirmReset && (
          <ConfirmModal
            title="Reset Match?"
            body="This will clear all events and stats from the current match. This cannot be undone."
            confirmLabel="Reset"
            cancelLabel="Cancel"
            destructive
            onConfirm={() => { s.resetMatch(); setConfirmReset(false); setScreen("setup"); }}
            onCancel={() => setConfirmReset(false)}
          />
        )}
      </>
    );
  }

  // LIVE TRACKING -------------------------------------------------------
  const handleTap = (side: Side, position: Position) => {
    if (!s.match!.running) return;
    if (pickMode === "intercept") {
      s.logIntercept(side, position);
      setPickMode(null);
      return;
    }
    if (pickMode === "deflection") {
      s.logDeflection(side, position);
      setPickMode(null);
      return;
    }
    s.tapPlayer(side, position);
  };
  // Kept as a no-op so PositionGrid's existing double-tap prop still wires.
  // We never open the action sheet anymore.
  const handleDoubleTap = (_side: Side, _position: Position) => {};

  const onFinish = () => {
    if (s.match!.currentQuarter < 4) return;
    s.finishMatch(derived.lhc.goals, derived.opp.goals);
    setScreen("stats");
  };

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
        onNext={() => {
          if (s.match!.currentQuarter >= 4) { onFinish(); return; }
          const next = (s.match!.currentQuarter + 1) as Quarter;
          setQuarterSheet(next);
        }}
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
          cpTaker={derived.cpTaker}
          captainName={s.match.captain}
          onTap={handleTap}
          onDoubleTap={handleDoubleTap}
          onHeaderTap={() => setSwapOpen(true)}
        />
        <PositionGrid
          side="opp"
          teamName={s.match.oppName}
          stats={derived.opp}
          currentPossession={currentPossession}
          isTracked={false}
          isLive={s.match.running}
          pendingCentrePass={derived.pendingCentrePass === "opp"}
          cpTaker={derived.cpTaker}
          onTap={handleTap}
          onDoubleTap={handleDoubleTap}
        />
      </div>

      {/* Context-aware quick-action bar — sits below the opposition grid
          and operates on whichever player currently has the ball. */}
      {s.match.running && (
        <QuickActionBar
          side={currentPossession?.side}
          position={currentPossession?.position}
          playerName={
            currentPossession?.side === "lhc"
              ? s.match.lineup[currentPossession.position]
              : undefined
          }
          teamName={
            currentPossession?.side === "lhc"
              ? s.match.lhcName
              : currentPossession?.side === "opp"
              ? s.match.oppName
              : undefined
          }
          centrePassHint={
            !currentPossession && derived.pendingCentrePass
              ? `${derived.pendingCentrePass === "lhc" ? s.match.lhcName : s.match.oppName} to take centre pass`
              : undefined
          }
          pickMode={pickMode}
          onCancelPick={() => setPickMode(null)}
          onAction={(kind) => {
            if (kind === "intercept_pick") { setPickMode("intercept"); return; }
            if (kind === "deflection_pick") { setPickMode("deflection"); return; }
            if (!currentPossession) return;
            const { side, position } = currentPossession;
            if (kind === "goal") s.logShot(side, position, true);
            else if (kind === "miss") s.logShot(side, position, false);
            else if (kind === "turnover") s.logTurnoverLost(side, position);
            else if (kind === "penalty") s.logPenalty(side, position);
          }}
        />
      )}

      <footer className="border-t border-gold/30 bg-navy py-2 px-3 text-[10px] uppercase tracking-widest text-cream/50 text-center">
        {s.match.running ? (
          <div><span className="text-gold font-bold">TAP</span> a player to log possession · use the <span className="text-gold font-bold">QUICK BAR</span> for actions</div>
        ) : (
          <div className="text-red-300">⏸ Paused — tap <span className="text-emerald-300 font-bold">START</span> in the top bar</div>
        )}
      </footer>

      {fixOpen && (
        <FixSheet match={s.match} onRemove={s.removeEvent} onClose={() => setFixOpen(false)} />
      )}

      <GoalToast lastGoal={derived.lastGoal} teamName={lastGoalTeamName} isTracked={!!lastGoalIsTracked} playerName={lastGoalPlayerName} />

      {swapOpen && (
        <SwapSheet
          teamName={s.match.lhcName}
          lineup={s.match.lineup}
          onSwap={(a, b) => { s.swapPositions(a, b); setSwapOpen(false); }}
          onClose={() => setSwapOpen(false)}
        />
      )}

      {quarterSheet && (
        <QuarterLineupSheet
          nextQuarter={quarterSheet}
          teamName={s.match.lhcName}
          currentLineup={s.match.lineup}
          squadNames={s.squad.players.filter(Boolean)}
          onConfirm={(newLineup) => {
            s.setLineup(newLineup);
            s.advanceQuarter();
            setQuarterSheet(null);
          }}
          onSkip={() => { s.advanceQuarter(); setQuarterSheet(null); }}
          onCancel={() => setQuarterSheet(null)}
        />
      )}

      {confirmReset && (
        <ConfirmModal
          title="Reset Match?"
          body="This will clear all events and stats from the current match. This cannot be undone."
          confirmLabel="Reset"
          cancelLabel="Cancel"
          destructive
          onConfirm={() => { s.resetMatch(); setConfirmReset(false); setScreen("setup"); }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </main>
  );
}
