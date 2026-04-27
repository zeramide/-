/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GenerationStatus {
  IDLE = 'IDLE',
  REFINING = 'REFINING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export enum RefinementModel {
  FLASH = 'gemini-3-flash-preview',
  THINKING = 'gemini-2.0-flash-thinking-exp-01-21',
}

export enum ImageResolution {
  R720P = '720p',
  R1080P = '1080p',
  R2048P = '2048p',
}

export enum ImageAspectRatio {
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  SQUARE = '1:1',
}

export interface ImagePrompt {
  id: string;
  rawInput: string;
  refinedPrompt?: string;
  imageUrl?: string;
  status: GenerationStatus;
  error?: string;
}

export interface MasterStyle {
  name: string;
  description: string;
  customInstructions?: string;
}

export const DEFAULT_STYLES: MasterStyle[] = [
  {
    name: 'Cinematic Photorealistic',
    description: 'High contrast, dramatic lighting, detailed textures, 8k resolution, shot on 35mm lens.',
  },
  {
    name: 'Dreamy Watercolor',
    description: 'Soft edges, pastel color palette, paper texture, elegant strokes, ethereal mood.',
  },
  {
    name: 'Futuristic Cyberpunk',
    description: 'Neon lights, rainy nights, high-tech details, blue and magenta tones, synthwave aesthetic.',
  },
  {
    name: 'Studio Ghibli Style',
    description: 'Hand-drawn animation feel, lush landscapes, warm nostalgic lighting, vibrant organic colors.',
  },
  {
    name: 'Classic Comic Book',
    description: 'Bold ink lines, cel shading, vibrant primary colors, halftone dots, dynamic action-focused composition.',
  },
  {
    name: 'Minimalist 3D Render',
    description: 'Clean geometry, soft shadows, clay-like materials, isometric view, bright studio lighting.',
  },
];
