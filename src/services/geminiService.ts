/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { MasterStyle, RefinementModel, ImageAspectRatio, ImageResolution } from "../types";

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

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function generateContentWithRetry(ai: GoogleGenAI, config: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(config);
    } catch (error: any) {
      if (error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("high demand")) {
        if (attempt === maxRetries) {
          throw new Error("현재 Gemini 모델 사용량이 많아 접속이 지연되고 있습니다 (High Demand). 잠시 후 다시 시도해주세요.");
        }
        console.warn(`[Gemini API] 503 에러 발생. ${attempt}번째 재시도 중...`);
        const backoffTime = attempt * 2000; // 2s, 4s, 6s...
        await delay(backoffTime);
      } else {
        throw error;
      }
    }
  }
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
  const response = await generateContentWithRetry(ai, {
    model: model,
    contents: `Transform this raw idea into a masterpiece: "${rawPrompt}"`,
    config: {
      systemInstruction,
      temperature: model === RefinementModel.THINKING ? undefined : 0.7, // Thinking models often handle temp differently
    },
  }) as NonNullable<Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>>;

  return response.text || rawPrompt;
}

/**
 * Generates an image from a refined prompt.
 */
export async function generateImage(
  refinedPrompt: string,
  aspectRatio: ImageAspectRatio = ImageAspectRatio.SQUARE,
  resolution: ImageResolution = ImageResolution.R1080P
): Promise<string> {
  const ai = getAIClient();
  const finalPrompt = `${refinedPrompt}, Highly detailed, masterpiece, beautiful, ${resolution} resolution, HQ`;

  const response = await generateContentWithRetry(ai, {
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        { text: finalPrompt },
      ],
    },
    config: {
      outputConfig: {
        aspectRatio: aspectRatio,
      },
    },
  }) as NonNullable<Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>>;

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image data returned from Gemini.");
}
