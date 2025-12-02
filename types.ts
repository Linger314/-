export enum CoverStyle {
  REALISTIC = "Photorealistic, highly detailed, cinematic lighting",
  ABSTRACT_3D = "Abstract 3D data visualization, glassy materials, ethereal",
  MINIMALIST = "Minimalist, vector art, flat design, symbolic",
  SURREAL = "Surrealist, dreamlike, metaphorical, biological landscape",
  DIGITAL_ART = "Digital painting, vibrant colors, intricate details"
}

export enum AspectRatio {
  SQUARE = "1:1",
  PORTRAIT = "3:4", // Typical journal cover
  LANDSCAPE = "4:3",
  WIDE = "16:9"
}

export enum GenModel {
  FLASH_IMAGE = "gemini-2.5-flash-image",
  PRO_IMAGE = "gemini-3-pro-image-preview"
}

export interface GenerationConfig {
  model: GenModel;
  style: CoverStyle;
  aspectRatio: AspectRatio;
}

export interface ArticleData {
  title: string;
  content: string; // Abstract or full text
  doi?: string;
  authors?: string;
  journalName?: string;
}

export type GenerationStatus = 'idle' | 'analyzing' | 'generating' | 'refining' | 'completed' | 'error';