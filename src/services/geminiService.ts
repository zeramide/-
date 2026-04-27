/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { MasterStyle, RefinementModel } from "../types";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please configure it in your environment or Secrets panel.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Refines a raw prompt into a detailed one based on the Master Style.
 */
export async function refinePrompt(
  rawPrompt: string, 
  style: MasterStyle, 
  model: RefinementModel = RefinementModel.FLASH
): Promise<string> {
  const systemInstruction = `You are a professional AI image prompt engineer.
Your task is to take a simple user description and expand it into a detailed image generation prompt.

CORE STYLE: ${style.name}
STYLE SPECS: ${style.description}
${style.customInstructions ? `EXTRA SPECS: ${style.customInstructions}` : ""}

INSTRUCTIONS:
1. Primary Goal: Ensure the image maintains the CORE STYLE mentioned above for collection consistency.
2. Intent Alignment: If the user explicitly asks for a specific character or action, prioritize that subject.
3. Creative Expansion: Add details about lighting, camera angle, and atmosphere that reinforce the CORE STYLE.
4. Output: A single highly descriptive paragraph. No intros/outros.`;

  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: model,
    contents: `Transform this raw idea into a masterpiece: "${rawPrompt}"`,
    config: {
      systemInstruction,
      temperature: model === RefinementModel.THINKING ? undefined : 0.7, // Thinking models often handle temp differently
    },
  });

  return response.text || rawPrompt;
}

/**
 * Generates an image from a refined prompt.
 */
export async function generateImage(refinedPrompt: string): Promise<string> {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        { text: refinedPrompt },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image data returned from Gemini.");
}
