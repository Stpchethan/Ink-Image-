import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AnalysisResult {
  mood: string;
  scene: string;
  story: string;
}

export async function analyzeImageAndGhostwrite(base64Image: string, mimeType: string): Promise<AnalysisResult> {
  const prompt = `
    Analyze this image and provide:
    1. The mood (a few descriptive words).
    2. The scene (a brief description of what's happening).
    3. An opening paragraph for a story set in this world. The paragraph should be atmospheric, evocative, and set the stage for a compelling narrative.

    Return the result in JSON format with the keys: "mood", "scene", and "story".
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Image, mimeType } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
    }
  });

  const result = JSON.parse(response.text);
  return result as AnalysisResult;
}

export async function generateSpeech(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this story opening with an expressive, atmospheric, and slightly dramatic voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is a good expressive voice
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("Failed to generate audio");
  }

  return base64Audio;
}
