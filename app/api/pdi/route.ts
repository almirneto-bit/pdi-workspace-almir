import { NextResponse } from "next/server";
import { isWorkspaceAuthenticated } from "@/lib/server-auth";
import { seedTracks } from "@/lib/seed";
import { createAdminClient } from "@/utils/supabase/admin";
import type { PdiTrack } from "@/types/pdi";

async function ensureSeedData() {
  const supabase = createAdminClient();
  const { data: existing, error } = await supabase
    .from("pdi_tracks")
    .select("id, slug")
    .limit(1);

  if (error) throw error;
  if (existing && existing.length > 0) return;

  const rows = seedTracks.map((track) => ({
    slug: track.id,
    development_point: track.developmentPoint,
    objective: track.objective,
    action: track.action,
    how: track.how,
    expected_result: track.expectedResult,
    deadline: track.deadline,
    observation: track.observation,
    progress: track.progress,
    status: track.status,
  }));

  const { error: insertError } = await supabase.from("pdi_tracks").insert(rows);
  if (insertError) throw insertError;
}

async function loadTracks(): Promise<PdiTrack[]> {
  await ensureSeedData();
  const supabase = createAdminClient();

  const { data: tracks, error } = await supabase
    .from("pdi_tracks")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const ids = (tracks ?? []).map((track) => track.id);
  const [{ data: updates, error: updatesError }, { data: history, error: historyError }] =
    ids.length > 0
      ? await Promise.all([
          supabase
            .from("pdi_updates")
            .select("*")
            .in("track_id", ids)
            .order("created_at", { ascending: false }),
          supabase
            .from("pdi_history")
            .select("*")
            .in("track_id", ids)
            .order("created_at", { ascending: false }),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

  if (updatesError) throw updatesError;
  if (historyError) throw historyError;

  return (tracks ?? []).map((track) => ({
    id: track.slug,
    developmentPoint: track.development_point,
    objective: track.objective,
    action: track.action,
    how: track.how,
    expectedResult: track.expected_result,
    deadline: track.deadline ?? "",
    observation: track.observation ?? "",
    progress: track.progress,
    status: track.status,
    updates: (updates ?? [])
      .filter((item) => item.track_id === track.id)
      .map((item) => {
        const legacyMatch =
          !item.author_label && typeof item.content === "string"
            ? item.content.match(/^\[([^\]]+)\]\s(.*)$/s)
            : null;

        return {
          id: item.id,
          author: item.author_label || legacyMatch?.[1] || "Usuário",
          content: legacyMatch?.[2] || item.content,
          createdAt: item.created_at,
        };
      }),
    history: (history ?? [])
      .filter((item) => item.track_id === track.id)
      .map((item) => ({
        id: item.id,
        label: item.label,
        createdAt: item.created_at,
      })),
  })) as PdiTrack[];
}

function explainSupabaseError(error: unknown) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message)
        : "Erro desconhecido.";

  const lower = raw.toLowerCase();

  if (lower.includes("server credentials are not configured")) {
    return {
      code: "SUPABASE_SECRET_MISSING",
      message:
        "A chave secreta do Supabase não está disponível neste deploy. Confira SUPABASE_SECRET_KEY no Vercel e faça um novo Redeploy.",
    };
  }

  if (lower.includes("invalid api key") || lower.includes("jwt") || lower.includes("unauthorized")) {
    return {
      code: "SUPABASE_SECRET_INVALID",
      message:
        "A chave secreta do Supabase parece inválida. Confira SUPABASE_SECRET_KEY no Vercel e faça um novo Redeploy.",
    };
  }

  if (lower.includes("does not exist") || lower.includes("schema cache") || lower.includes("relation")) {
    return {
      code: "SUPABASE_SCHEMA",
      message:
        "As tabelas do PDI não foram encontradas no Supabase. Execute novamente o arquivo supabase/schema.sql no SQL Editor.",
    };
  }

  if (lower.includes("fetch failed") || lower.includes("network")) {
    return {
      code: "SUPABASE_NETWORK",
      message: "Não foi possível alcançar o Supabase agora. Tente novamente em alguns instantes.",
    };
  }

  return { code: "SUPABASE_UNKNOWN", message: raw || "Erro ao acessar o Supabase." };
}

