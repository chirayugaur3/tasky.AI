import Groq from "groq-sdk";
import { z } from "zod";

export type TaskTelemetry = {
  completed: string[];
  inProgress: string[];
  blocked: { task: string; reason: string }[];
};

export type EODReport = {
  completedToday: string[];
  activeBlockers: string[];
  tomorrowFocus: string[];
};

const reportSchema = z.object({
  completedToday: z.array(z.string()).max(8),
  activeBlockers: z.array(z.string()).max(8),
  tomorrowFocus: z.array(z.string()).max(8),
});

let _client: Groq | null = null;
function getClient(): Groq {
  if (_client) return _client;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env and restart the dev server."
    );
  }
  _client = new Groq({ apiKey });
  return _client;
}

export async function generateEODReport(
  plContext: string,
  telemetry: TaskTelemetry
): Promise<EODReport> {
  const prompt = `You are generating an End of Day report for a Project Lead at a tech company.

Project Lead's context (their raw notes for today):
${plContext.trim() || "(none provided)"}

Today's task telemetry pulled from the system:
- Completed tasks: ${telemetry.completed.length ? telemetry.completed.join("; ") : "none"}
- In progress tasks: ${telemetry.inProgress.length ? telemetry.inProgress.join("; ") : "none"}
- Blocked tasks: ${
    telemetry.blocked.length
      ? telemetry.blocked.map((b) => `"${b.task}" (blocker: ${b.reason})`).join("; ")
      : "none"
  }

Synthesize the above into a concise, professional EOD report. Be specific and actionable. Each item should be one short sentence. Maximum 4 items per section.

Return ONLY valid JSON in exactly this shape, with no surrounding prose or markdown fences:
{
  "completedToday": ["..."],
  "activeBlockers": ["..."],
  "tomorrowFocus": ["..."]
}`;

  const client = getClient();
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1024,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an executive assistant that produces structured EOD reports as strict JSON. Never include markdown fences.",
      },
      { role: "user", content: prompt },
    ],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error("Groq returned an empty response");
  }

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`LLM returned non-JSON output: ${cleaned.slice(0, 200)}`);
  }

  const result = reportSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `LLM output failed schema validation: ${result.error.issues
        .map((i) => i.message)
        .join("; ")}`
    );
  }
  return result.data;
}
