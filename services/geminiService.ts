
import { GoogleGenAI, Type } from "@google/genai";

// --------------------------------------------------------
// GOOGLE GEMINI API KEY
// --------------------------------------------------------
let aiInstance: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (aiInstance) return aiInstance;
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please check your environment configuration.");
  }
  
  aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
};

export const analyzeSafeguarding = async (narrative: string): Promise<{ detected: boolean; type?: string; reasoning?: string }> => {
  try {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash';
    const prompt = `
      Act as a Clinical Safeguarding Officer. Analyze the following clinical narrative for potential safeguarding concerns (Child Protection, Adult at Risk, Domestic Abuse, Modern Slavery, Neglect).
      
      Narrative Data:
      ${narrative}

      Return a JSON object.
      - 'detected': boolean (true if potential concern found)
      - 'type': string (e.g. "Domestic Abuse", "Neglect")
      - 'reasoning': string (Concise reason based on the text)
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detected: { type: Type.BOOLEAN },
            type: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          },
          required: ["detected"]
        }
      }
    });

    const text = response.text;
    if (!text) return { detected: false };
    return JSON.parse(text);
  } catch (error) {
    console.error("Safeguarding Scan Error", error);
    return { detected: false };
  }
};

export const analyzeRotaCoverage = async (shiftsSummary: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const model = 'gemini-2.5-flash';
        const prompt = `
            Act as an Operations Manager for an Ambulance Service. Analyze the following shift rota summary data.
            Identify:
            1. Coverage gaps (Open shifts).
            2. Skill mix issues (e.g. imbalance of roles).
            3. Efficiency suggestions.
            
            Data Context: ${shiftsSummary}

            Provide a very concise, bulleted summary (max 50 words).
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { temperature: 0.2 }
        });
        return response.text || "Analysis unavailable.";
    } catch (e) {
        console.error(e);
        return "Error analyzing rota.";
    }
}

export const auditEPRF = async (eprfData: any): Promise<{ score: number; feedback: string; critical_issues: string[] }> => {
  try {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash';
    const prompt = `
      Act as a Clinical Audit Officer. Review the following anonymized Patient Report Form (ePRF) data against JRCALC guidelines and UK Ambulance Service documentation standards.

      Data to Review:
      ${JSON.stringify(eprfData)}

      Scoring Criteria (0-100):
      - History (20%): Is the presenting complaint and history detailed enough?
      - Vitals (20%): Are vitals recorded and do they indicate a complete set?
      - Assessment (20%): Is the primary survey (ABCDE) complete?
      - Treatment (20%): Do interventions match the clinical presentation?
      - Governance (20%): Are safeguarding and capacity properly addressed?
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "A score between 0 and 100 representing documentation quality." },
            feedback: { type: Type.STRING, description: "A concise summary of the audit findings, highlighting good practice and areas for improvement." },
            critical_issues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of missing critical fields, safety concerns, or contradictions in the report."
            }
          },
          required: ["score", "feedback", "critical_issues"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text generated");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Audit Error:", error);
    return { score: 0, feedback: "Audit service unavailable. Please check internet connection.", critical_issues: ["Service Error"] };
  }
};

export const generateSBAR = async (eprfData: any): Promise<string> => {
  try {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash';
    const prompt = `
      Generate a professional SBAR (Situation, Background, Assessment, Recommendation) handover statement for a hospital nurse/doctor based on the following ePRF data.
      
      Ensure it is concise (under 150 words) and highlights:
      - The patient's demographics (Age/Sex only).
      - Presenting complaint and key history.
      - Current vital signs and NEWS2 score.
      - Interventions performed and response to treatment.
      - Safeguarding or capacity issues if present.

      Data: ${JSON.stringify(eprfData)}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });

    return response.text || "Unable to generate SBAR.";
  } catch (error) {
    console.error("SBAR Gen Error", error);
    return "Error generating handover.";
  }
};

export const createGuidelineChat = () => {
  const ai = getAiClient();
  const model = 'gemini-2.5-flash';
  return ai.chats.create({
    model: model,
    config: {
      systemInstruction: "You are Aegis-AI, a clinical assistant for ambulance staff. Follow JRCALC guidelines. Be concise and professional. If asked about drug dosages, verify age/weight if relevant. Highlight red flags and safety netting.",
    }
  });
};
