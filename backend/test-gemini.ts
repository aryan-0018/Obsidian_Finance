import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: "AIzaSyANrJ5ow1Cs71hNmFhyWvfST70Kv5MdRBE" });

async function testGemini() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: 'Hello, are you there?',
        });
        console.log("Success:", response.text);
    } catch (e: any) {
        console.error("Error:", e.stack || e.message || e);
    }
}

testGemini();
