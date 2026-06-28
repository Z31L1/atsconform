// Korrekter Import für CommonJS (require)
const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Methode nicht erlaubt.' });
    }

    const { text, mode } = req.body; 
    if (!text) return res.status(400).json({ error: 'Fehlender Text-Payload.' });

    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY fehlt in den Umgebungsvariablen.");
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Modell-ID: Nutze gemma-2-27b-it, da gemma-4-31b-it evtl. nicht verfügbar ist
        const model = genAI.getGenerativeModel({ model: "gemma-4-31b-it" });
        
        let systemPromptText = "";
        let generationConfig = { temperature: 0.1 };

        if (mode === 'lebenslauf') {
            systemPromptText = "Du bist ein ATS-Daten-Experte. Antworte ausschließlich als gültiges JSON.";
            generationConfig.responseMimeType = "application/json";
        } else if (mode === 'matching') {
            systemPromptText = "Du bist ein präziser HR-Analyst.";
        } else {
            return res.status(400).json({ error: "Ungültiger Modus." });
        }

        // KORREKTUR: Die Methode lautet model.generateContent im offiziellen SDK
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: `${systemPromptText}\n\nEingabe: ${text}` }] }],
            generationConfig
        });

        const responseText = result.response.text();
        
        const responseData = (mode === 'lebenslauf') 
            ? JSON.parse(responseText.replace(/```json|```/g, '').trim()) 
            : { rawText: responseText };

        return res.status(200).json({ data: responseData });

    } catch (error) {
        console.error("Kritischer SDK-Backend Fehler:", error.message);
        return res.status(500).json({ error: error.message });
    }
};