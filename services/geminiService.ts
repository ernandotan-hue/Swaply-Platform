import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateIcebreaker = async (mySkill: string, theirSkill: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a short, friendly, and professional chat message to initiate a skill swap. 
      The sender offers: "${mySkill}". 
      The receiver offers: "${theirSkill}".
      Keep it under 30 words. No quotes.`,
    });
    return response.text ? response.text.trim() : "Hi there! I'd love to swap skills with you.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "Hi there! I'd love to swap skills with you.";
  }
};

export const findSmartMatches = async (query: string, availableSkills: string[]): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `I have a list of skills: ${JSON.stringify(availableSkills)}.
            The user searched for: "${query}".
            Return a JSON array of strings containing ONLY the skill titles from the provided list that are relevant to the query. 
            If none match well, return an empty array.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        
        const text = response.text;
        if (!text) return [];
        return JSON.parse(text) as string[];
    } catch (error) {
        console.error("Smart match error:", error);
        return [];
    }
};

export const suggestSkillDescription = async (title: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a compelling 2-sentence description for a user offering the skill: "${title}" on a barter platform.`,
        });
        return response.text ? response.text.trim() : "";
    } catch (e) {
        return "";
    }
}