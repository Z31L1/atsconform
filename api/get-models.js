const { GoogleGenAI } = require('@google/genai');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Methode nicht erlaubt.' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY nicht gesetzt.");

        // Initialisierung analog zu deinem Python-Client
        const client = new GoogleGenAI({ apiKey });

        // Modelle abfragen
        const models = await client.models.list();
        
        // Liste extrahieren und bereinigen
        const officialModels = models.map(m => m.name.replace("models/", ""));

        // Deine Schmuggelware hinzufügen
        const smuggledModels = ["gemma-4-31b-it (Schmuggelware)"];
        const allModels = [...officialModels, ...smuggledModels].sort();

        return res.status(200).json({ models: allModels });

    } catch (error) {
        console.error("SDK_MODEL_LOAD_ERR:", error.message);
        return res.status(500).json({ error: "Fehler beim Laden: " + error.message });
    }
};