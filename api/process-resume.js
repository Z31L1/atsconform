import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
    const { text, mode } = req.body;
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // Gemma-Inferenz-Konfiguration
        const model = ai.getGenerativeModel({ 
            model: "gemma-4-31b-it", // Nutze ein stabiles Gemma-4 Modell
            generationConfig: {
                temperature: 0.2,
                topP: 0.95,
                topK: 40,
            }
        });

        // Prompt-Engineering für Gemma
        const prompt = `System: Du bist ein ATS-Experte.
        Eingabe: ${text}
        
        Aufgabe: Extrahiere die Daten strikt als JSON.
        Gib nur das reine JSON zurück.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Extrahiere das JSON aus dem Markdown-Codeblock, falls Gemma ihn mitsendet
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return res.status(200).json({ data: JSON.parse(jsonString) });

    } catch (e) {
        console.error("Gemma_Inferenz_Fehler:", e);
        return res.status(500).json({ error: e.message });
    }
}