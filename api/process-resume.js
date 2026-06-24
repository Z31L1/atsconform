// api/process-resume.js
// Vercel Serverless Function
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { text } = req.body;
    
    // System-Prompt für die Strukturierung
    const prompt = `Du bist ein ATS-Daten-Experte. Wandle folgenden anonymisierten Lebenslauf-Text in striktes JSON um. 
    Verwende folgendes Schema: { "basics": {}, "work": [], "education": [] }.
    Gib ausschließlich das JSON zurück, ohne erklärenden Text.
    Lebenslauf-Text: ${text}`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const jsonResponse = result.response.text();
        
        res.status(200).json({ data: JSON.parse(jsonResponse.replace(/```json/g, '').replace(/```/g, '')) });
    } catch (error) {
        res.status(500).json({ error: "Parsing failed" });
    }
}