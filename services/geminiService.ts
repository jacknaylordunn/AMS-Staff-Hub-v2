import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSafeguarding = async (narrative: string): Promise<{ detected: boolean; type?: string; reasoning?: string }> => {
  try {
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

export const generateClinicalNarrative = async (eprfData: any): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Act as an experienced Paramedic. Write a comprehensive, professional clinical narrative (History of Presenting Complaint & Assessment) based on the structured data provided below.
      
      Rules:
      1. Use standard UK ambulance terminology (e.g., "On arrival...", "Patient states...", "O/E:").
      2. Synthesize the vitals, assessment findings (Primary Survey, Neuro, etc.), and treatments into a chronological flow.
      3. Highlight positive findings and pertinent negatives.
      4. Do not invent facts, but smooth out the structured data into readable prose.
      
      Structured Data:
      ${JSON.stringify(eprfData)}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Narrative Gen Error", error);
    return "";
  }
};

export const getMedicalGuidance = async (query: string, context?: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Act as a Clinical Support Assistant based on JRCALC guidelines (UK Ambulance Services).
      
      User Query: ${query}
      ${context ? `Patient Context: ${context}` : ''}

      Provide a concise, clinically accurate summary suitable for a paramedic or clinician in the field. 
      If the query is about drug dosages, always state the route and contraindications.
      If the query is about an algorithm, outline the key steps.
      
      Disclaimer: Remind the user to verify with their official pocket book if critical.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.2
      }
    });

    return response.text || "Guidance unavailable.";
  } catch (error) {
    console.error("Medical Guidance Error", error);
    return "Unable to retrieve guidance at this time.";
  }
};

export const generateDashboardBriefing = async (userName: string, shifts: any[], announcements: any[]): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Act as an Operational Commander for an Ambulance Service.
      Generate a concise, motivating start-of-shift briefing for ${userName}.
      
      Context:
      - Next 3 Shifts: ${JSON.stringify(shifts.slice(0,3))}
      - Recent Announcements: ${JSON.stringify(announcements.slice(0,3))}
      
      Format:
      **Welcome [Name]**
      
      **Operational Update:**
      [1-2 bullet points on announcements or "No critical updates"]
      
      **Upcoming Duty:**
      [Summary of next shift]
      
      **Safety Focus:**
      [A generic, short safety tip relevant to ambulance operations e.g. Manual handling, driving, or hygiene]
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.4,
      }
    });

    return response.text || "Welcome. System ready.";
  } catch (error) {
    console.error("Briefing Error", error);
    return "Welcome to Aegis Staff Hub. Stay safe.";
  }
};
