import { NextResponse } from "next/server";
import { getTeamId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getDryRunTeam } from "@/lib/dry-run-store";
import { isDryRun } from "@/lib/runtime-mode";
export async function GET() {
  const id = await getTeamId();
  if (!id) return NextResponse.json({ error: "No active team session." }, { status: 401 });
  if (isDryRun) {
    const team = getDryRunTeam(id);
    return team ? NextResponse.json({ team }) : NextResponse.json({ error: "Team session is no longer valid." }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin().from("teams").select("id,team_name,progress_status").eq("id", id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Team session is no longer valid." }, { status: 401 });
  return NextResponse.json({ team: data });
}
