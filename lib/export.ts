import { GameEvent, MatchState } from "./types";
import { deriveStats, fmtMs } from "./stats";

function csvEscape(s: string | number): string {
  const str = String(s);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportSummaryCsv(m: MatchState): string {
  const d = deriveStats(m);
  const rows: (string | number)[][] = [];
  rows.push(["Match Summary"]);
  rows.push(["Date", new Date(m.createdAt).toISOString()]);
  rows.push(["Home", m.lhcName, "Goals", d.lhc.goals]);
  rows.push(["Away", m.oppName, "Goals", d.opp.goals]);
  rows.push([]);
  rows.push(["Quarter scores"]);
  rows.push(["Q", m.lhcName, m.oppName]);
  for (let q = 1 as 1 | 2 | 3 | 4; q <= 4; q++) {
    rows.push([`Q${q}`, d.byQuarter[q as 1 | 2 | 3 | 4].lhcGoals, d.byQuarter[q as 1 | 2 | 3 | 4].oppGoals]);
  }
  rows.push([]);
  rows.push(["LHC Players"]);
  rows.push(["Name", "Positions", "Possession", "Shots Made", "Shots Missed", "Intercepts", "Deflections", "Turnovers Lost", "Penalties"]);
  for (const p of Object.values(d.lhc.byPlayer)) {
    rows.push([p.name, p.positions.join("|"), fmtMs(p.possessionMs), p.shotsMade, p.shotsMissed, p.intercepts, p.deflections, p.turnoversLost, p.penalties]);
  }
  rows.push([]);
  rows.push(["LHC By Position"]);
  rows.push(["Pos", "Possession", "Shots Made", "Shots Missed", "Intercepts", "Deflections", "Turnovers Lost", "Penalties"]);
  for (const pos of ["GS", "GA", "WA", "C", "WD", "GD", "GK"] as const) {
    const p = d.lhc.byPosition[pos];
    rows.push([pos, fmtMs(p.possessionMs), p.shotsMade, p.shotsMissed, p.intercepts, p.deflections, p.turnoversLost, p.penalties]);
  }
  rows.push([]);
  rows.push(["Opposition By Position"]);
  rows.push(["Pos", "Possession", "Shots Made", "Shots Missed", "Intercepts", "Deflections", "Turnovers Lost", "Penalties"]);
  for (const pos of ["GS", "GA", "WA", "C", "WD", "GD", "GK"] as const) {
    const p = d.opp.byPosition[pos];
    rows.push([pos, fmtMs(p.possessionMs), p.shotsMade, p.shotsMissed, p.intercepts, p.deflections, p.turnoversLost, p.penalties]);
  }
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

export function exportEventsCsv(m: MatchState): string {
  const rows: (string | number)[][] = [];
  rows.push(["Timestamp", "Quarter", "Type", "Side", "Position", "Detail"]);
  for (const e of m.events) {
    const ts = new Date((e as any).t).toISOString();
    const q = (e as any).q;
    const side = "side" in e ? (e.side === "lhc" ? "LHC" : "Opp") : "";
    const detail = (() => {
      switch (e.type) {
        case "shot": return `${e.position} ${e.made ? "GOAL" : "MISS"}`;
        case "pass": return `${e.from} → ${e.to}`;
        case "lineup": return Object.entries(e.lineup).map(([p, n]) => `${p}:${n}`).join("|");
        default: return "position" in e ? (e as any).position : "";
      }
    })();
    const pos = "position" in e ? (e as any).position : "";
    rows.push([ts, q, e.type, side, pos, detail]);
  }
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

export function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
