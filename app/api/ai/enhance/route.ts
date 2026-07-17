import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text, intent, isNews } = body;

    if (!text) {
      return NextResponse.json({ message: "No text provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: "AI API key not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    let prompt = "";
    if (intent === "grammar") {
      prompt = `Please fix the grammar and spelling in the following markdown text. Return ONLY the corrected markdown text without any conversational filler or explanation:\n\n${text}`;
    } else {
      prompt = `Please polish the following markdown text to improve flow, vocabulary, and readability. Keep the core meaning but make it sound professional and engaging. Return ONLY the polished markdown text without any conversational filler or explanation:\n\n${text}`;
    }

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

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
          console.error("Stream error:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  } catch (error) {
    console.error("AI Enhance Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
