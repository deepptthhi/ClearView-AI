import type { Request, Response } from "express";
import type { Violation } from "../types.js";

const MODEL = "gemini-3.1-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function buildPrompt(violation: Violation): string {
  const exampleNode = violation.nodes[0];

  return `You are helping someone fix a document/web accessibility violation.

Violation rule: ${violation.id}
Description: ${violation.description}
Accessibility guidance: ${violation.help}
Where it was found: ${exampleNode?.target?.[0] ?? "N/A"}
Details: ${exampleNode?.html ?? "N/A"}

Respond with ONLY a raw JSON object (no markdown fences, no preamble) with exactly these two keys:
{
  "plainEnglish": "1-2 sentence explanation of the real-world impact for a non-expert, in plain language",
  "fixedCodeSnippet": "concrete guidance on how to fix it — a corrected HTML/code snippet if applicable, or short step-by-step instructions (e.g. Word/LibreOffice/Acrobat menu steps) if this is a document format rather than raw markup"
}`;
}

/**
 * Proxies the "explain the fix" request to Gemini. The API key lives only
 * in this process's environment (GEMINI_API_KEY, no VITE_ prefix) — it's
 * never sent to or bundled into the frontend, unlike a VITE_-prefixed var.
 */
export async function explainHandler(req: Request, res: Response) {
  const violation = req.body?.violation as Violation | undefined;

  if (!violation || typeof violation.id !== "string" || !Array.isArray(violation.nodes)) {
    return res.status(400).json({ error: "Request body must include a valid \"violation\" object." });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Server is missing GEMINI_API_KEY. Set it in the backend's environment.",
    });
  }

  try {
    const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(violation) }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(502).json({ error: `Gemini API error (${response.status}): ${body}` });
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];

    if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "RECITATION") {
      return res.status(502).json({ error: `Gemini declined to respond (${candidate.finishReason}).` });
    }

    const text: string = (candidate?.content?.parts ?? [])
      .filter((part: { thought?: boolean; text?: string }) => !part.thought && part.text)
      .map((part: { text?: string }) => part.text)
      .join("")
      .trim();

    if (!text) {
      const reason = candidate?.finishReason ? ` (finishReason: ${candidate.finishReason})` : "";
      return res.status(502).json({ error: `Gemini returned an empty response${reason}.` });
    }

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      res.json({
        plainEnglish: parsed.plainEnglish ?? "No explanation returned.",
        fixedCodeSnippet: parsed.fixedCodeSnippet ?? "",
      });
    } catch {
      res.status(502).json({
        error: `Couldn't parse Gemini's response as JSON. Raw response started with: "${cleaned.slice(0, 120)}"`,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error while calling Gemini.";
    res.status(502).json({ error: message });
  }
}
