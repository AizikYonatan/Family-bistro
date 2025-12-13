import { GoogleGenAI, Type } from "@google/genai";
import { Order, MenuItem } from "../types";

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Generates a creative description for a menu item based on its name.
 */
export const generateMenuDescription = async (itemName: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short, mouth-watering restaurant menu description (max 20 words) for a dish called "${itemName}". Make it sound fancy but fun for a family restaurant.`,
    });
    return response.text || "A delicious surprise awaiting your tastebuds!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "A tasty dish prepared with love.";
  }
};

/**
 * Generates an image for a menu item.
 */
export const generateMenuImage = async (itemName: string, description: string): Promise<string | undefined> => {
  try {
    const ai = getAiClient();
    // Using flash-image for speed, or pro-image if higher quality needed.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A professional, appetizing food photography shot of ${itemName}: ${description}. High quality, restaurant lighting, 4k.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "4:3",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    return undefined;
  }
};

/**
 * Analyzes an order and gives the chef a tip or comment.
 */
export const generateChefComment = async (order: Order): Promise<string> => {
  try {
    const ai = getAiClient();
    const itemNames = order.items.map(i => i.name).join(", ");
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a head chef at a busy family restaurant. 
      A new order just came in for: ${itemNames}. 
      Give a short, encouraging 1-sentence comment to the line cook about preparing this. 
      Maybe a quick tip or a joke about the combination.`,
    });
    
    return response.text || "Let's get cooking! This order looks great.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Order received! Let's make it delicious.";
  }
};
