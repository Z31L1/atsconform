export default async function handler(req, res) {
    // CORS-Preflight-Check & Method-Validation (Prüfung, ob der HTTP-Aufruf zulässig ist)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Methode nicht erlaubt. Verwende POST.' });
    }

    const { text } = req.body;

    // Null-Pointer-Prävention (Verhinderung von Fehlern durch leere Variablen)
    if (!text) {
        return res.status(400).json({ error: 'Fehlender Text-Payload aus dem Frontend.' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY; // Zwingend den GEMINI_API_KEY in Vercel hinterlegen!
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY fehlt in den Umgebungsvariablen.");
        }

        // Asynchroner Call an die OpenAI-kompatible OpenRouter API
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://dein-vercel-projekt-url.vercel.app", // Empfohlen für OpenRouter
                "X-Title": "ATS Privacy Pipeline", 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemma-4-31b-it",
                // Deterministic Output Enforcement (Erzwingen einer vorhersehbaren, maschinenlesbaren Antwort)
                response_format: { type: "json_object" }, 
                messages: [
                    {
                        role: "system",
                        content: `Du bist ein hochpräziser ATS-Daten-Extraktor. 
                        Deine einzige Aufgabe ist es, den Text in striktes JSON zu parsen.
                        Verwende EXAKT dieses Schema: { "basics": { "name": "string" }, "work": [ { "name": "string", "position": "string", "startDate": "string", "endDate": "string", "highlights": ["string"] } ] }.
                        Antworte AUSSCHLIESSLICH mit validem JSON, ohne Markdown, ohne Erklärungen.`
                    },
                    {
                        role: "user",
                        content: `Hier ist der Lebenslauf:\n\n${text}`
                    }
                ],
                temperature: 0.1 // Minimierung der Halluzinations-Wahrscheinlichkeit
            })
        });

        const data = await response.json();
        
        // Error-Propagation (Weiterleiten von API-Fehlern an das Frontend)
        if (data.error) {
            console.error("OpenRouter API Error:", data.error);
            return res.status(502).json({ error: data.error.message || "Bad Gateway beim LLM-Provider" });
        }

        const llmResponseText = data.choices[0].message.content;
        
        // Deserialisierung (Rückumwandlung des Text-Strings in ein JavaScript-Objekt)
        let parsedData;
        try {
            parsedData = JSON.parse(llmResponseText.trim());
        } catch (parseErr) {
            // Fallback-Scrubbing (Bereinigung, falls das Modell trotz Verbots Markdown-Tags liefert)
            const scrubbedText = llmResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            parsedData = JSON.parse(scrubbedText);
        }

        return res.status(200).json({ data: parsedData });

    } catch (error) {
        console.error("Kritischer Backend Fehler:", error.message);
        return res.status(500).json({ error: error.message || "Interne Server-Anomalie" });
    }
}