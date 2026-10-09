import { randomUUID } from "node:crypto";

export type DryRunTeam = {
  id: string;
  team_name: string;
  password_code: string;
  progress_status: Record<string, unknown>;
  created_at: string;
};

type DryRunState = { teams: DryRunTeam[] };
const stateKey = "__deadAirDryRunState";
const shared = globalThis as typeof globalThis & { [stateKey]?: DryRunState };
const state = shared[stateKey] ?? (shared[stateKey] = { teams: [] });

export function allDryRunTeams() {
  return [...state.teams].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function findDryRunTeam(teamName: string, passwordCode?: string) {
  return state.teams.find((team) => team.team_name.toLowerCase() === teamName.trim().toLowerCase() && (passwordCode === undefined || team.password_code === passwordCode.trim())) ?? null;
}

export function getDryRunTeam(id: string) {
  return state.teams.find((team) => team.id === id) ?? null;
}

export function createDryRunTeam(teamName: string, passwordCode: string): DryRunTeam {
  const team = {
    id: randomUUID(),
    team_name: teamName.trim(),
    password_code: passwordCode,
    progress_status: { status: "Registered", winner: false },
    created_at: new Date().toISOString(),
  };
  state.teams.push(team);
  return team;
}

export function patchDryRunTeam(id: string, patch: Partial<DryRunTeam>) {
  const index = state.teams.findIndex((team) => team.id === id);
  if (index < 0) return null;
  state.teams[index] = { ...state.teams[index], ...patch };
  return state.teams[index];
}

export function deleteDryRunTeam(id: string) {
  const index = state.teams.findIndex((team) => team.id === id);
  if (index < 0) return false;
  state.teams.splice(index, 1);
  return true;
}

export function replaceDryRunTeams(teams: DryRunTeam[]) {
  state.teams = teams;
}
