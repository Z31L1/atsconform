import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Methode nicht erlaubt.' });
    }

    const { text, mode } = req.body; 

    if (!text) {
        return res.status(400).json({ error: 'Fehlender Text-Payload.' });
    }

    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY fehlt in den Umgebungsvariablen.");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const modelId = "gemma-4-31b-it"; 
        
        let systemPromptText = "";
        let configOptions = {
            temperature: 0.1
        };

        if (mode === 'lebenslauf') {
            systemPromptText = `Du bist ein ATS-Daten-Experte. Wandle den Lebenslauf-Text in ein exaktes JSON-Objekt um.\n\nANWEISUNGEN:\n1. "work": Übernimm die von dir erkannten Felder. Stelle sicher, dass Aufgaben als Liste im "highlights"-Array landen.\n2. "education": Nutze deine erkannten Felder "institution", "title" (Degree) und "period".\n3. "skills": Extrahiere ALLE technischen Kenntnisse (Hard Skills, Frameworks, Software) aus dem Text in ein flaches Array.\n4. Platzhalter: Ersetze gefundene Kontaktdaten strikt durch [NAME_MASKED], [EMAIL_MASKED], [PHONE_MASKED].\n5. Ausgabe: Gib NUR das JSON aus. Keine Erklärungen.`;

            configOptions.responseMimeType = "application/json";
            configOptions.responseSchema = {
                type: "OBJECT",
                properties: {
                    basics: {
                        type: "OBJECT",
                        properties: {
                            name: { type: "STRING" },
                            email: { type: "STRING" },
                            phone: { type: "STRING" }
                        },
                        required: ["name", "email", "phone"]
                    },
                    work: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                name: { type: "STRING" },
                                position: { type: "STRING" },
                                startDate: { type: "STRING" },
                                endDate: { type: "STRING" },
                                highlights: { type: "ARRAY", items: { type: "STRING" } }
                            }
                        }
                    },
                    education: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                institution: { type: "STRING" },
                                title: { type: "STRING" },
                                period: { type: "STRING" }
                            }
                        }
                    },
                    skills: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                required: ["basics", "work", "education", "skills"]
            };

        } else if (mode === 'matching') {
            systemPromptText = `Du bist ein präziser HR-Analyst. Analysiere den bereitgestellten Text und erstelle eine Matching-Analyse.\nDu musst EXAKT das folgende Textformat für deine Ausgabe einhalten. Ersetze die Werte in den eckigen Klammeln durch die realen Analyseergebnisse.\n\n--- MATCHING-ANALYSE ---\nÜbereinstimmung: [Berechneter Prozentwert]%\n\nGEFUNDENE SKILLS:\n[Liste der gefundenen Skills, kommagetrennt]\n\nFEHLENDE SKILLS:\n[Liste der fehlenden Skills, kommagetrennt]\n\nVORSCHLAG FÜR MOTIVATIONSSCHREIBEN:\n[Generierter Text]`;
            
            configOptions.thinkingConfig = {
                thinkingBudget: 2048
            };
        } else {
            return res.status(400).json({ error: "Ungültiger Modus." });
        }

        const response = await ai.models.generateContent({
            model: modelId,
            contents: `Eingabe-Daten: ${text}`,
            config: {
                systemInstruction: systemPromptText,
                ...configOptions
            }
        });

        if (!response.text) {
            throw new Error("Leere Antwort von der GenAI Inferenz-Engine.");
        }

        let responseData;
        if (mode === 'lebenslauf') {
            responseData = JSON.parse(response.text.trim());
        } else {
            responseData = { rawText: response.text };
        }

        return res.status(200).json({ data: responseData });

    } catch (error) {
        console.error("Kritischer SDK-Backend Fehler:", error.message);
        return res.status(500).json({ error: error.message });
    }
}