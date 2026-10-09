import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-server";
import { allDryRunTeams, createDryRunTeam, deleteDryRunTeam, getDryRunTeam, patchDryRunTeam } from "@/lib/dry-run-store";
import { hasDryRunAdminSession } from "@/lib/dry-run-admin-session";
import { isDryRun } from "@/lib/runtime-mode";

async function isAdmin(request: Request) {
  if (isDryRun) return hasDryRunAdminSession(request);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return false;
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data } = await client.auth.getUser(token);
  return !!data.user;
}
function generatePassword() { return `DA-${randomBytes(9).toString("base64url").toUpperCase()}`; }
function progress(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : { status: String(value || "Registered"), winner: false }; }
function addHint(current: Record<string, unknown>, text: string, level: string) {
  const hints = Array.isArray(current.hints) ? current.hints : [];
  const hint = { id: randomUUID(), text, level, issued_at: new Date().toISOString() };
  return { ...current, hints: [...hints, hint], hints_used: Number(current.hints_used || 0) + 1, last_active: hint.issued_at };
}

export async function GET(request: Request) {
  if (!await isAdmin(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  if (isDryRun) return NextResponse.json({ teams: allDryRunTeams() });
  const { data, error } = await supabaseAdmin().from("teams").select("id,team_name,password_code,progress_status,created_at").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ teams: data });
}
export async function POST(request: Request) {
  if (!await isAdmin(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  const { team_name } = await request.json();
  if (typeof team_name !== "string" || !team_name.trim()) return NextResponse.json({ error: "Team name is required." }, { status: 400 });
  if (isDryRun) {
    const password_code = generatePassword();
    const team = createDryRunTeam(team_name, password_code);
    return NextResponse.json({ team, generated_password: password_code });
  }
  const db = supabaseAdmin();
  for (let attempt = 0; attempt < 4; attempt++) {
    const password_code = generatePassword();
    const { data, error } = await db.from("teams").insert({ team_name: team_name.trim(), password_code, progress_status: { status: "Registered", winner: false } }).select("id,team_name,password_code,progress_status,created_at").single();
    if (!error) return NextResponse.json({ team: data, generated_password: password_code });
    if (error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Could not generate a unique team password. Try again." }, { status: 503 });
}
export async function PATCH(request: Request) {
  if (!await isAdmin(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Team id is required." }, { status: 400 });
  if (isDryRun) {
    const existing = getDryRunTeam(body.id);
    if (!existing) return NextResponse.json({ error: "Team not found." }, { status: 404 });
    if (typeof body.team_name === "string") {
      if (!body.team_name.trim()) return NextResponse.json({ error: "Team name cannot be empty." }, { status: 400 });
      return NextResponse.json({ team: patchDryRunTeam(body.id, { team_name: body.team_name.trim() }) });
    }
    if (body.rotate_password === true) {
      const password_code = generatePassword();
      return NextResponse.json({ team: patchDryRunTeam(body.id, { password_code }), generated_password: password_code });
    }
    const current = progress(existing.progress_status);
    if (typeof body.hint_text === "string") {
      const text = body.hint_text.trim();
      if (text.length < 4 || text.length > 500) return NextResponse.json({ error: "A hint must be between 4 and 500 characters." }, { status: 400 });
      const level = ["Nudge", "Direction", "Strong hint"].includes(body.hint_level) ? body.hint_level : "Nudge";
      const team = patchDryRunTeam(body.id, { progress_status: addHint(current, text, level) });
      return NextResponse.json({ team });
    }
    if (typeof body.status === "string") {
      if (!["Registered", "In progress", "Submitted"].includes(body.status)) return NextResponse.json({ error: "Choose a valid team status." }, { status: 400 });
      return NextResponse.json({ team: patchDryRunTeam(body.id, { progress_status: { ...current, status: current.winner ? "Winner" : body.status } }) });
    }
    if (typeof body.winner === "boolean") {
      if (body.winner) {
        for (const row of allDryRunTeams()) {
          const rowProgress = progress(row.progress_status);
          const won = row.id === body.id;
          patchDryRunTeam(row.id, { progress_status: { ...rowProgress, status: won ? "Winner" : rowProgress.status === "Winner" ? "Submitted" : rowProgress.status, winner: won } });
        }
      } else {
        patchDryRunTeam(body.id, { progress_status: { ...current, status: current.status === "Winner" ? "Submitted" : current.status, winner: false } });
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "No supported team update was supplied." }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data: existing, error: readError } = await db.from("teams").select("id,team_name,password_code,progress_status,created_at").eq("id", body.id).maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Team not found." }, { status: 404 });

  if (typeof body.team_name === "string") {
    if (!body.team_name.trim()) return NextResponse.json({ error: "Team name cannot be empty." }, { status: 400 });
    const { data, error } = await db.from("teams").update({ team_name: body.team_name.trim() }).eq("id", body.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ team: data });
  }
  if (body.rotate_password === true) {
    const password_code = generatePassword();
    const { data, error } = await db.from("teams").update({ password_code }).eq("id", body.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ team: data, generated_password: password_code });
  }
  const current = progress(existing.progress_status);
  if (typeof body.hint_text === "string") {
    const text = body.hint_text.trim();
    if (text.length < 4 || text.length > 500) return NextResponse.json({ error: "A hint must be between 4 and 500 characters." }, { status: 400 });
    const level = ["Nudge", "Direction", "Strong hint"].includes(body.hint_level) ? body.hint_level : "Nudge";
    const { data, error } = await db.from("teams").update({ progress_status: addHint(current, text, level) }).eq("id", body.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ team: data });
  }
  if (typeof body.status === "string") {
    if (!["Registered", "In progress", "Submitted"].includes(body.status)) return NextResponse.json({ error: "Choose a valid team status." }, { status: 400 });
    const next = { ...current, status: current.winner ? "Winner" : body.status };
    const { data, error } = await db.from("teams").update({ progress_status: next }).eq("id", body.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ team: data });
  }
  if (typeof body.winner === "boolean") {
    if (body.winner) {
      const { data: all, error: allError } = await db.from("teams").select("id,progress_status");
      if (allError) return NextResponse.json({ error: allError.message }, { status: 500 });
      const results = await Promise.all((all || []).map(row => {
        const rowProgress = progress(row.progress_status); const won = row.id === body.id;
        return db.from("teams").update({ progress_status: { ...rowProgress, status: won ? "Winner" : rowProgress.status === "Winner" ? "Submitted" : rowProgress.status, winner: won } }).eq("id", row.id);
      }));
      const failed = results.find(result => result.error);
      if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 400 });
    } else {
      const next = { ...current, status: current.status === "Winner" ? "Submitted" : current.status, winner: false };
      const { error } = await db.from("teams").update({ progress_status: next }).eq("id", body.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "No supported team update was supplied." }, { status: 400 });
}
export async function DELETE(request: Request) {
  if (!await isAdmin(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  const { id } = await request.json();
  if (isDryRun) return deleteDryRunTeam(id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Team not found." }, { status: 404 });
  const { error } = await supabaseAdmin().from("teams").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
