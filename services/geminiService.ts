import { GoogleGenAI, Type } from "@google/genai";
import { ArticleData, CoverStyle, GenerationConfig, GenModel } from "../types";

// Helper to get the AI instance
const getAiClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.warn("API_KEY is missing. Please configure it in your environment.");
        // We throw here so the UI can catch it and display a friendly error
        throw new Error("API Key is missing. Please configure process.env.API_KEY.");
    }
    return new GoogleGenAI({ apiKey });
};

/**
 * Step 1: Analyze the text and generate a visual prompt description.
 * Uses a fast text model.
 */
export const generateVisualDescription = async (
  article: ArticleData,
  style: CoverStyle
): Promise<string> => {
  const ai = getAiClient();
  
  const systemInstruction = `
    You are an award-winning scientific illustrator and art director for journals like ${article.journalName || 'Nature, Science, and Cell'}.
    Your task is to convert a scientific abstract or article summary into a vivid, visually striking description for a cover art image.
    
    Rules:
    1.  NO TEXT: The image must be purely visual. Do not include charts, graphs, or words.
    2.  METAPHORICAL & ARTISTIC: Do not just depict the experiment. Use metaphors, abstract 3D structures, or hyper-realistic macro photography styles.
    3.  STYLE: Adhere to the requested style: ${style}.
    4.  OUTPUT: Return ONLY the prompt string to be fed into an image generation model. Keep it concise (under 100 words) but descriptive regarding lighting, texture, composition, and subject.
  `;

  const userPrompt = `
    Title: ${article.title}
    Content: ${article.content}
    
    Generate the image generation prompt now.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
      systemInstruction: systemInstruction,
      thinkingConfig: { thinkingBudget: 0 } 
    }
  });

  return response.text || "A scientific abstract representation.";
};

/**
 * Step 2: Generate the actual image using the visual description.
 */
export const generateCoverImage = async (
  visualPrompt: string,
  config: GenerationConfig
): Promise<string> => {
  const ai = getAiClient();

  // Check for AI Studio specific features if available
  if (config.model === GenModel.PRO_IMAGE) {
     if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await window.aistudio.openSelectKey();
        }
     }
  }

  const response = await ai.models.generateContent({
    model: config.model,
    contents: {
      parts: [{ text: visualPrompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: config.aspectRatio,
        ...(config.model === GenModel.PRO_IMAGE ? { imageSize: "2K" } : {}) 
      }
    }
  });

  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("No image data found in response.");
};

/**
 * Step 3: Refine/Edit an existing image based on user instructions.
 */
export const refineCoverImage = async (
  currentImageBase64: string,
  instruction: string,
  config: GenerationConfig
): Promise<string> => {
  const ai = getAiClient();

  // Strip prefix for API usage if present
  const base64Data = currentImageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

  if (config.model === GenModel.PRO_IMAGE) {
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
       const hasKey = await window.aistudio.hasSelectedApiKey();
       if (!hasKey) {
           await window.aistudio.openSelectKey();
       }
    }
 }

  const response = await ai.models.generateContent({
    model: config.model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Data
          }
        },
        { text: instruction }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: config.aspectRatio,
         ...(config.model === GenModel.PRO_IMAGE ? { imageSize: "2K" } : {}) 
      }
    }
  });

  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("No image data found in refinement response.");
};

/**
 * Extract Metadata from PDF using Gemini Flash Multimodal capabilities.
 */
export const extractPdfMetadata = async (pdfBase64: string): Promise<ArticleData> => {
  const ai = getAiClient();
  const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data
          }
        },
        { text: "Extract the following information from this research paper: Title, Author list (comma separated), and Abstract. Return in JSON format." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          authors: { type: Type.STRING },
          abstract: { type: Type.STRING },
          journal: { type: Type.STRING, description: "Journal name if found" }
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Could not extract text from PDF");
  
  const json = JSON.parse(text);
  
  return {
    title: json.title || "",
    authors: json.authors || "",
    content: json.abstract || "",
    journalName: json.journal || ""
  };
};

/**
 * Fetch Metadata from DOI
 */
export const fetchDoiMetadata = async (doi: string): Promise<ArticleData> => {
  const cleanDoi = doi.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, '');
  try {
    const response = await fetch(`https://api.crossref.org/works/${cleanDoi}`);
    if (!response.ok) throw new Error("DOI not found");
    const data = await response.json();
    const item = data.message;
    
    // Construct author string
    const authors = item.author 
      ? item.author.map((a: any) => `${a.given} ${a.family}`).join(', ')
      : "";

    return {
      title: item.title?.[0] || "Untitled",
      content: item.abstract || "No abstract available via DOI. Please paste content manually.",
      doi: cleanDoi,
      authors: authors,
      journalName: item['container-title']?.[0] || ""
    };
  } catch (error) {
    console.error("DOI Fetch Error", error);
    throw new Error("Could not fetch DOI data. Please enter text manually.");
  }
};