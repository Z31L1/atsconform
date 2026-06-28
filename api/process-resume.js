export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Methode nicht erlaubt. Verwende POST.' });
    }

    const { text, mode } = req.body; 

    if (!text) {
        return res.status(400).json({ error: 'Fehlender Text-Payload aus dem Frontend.' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY; 
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY fehlt in den Umgebungsvariablen.");
        }

        const modelId = "gemma-4-31b-it";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

        const generationConfig = {
            temperature: 0.1,
            thinkingConfig: {
                thinkingLevel: "HIGH"
            }
        };

        let systemPromptText = "";

        if (mode === 'lebenslauf') {
            systemPromptText = `Du bist ein ATS-Daten-Experte. Wandle den Lebenslauf-Text in ein exaktes JSON-Objekt um.\n\nANWEISUNGEN:\n1. "work": Übernimm die von dir erkannten Felder. Stelle sicher, dass Aufgaben als Liste im "highlights"-Array landen.\n2. "education": Nutze deine erkannten Felder "institution", "title" (Degree) und "period".\n3. "skills": Extrahiere ALLE technischen Kenntnisse (Hard Skills, Frameworks, Software) aus dem Text in ein flaches Array.\n4. Platzhalter: Ersetze gefundene Kontaktdaten strikt durch [NAME_MASKED], [EMAIL_MASKED], [PHONE_MASKED].\n5. Ausgabe: Gib NUR das JSON aus. Keine Erklärungen.`;

            generationConfig.responseMimeType = "application/json";
            generationConfig.responseSchema = {
                type: "object",
                properties: {
                    basics: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            email: { type: "string" },
                            phone: { type: "string" }
                        },
                        required: ["name", "email", "phone"]
                    },
                    work: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                position: { type: "string" },
                                startDate: { type: "string" },
                                endDate: { type: "string" },
                                highlights: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    education: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                institution: { type: "string" },
                                title: { type: "string" },
                                period: { type: "string" }
                            }
                        }
                    },
                    skills: {
                        type: "array",
                        items: { type: "string" }
                    }
                },
                required: ["basics", "work", "education", "skills"]
            };

        } else if (mode === 'matching') {
            systemPromptText = `Du bist ein präziser HR-Analyst. Analysiere den bereitgestellten Text (Lebenslauf / Jobanforderungen) und erstelle eine Matching-Analyse.\nDu musst EXAKT das folgende Textformat für deine Ausgabe einhalten. Ersetze die Werte in den eckigen Klammern durch die realen Analyseergebnisse. Verwende keine JavaScript-Variablen-Platzhalter wie \${...} in deiner finalen Ausgabe, sondern reinen Text!\n\n--- MATCHING-ANALYSE ---\nÜbereinstimmung: [Berechneter Prozentwert]%\n\nGEFUNDENE SKILLS:\n[Liste der gefundenen Skills, kommagetrennt]\n\nFEHLENDE SKILLS:\n[Liste der fehlenden Skills, kommagetrennt]\n\nVORSCHLAG FÜR MOTIVATIONSSCHREIBEN:\n[Generierter, professioneller Text für das Motivationsschreiben]`;
        } else {
            return res.status(400).json({ error: "Ungültiger Modus. Erlaubt sind 'lebenslauf' oder 'matching'." });
        }

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: `Lebenslauf: ${text}` }]
                    }
                ],
                generationConfig: generationConfig,
                systemInstruction: {
                    parts: [{ text: systemPromptText }]
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google API Status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("Ungültige API-Response: Keine Inferenz-Kandidaten vorhanden.");
        }

        const llmResponseText = data.candidates[0].content.parts[0].text;
        
        let responseData;
        if (mode === 'lebenslauf') {
            responseData = JSON.parse(llmResponseText.trim());
        } else {
            responseData = { rawText: llmResponseText };
        }

        return res.status(200).json({ data: responseData });

    } catch (error) {
        console.error("Kritischer Backend Fehler:", error.message);
        return res.status(500).json({ error: error.message || "Interne Server-Anomalie" });
    }
}