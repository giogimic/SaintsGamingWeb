import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";
import {
  buildEnhancePrompt,
  getForumAiConfig,
} from "@/web/lib/forum-ai-settings";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text, intent } = body as {
      text?: string;
      intent?: "grammar" | "polish";
    };

    if (!text?.trim()) {
      return NextResponse.json({ message: "No text provided" }, { status: 400 });
    }

    const safeIntent = intent === "polish" ? "polish" : "grammar";
    const config = await getForumAiConfig();

    if (!config.enabled || config.provider === "off") {
      return NextResponse.json(
        { message: "Text enhancement is disabled in Forum Settings" },
        { status: 403 }
      );
    }

    const prompt = buildEnhancePrompt(text, safeIntent);

    if (config.provider === "ollama") {
      return streamOllama({
        baseUrl: config.ollamaUrl,
        model: config.ollamaModel,
        prompt,
      });
    }

    // Default: Gemini cloud
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "Gemini API key not configured. Set GEMINI_API_KEY in environment or Forum Settings." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const primaryModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    let responseStream: any;
    try {
      responseStream = await ai.models.generateContentStream({
        model: primaryModel,
        contents: prompt,
      });
    } catch (primaryErr) {
      console.warn(`Primary Gemini model ${primaryModel} failed, trying fallback gemini-1.5-flash:`, primaryErr);
      try {
        responseStream = await ai.models.generateContentStream({
          model: "gemini-1.5-flash",
          contents: prompt,
        });
      } catch (fallbackErr: any) {
        console.error("Gemini fallback model also failed:", fallbackErr);
        return NextResponse.json(
          { message: fallbackErr?.message || "Gemini API request failed. Verify API key and network." },
          { status: 502 }
        );
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
        } catch (err) {
          console.error("Gemini stream error:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("Enhance Error:", error);
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

async function streamOllama(input: {
  baseUrl: string;
  model: string;
  prompt: string;
}) {
  let upstream: Response;
  try {
    upstream = await fetch(`${input.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        stream: true,
      }),
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "Cannot reach Ollama. Install from https://ollama.com and ensure the service is running.",
      },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        message: `Ollama error (${upstream.status}). Is model "${input.model}" installed?`,
        detail: detail.slice(0, 300),
      },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const json = JSON.parse(trimmed) as { response?: string };
              if (json.response) {
                controller.enqueue(encoder.encode(json.response));
              }
            } catch {
              /* ignore partial JSON */
            }
          }
        }
      } catch (err) {
        console.error("Ollama stream error:", err);
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
