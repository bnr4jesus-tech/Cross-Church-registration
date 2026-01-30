
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBiblicalEventScript = async (eventTitle: string, eventDescription: string) => {
  const prompt = `Generate a podcast-style invitation script for an event called "${eventTitle}".
  
  CRITICAL GUIDELINES:
  1. BIBLICAL: Start with a concise, powerful spiritual truth or scripture reference that fits the event.
  2. CONCISE: Keep the entire script under 80 words. No fluff.
  3. PRACTICAL: Explicitly state what the attendee will gain or do (the practical value).
  4. INTERESTING: Use a warm, engaging "podcast host" persona. Make it sound like something someone would actually want to listen to.
  
  Context: ${eventDescription}
  
  Format: A single spoken paragraph that flows naturally and invites them in.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Gather together in faith and purpose. Join us for this special occasion as we grow together in fellowship and spiritual strength.";
  } catch (error) {
    console.error("Error generating script:", error);
    return "Gather together in faith and purpose. Join us for this special occasion as we grow together in fellowship and spiritual strength.";
  }
};

export const generateConfirmationEmails = async (eventTitle: string, registrantName: string, registrationDetails: string) => {
  const prompt = `Generate two separate email bodies for the event "${eventTitle}".
  Registrant: "${registrantName}".
  Details: "${registrationDetails}".

  REQUIREMENTS:
  - Both emails must be BIBLICAL, CONCISE, PRACTICAL, and INTERESTING.
  - Registrant Email: A warm welcome, a short encouraging word (biblical), and practical "what's next" info.
  - Admin Email: A practical summary for the director to process.

  Return as JSON: {"registrantEmail": "...", "adminEmail": "..."}. 
  Keep content under 100 words per email.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            registrantEmail: {
              type: Type.STRING,
              description: "The confirmation email content for the registrant.",
            },
            adminEmail: {
              type: Type.STRING,
              description: "The notification email content for the administrator.",
            },
          },
          required: ["registrantEmail", "adminEmail"],
        },
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error generating emails:", error);
    return {
      registrantEmail: "Thank you for registering! We are blessed to have you join us. Stay tuned for further details.",
      adminEmail: `New registration for ${eventTitle} by ${registrantName}. Please verify payment on Cash App.`
    };
  }
};
