import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sessionCookie } from "@/lib/session";
import { findDryRunTeam, patchDryRunTeam } from "@/lib/dry-run-store";
import { isDryRun } from "@/lib/runtime-mode";

export async function POST(request: Request) {
  try {
    const { team_name, password_code } = await request.json();
    if (typeof team_name !== "string" || typeof password_code !== "string" || !team_name.trim() || !password_code.trim()) {
      return NextResponse.json({ error: "Enter your team name and password." }, { status: 400 });
    }
    if (isDryRun) {
      const team = findDryRunTeam(team_name, password_code);
      if (!team) return NextResponse.json({ error: "Team name or password was not recognized." }, { status: 401 });
      const progress = team.progress_status || {};
      if (!progress.winner && progress.status !== "Submitted" && progress.status !== "In progress") {
        patchDryRunTeam(team.id, { progress_status: { ...progress, status: "In progress", winner: false } });
      }
      const response = NextResponse.json({ team: { id: team.id, team_name: team.team_name } });
      response.cookies.set(sessionCookie(team.id));
      return response;
    }
    const db = supabaseAdmin();
    const { data, error } = await db.from("teams").select("id,team_name,progress_status").eq("team_name", team_name.trim()).eq("password_code", password_code.trim()).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Team name or password was not recognized." }, { status: 401 });

    const progress = typeof data.progress_status === "object" && data.progress_status ? data.progress_status as Record<string, unknown> : {};
    if (!progress.winner && progress.status !== "Submitted" && progress.status !== "In progress") {
      await db.from("teams").update({ progress_status: { ...progress, status: "In progress", winner: false } }).eq("id", data.id);
    }
    const response = NextResponse.json({ team: { id: data.id, team_name: data.team_name } });
    response.cookies.set(sessionCookie(data.id));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed." }, { status: 500 });
  }
}
