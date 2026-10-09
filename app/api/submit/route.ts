import { NextResponse } from "next/server";
import { getTeamId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getDryRunTeam, patchDryRunTeam } from "@/lib/dry-run-store";
import { isDryRun } from "@/lib/runtime-mode";

export async function POST(request: Request) {
  const id = await getTeamId();
  if (!id) return NextResponse.json({ error: "Your team session has expired." }, { status: 401 });
  const { answer } = await request.json();
  if (typeof answer !== "string" || answer.trim().length < 20) return NextResponse.json({ error: "Please submit a little more detail about your theory." }, { status: 400 });
  if (answer.length > 3000) return NextResponse.json({ error: "Keep your submission under 3,000 characters." }, { status: 400 });
  if (isDryRun) {
    const team = getDryRunTeam(id);
    if (!team) return NextResponse.json({ error: "Team record not found." }, { status: 404 });
    const current = team.progress_status || {};
    if (current.winner) return NextResponse.json({ error: "Your team has already been marked as the winner." }, { status: 409 });
    patchDryRunTeam(id, { progress_status: { ...current, status: "Submitted", answer: answer.trim(), submitted_at: new Date().toISOString(), winner: false } });
    return NextResponse.json({ ok: true, status: "Submitted" });
  }
  const db = supabaseAdmin();
  const { data: team, error: readError } = await db.from("teams").select("progress_status").eq("id", id).maybeSingle();
  if (readError || !team) return NextResponse.json({ error: "Team record not found." }, { status: 404 });
  const current = team.progress_status && typeof team.progress_status === "object" ? team.progress_status as Record<string, unknown> : {};
  if (current.winner) return NextResponse.json({ error: "Your team has already been marked as the winner." }, { status: 409 });
  const { error } = await db.from("teams").update({ progress_status: { ...current, status: "Submitted", answer: answer.trim(), submitted_at: new Date().toISOString(), winner: false } }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: "Submitted" });
}