export async function GET() {
  if (!(await isWorkspaceAuthenticated())) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  try {
    return NextResponse.json({ tracks: await loadTracks() });
  } catch (error) {
    const explained = explainSupabaseError(error);
    return NextResponse.json(explained, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isWorkspaceAuthenticated())) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createAdminClient();

    if (body.action === "update-track") {
      const track = body.track as PdiTrack;

      const { data: dbTrack, error: findError } = await supabase
        .from("pdi_tracks")
        .select("id")
        .eq("slug", track.id)
        .single();

      if (findError) throw findError;

      const { error: updateError } = await supabase
        .from("pdi_tracks")
        .update({
          development_point: track.developmentPoint,
          objective: track.objective,
          action: track.action,
          how: track.how,
          expected_result: track.expectedResult,
          deadline: track.deadline,
          observation: track.observation,
          progress: track.progress,
          status: track.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dbTrack.id);

      if (updateError) throw updateError;

      const historyPayload = {
        track_id: dbTrack.id,
        actor_label: body.author || "Almir",
        label: body.label || "Planejamento atualizado",
      };

      const { error: historyError } = await supabase.from("pdi_history").insert(historyPayload);

      if (historyError) {
        const { error: legacyHistoryError } = await supabase.from("pdi_history").insert({
          track_id: dbTrack.id,
          label: body.label || "Planejamento atualizado",
        });
        if (legacyHistoryError) throw historyError;
      }
    }

    if (body.action === "add-update") {
      const { data: dbTrack, error: findError } = await supabase
        .from("pdi_tracks")
        .select("id")
        .eq("slug", body.trackId)
        .single();

      if (findError) throw findError;

      const author = body.author || "Almir";

      const { error: updateError } = await supabase.from("pdi_updates").insert({
        track_id: dbTrack.id,
        author_label: author,
        content: body.content,
      });

      if (updateError) {
        const { error: legacyUpdateError } = await supabase.from("pdi_updates").insert({
          track_id: dbTrack.id,
          content: `[${author}] ${body.content}`,
        });
        if (legacyUpdateError) throw updateError;
      }

      const historyLabel = `Nova atualização adicionada por ${author}`;
      const { error: historyError } = await supabase.from("pdi_history").insert({
        track_id: dbTrack.id,
        actor_label: author,
        label: historyLabel,
      });

      if (historyError) {
        const { error: legacyHistoryError } = await supabase.from("pdi_history").insert({
          track_id: dbTrack.id,
          label: historyLabel,
        });
        if (legacyHistoryError) throw historyError;
      }
    }

    if (body.action === "reset") {
      const { error: deleteHistoryError } = await supabase
        .from("pdi_history")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (deleteHistoryError) throw deleteHistoryError;

      const { error: deleteUpdatesError } = await supabase
        .from("pdi_updates")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (deleteUpdatesError) throw deleteUpdatesError;

      for (const track of seedTracks) {
        const { error: resetError } = await supabase
          .from("pdi_tracks")
          .update({
            development_point: track.developmentPoint,
            objective: track.objective,
            action: track.action,
            how: track.how,
            expected_result: track.expectedResult,
            deadline: track.deadline,
            observation: track.observation,
            progress: track.progress,
            status: track.status,
            updated_at: new Date().toISOString(),
          })
          .eq("slug", track.id);

        if (resetError) throw resetError;
      }
    }

    return NextResponse.json({ tracks: await loadTracks() });
  } catch (error) {
    const explained = explainSupabaseError(error);
    return NextResponse.json(explained, { status: 500 });
  }
}
