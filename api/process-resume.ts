import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject, streamText } from 'ai';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text, mode } = await req.json();

    if (!text || !mode) {
      return new Response(
        JSON.stringify({ error: 'Fehlender Text-Payload oder Modus.' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (mode === 'lebenslauf') {
      const { object } = await generateObject({
        model: google('gemini-1.5-pro'),
        schema: z.object({
          personalInfo: z.object({
            name: z.string().optional(),
            email: z.string().email().optional(),
          }).optional(),
          skills: z.array(z.string()).optional(),
          experience: z.array(z.object({
            role: z.string(),
            company: z.string(),
            duration: z.string(),
          })).optional(),
        }),
        prompt: `Extrahiere alle relevanten ATS-Daten präzise aus folgendem Lebenslauf:\n\n${text}`,
      });

      return new Response(JSON.stringify({ data: object }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'matching') {
      const result = await streamText({
        model: google('gemini-1.5-pro'),
        system: 'Du bist ein präziser HR-Analyst. Analysiere das Matching rational.',
        prompt: `Analysiere folgende Daten:\n\n${text}`,
      });

      // KORREKTUR: Nutzung der mathematisch und syntaktisch validen Methode deines aktuellen Typsystems
      return result.toTextStreamResponse();
    }

    return new Response(
      JSON.stringify({ error: 'Ungültiger Modus.' }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Kritischer API-Infrastrukturfehler:", error.message);
    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler', details: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}