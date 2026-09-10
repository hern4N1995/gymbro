// @ts-nocheck
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Read service role key from a non-reserved secret name. The dashboard disallows
// creating secrets that start with `SUPABASE_`, so use `SERVICE_ROLE_KEY`.
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash-lite";
const DAILY_LIMIT = Number(Deno.env.get("DAILY_LIMIT") || "30");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || "", {
  auth: { persistSession: false },
});

function todayDateString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

const SYSTEM_PROMPT = `
Eres un asistente experto en entrenamiento y nutrición enfocado en usuarios de esta app.
Usa solo la información de la app cuando la tengas; responde de forma práctica y accionable.
No realices diagnósticos médicos. Si la consulta parece relacionada con condiciones médicas
(o riesgo, síntomas, tratamientos), advierte y sugiere consultar a un profesional de salud.
Mantén respuestas claras, concisas y orientadas a la rutina y los objetivos del usuario.
`;

function buildRecentSummary(dayTitles: any[] = [], routineEntries: any[] = [], logs: any[] = []) {
  const parts: string[] = [];

  const dayMap = new Map<string, string>();
  for (const day of dayTitles || []) {
    if (day?.day_id) {
      dayMap.set(String(day.day_id), day.title || "Día sin título");
    }
  }

  if (dayTitles && dayTitles.length) {
    const daySummary = dayTitles
      .map((day) => `${day.title || "Día sin título"} (${day.day_id || "sin-id"})`)
      .join(" | ");
    parts.push(`Días configurados: ${daySummary}`);
  } else {
    parts.push("Días configurados: ninguno.");
  }

  if (routineEntries && routineEntries.length) {
    const byDay = new Map<string, any[]>();
    for (const entry of routineEntries) {
      const dayId = entry?.day_id || "sin-dia";
      const list = byDay.get(dayId) || [];
      list.push(entry);
      byDay.set(dayId, list);
    }

    const dayBlocks: string[] = [];
    for (const [dayId, entries] of byDay.entries()) {
      const title = dayMap.get(String(dayId)) || "Día sin título";
      const exerciseList = entries
        .map((entry) => {
          const name = entry?.exercise_name || entry?.name || "Ejercicio sin nombre";
          const sets = entry?.sets ?? "?";
          const reps = entry?.reps ?? "?";
          const rir = entry?.rir ?? "?";
          const rest = entry?.rest ?? entry?.rest_seconds ?? "?";
          return `${name} (${sets}x${reps}, RIR ${rir}, descanso ${rest}s)`;
        })
        .join("; ");
      dayBlocks.push(`${title}: ${exerciseList}`);
    }

    if (dayBlocks.length) {
      parts.push(`Ejercicios por día: ${dayBlocks.join(" | ")}`);
    } else {
      parts.push("Ejercicios por día: no hay ejercicios registrados en rutinas_usuario.");
    }
  } else {
    parts.push("Ejercicios por día: no hay ejercicios registrados en rutinas_usuario.");
  }

  if (logs && logs.length) {
    const recentList = logs
      .slice(0, 15)
      .map((item) => {
        const date = item?.date || item?.created_at;
        const dateLabel = date ? new Date(date).toLocaleDateString("es-AR") : "fecha desconocida";
        const exercise = item?.exercise_name || item?.exercise_id || "Ejercicio";
        const weight = item?.weight ?? "?";
        const reps = item?.reps ?? "?";
        return `${dateLabel}: ${exercise} — ${weight}kg x ${reps} reps`;
      })
      .join(" | ");
    parts.push(`Últimos registros: ${recentList}`);
  } else {
    parts.push("Últimos registros: no hay historial reciente registrado.");
  }

  return parts.join("\n");
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function respondJSON(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SERVICE_ROLE_KEY secret in Edge Functions");
    return respondJSON({ error: "Server misconfigured: missing SERVICE_ROLE_KEY" }, 500);
  }
  try {
    if (req.method !== "POST") return respondJSON({ error: "Method not allowed" }, 405);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const body = await req.json().catch(() => ({}));
    const userMessage = (body.message || "").toString().trim();
    if (!token || !userMessage) return respondJSON({ error: "Missing token or message" }, 400);

    // Verify session via Supabase Auth user endpoint
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    // Read body for debugging (safe-guard: don't log tokens)
    const authResText = await authRes.text().catch(() => null);
    console.error("auth/v1/user status", authRes.status, "bodyPreview:", authResText?.slice(0, 500));
    if (authRes.status !== 200) return respondJSON({ error: "Invalid or expired session" }, 401);
    const user = JSON.parse(authResText || "null");
    const userId = user?.id;
    if (!userId) return respondJSON({ error: "User not found in token" }, 401);

    // Check daily quota
    const today = todayDateString();
    const { data: quotaRow } = await supabase
      .from("ai_chat_quota")
      .select("count")
      .eq("user_id", userId)
      .eq("date", today)
      .limit(1)
      .maybeSingle();

    const currentCount = quotaRow?.count ?? 0;
    if (currentCount >= DAILY_LIMIT) return respondJSON({ error: "Daily limit reached" }, 429);

    // Fetch real user context from the actual app tables.
    const [{ data: dayRows }, { data: routineRows }, { data: recentLogs }] = await Promise.all([
      supabase
        .from("dias_usuario")
        .select("day_id,title")
        .eq("user_id", userId)
        .order("day_id", { ascending: true }),
      supabase
        .from("rutinas_usuario")
        .select("id,user_id,exercise_id,exercise_name,muscle_group,rest_seconds,created_at,day_id,name,sets,reps,rir,rest")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("historial")
        .select("id,user_id,exercise_id,exercise_name,muscle_group,weight,reps,created_at,date,rir,notes")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const recentSummary = buildRecentSummary(dayRows || [], routineRows || [], recentLogs || []);

    const systemText = `${SYSTEM_PROMPT}\nContexto del usuario (resumen):\n${recentSummary}\n\nResponde solo en español.`;
    const messages = [
      { author: "system", content: [{ type: "text", text: systemText }] },
      { author: "user", content: [{ type: "text", text: userMessage }] },
    ];

    // Call Generative AI API. Use generateMessage for conversational Gemini models,
    // or generateText for text-bison-style models (avoid 404s when model doesn't support generateMessage).
    let replyText = "";
    if (GEMINI_MODEL?.startsWith("text-") || GEMINI_MODEL?.toLowerCase().includes("bison")) {
      // text-bison or similar: use generateText with a single prompt combining system and user
      const promptText = `${SYSTEM_PROMPT}\nContexto del usuario (resumen):\n${recentSummary}\n\nUsuario: ${userMessage}`;
      const textRes = await fetch(`https://generativeai.googleapis.com/v1/models/${GEMINI_MODEL}:generateText`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: { text: promptText }, temperature: 0.2, maxOutputTokens: 512 }),
      });

      if (!textRes.ok) {
        const errText = await textRes.text();
        return respondJSON({ error: "Gemini API error", details: errText }, 502);
      }

      const textJson = await textRes.json().catch(() => null);
      // Try common shapes
      replyText = textJson?.candidates?.[0]?.text || textJson?.output?.[0]?.content?.[0]?.text || textJson?.output?.[0]?.text || JSON.stringify(textJson);
    } else {
      const geminiRes = await fetch(`https://generativeai.googleapis.com/v1/models/${GEMINI_MODEL}:generateMessage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages, temperature: 0.2, maxOutputTokens: 512 }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return respondJSON({ error: "Gemini API error", details: errText }, 502);
      }

      const geminiJson = await geminiRes.json();
      try {
        replyText =
          geminiJson?.candidates?.[0]?.content?.map((c: any) => c.text || "").join("") ||
          geminiJson?.output?.[0]?.content?.[0]?.text ||
          JSON.stringify(geminiJson);
      } catch {
        replyText = JSON.stringify(geminiJson);
      }
    }

    // Increment quota (upsert behavior)
    if (quotaRow) {
      await supabase.from("ai_chat_quota").update({ count: currentCount + 1 }).eq("user_id", userId).eq("date", today);
    } else {
      await supabase.from("ai_chat_quota").insert({ user_id: userId, date: today, count: 1 });
    }

    return respondJSON({ reply: replyText }, 200);
  } catch (err) {
    console.error("ai-chat error", err);
    return respondJSON({ error: "Internal server error" }, 500);
  }
});
