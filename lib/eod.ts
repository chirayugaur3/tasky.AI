import Groq from "groq-sdk";

export type EODReportInput = {
  projectName: string;
  date: string; // DD/MM/YYYY
  plContext: string;
};

export type EODReport = {
  formattedText: string;
};

let _client: Groq | null = null;
function getClient(): Groq {
  if (_client) return _client;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set in this environment.");
  }
  _client = new Groq({ apiKey });
  return _client;
}

const FEW_SHOT_EXAMPLES = `
Example 1:
PL notes: "29 working today, 22 interns + 7 FTs. Delivered 65 tasks on Multimango. Newly onboarded interns introduced to Odoo workflow. They shadowed ongoing tasks while working alongside their allocated peers to maintain quality. CC: vyom sahu"
Output:
*EOD Report*
*Project - Leviathan*
Date: 16/05/2026

*Team Overview:*
Overall team members working: 29
Working Interns: 22
Total FTs working: 7

*Delivery Status:*
Total tasks delivered on Multimango: 65

*Operational Update:*
The taskers performed operations via the Odoo platform throughout the shift. The newly onboarded interns were introduced to the Odoo workflow and operational processes.

The interns shadowed ongoing tasks while simultaneously working on assigned tasks alongside their allocated peers to ensure process understanding and maintain quality standards throughout the workflow.

Thanks,
CC: @vyom sahu

---

Example 2:
PL notes: "36 members, 3 on leave. 104 delivered on Multimango. Evaluated 105 people via PRD assessment, QL conducted interviews. 31 shortlisted and onboarded, start tasking tomorrow. CC: ~Kaustubh Dalvi"
Output:
*EOD Report*
*Project - Leviathan*
Date: 15/05/2026

*Team Overview:*
Overall team members: 36
Members on leave: 3

*Delivery Status:*
Total tasks delivered on Multimango: 104

*Operational Update:*
A total of 105 members were evaluated through the assessment process, which included PRD generation. The QL team conducted assessments along with short interviews for the evaluated members.

Out of those 105 evaluated members, 31 members were shortlisted, onboarded, and tagged to the project. They are scheduled to begin tasking operations from tomorrow onwards.

Thanks,
CC: @~Kaustubh Dalvi

---

Example 3:
PL notes: "38 members, 3 on leave. 50 tasks submitted on Multimango. Taskers used Odoo all shift. Hit several platform issues that slowed task execution. Dev team working on fixes in parallel to restore stability. CC: vyom sahu"
Output:
*EOD Report*
*Project - Leviathan*
Date: 14/05/2026

*Team Overview:*
Overall team members: 38
Members on leave: 3

*Delivery Status:*
Total tasks submitted on Multimango: 50

*Operational Update:*
Taskers performed project tasks using the Odoo platform throughout the shift. During the process, several platform related issues were encountered, which impacted smooth task execution. The development team is actively working on resolving these issues parallelly to ensure platform stability and enable maximum bandwidth utilization.

Thanks
CC: @vyom sahu
`.trim();

export async function generateEODReport(input: EODReportInput): Promise<EODReport> {
  const { projectName, date, plContext } = input;

  const systemPrompt = `You are an operations assistant that converts a Project Lead's raw EOD notes into a formatted End of Day report.

The output is shared in WhatsApp/Slack, so it uses *asterisks* for bold section headers.

You MUST follow these rules strictly:
- Match the exact format shown in the examples — sections, blank lines, header style.
- Date format: DD/MM/YYYY.
- Use whichever Team Overview variant fits the PL's notes (working breakdown vs members + on-leave).
- Operational Update: 1-3 short paragraphs of factual professional prose. No buzzwords like "leverage", "synergy", "robust". No emojis. No bullet points.
- If headcount or delivery numbers are missing from the PL's notes, OMIT that line. Never invent numbers.
- Always end with "Thanks," followed by "CC: @<name>" on the next line. Add the @ prefix to the name yourself if the PL didn't include it.
- Output ONLY the formatted report. No JSON, no markdown code fences, no commentary, no "Here is your report:" preface.

Reference examples (study the structure and tone carefully):

${FEW_SHOT_EXAMPLES}`;

  const userPrompt = `Generate today's EOD report.

Project: ${projectName}
Date: ${date}

PL's raw notes:
${plContext.trim() || "(no notes provided — produce a minimal report stating that delivery telemetry is pending)"}`;

  const client = getClient();
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1024,
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error("Groq returned an empty response");
  }

  const cleaned = text
    .trim()
    .replace(/^```(?:\w+)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return { formattedText: cleaned };
}
