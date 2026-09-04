const fs = require('fs');
const path = require('path');
const https = require('https');
const { makeId } = require('../../db');
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Uses Gemini to turn a simple product name and description into a
 * professional high-end photography prompt with a hard timeout.
 */
const optimizePromptWithGemini = async (name, type, description = '', attempt = 1) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `Act as a Product Photographer. Write a 1-sentence HIGHLY DESCRIPTIVE prompt for an AI image generator.
    Object: "${name}" (Category: ${type})
    Description: "${description}"

    Instruction: Describe the exact physical shape, material (metallic, plastic, etc), and features.
    Style: 8k high-end studio product shot, macro photography, centered, clean solid white background, commercial softbox lighting.
    CRITICAL: No people, no hands, no text, no logos.
    Return ONLY the prompt text.`;

    console.log(`[AI] Asking Gemini to optimize prompt... (Attempt ${attempt})`);

    // Add a race to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini Hanging')), 10000)
    );

    const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise
    ]);

    const optimized = result.response.text().trim();
    console.log(`[AI] Gemini Response Received.`);
    return optimized;
  } catch (err) {
    console.error(`[AI] Gemini Error: ${err.message}`);
    const isBusy = err.message.includes('503') || err.message.includes('429') || err.message.includes('Hanging');
    if (isBusy && attempt < 2) {
        console.log(`[AI] Retrying Gemini in 1s...`);
        await new Promise(r => setTimeout(r, 1000));
        return optimizePromptWithGemini(name, type, description, attempt + 1);
    }
    return null;
  }
};

/**
 * Generates an image using a public AI model with retry logic.
 */
const generateProductImage = async (name, type, description = '', attempt = 1) => {
  console.log(`[AI] Starting process for: "${name}"`);

  let optimized = await optimizePromptWithGemini(name, type, description);

  if (!optimized) {
    console.log("[AI] Using Internal Hardware-Specific Fallback.");
    const lowerName = name.toLowerCase();
    let specificDesc = "professional hardware component";

    if (lowerName.includes('pendrive') || lowerName.includes('usb')) {
        specificDesc = "sleek metallic USB flash drive with a connector";
    } else if (lowerName.includes('dvr') || lowerName.includes('nvr')) {
        specificDesc = "black professional security video recorder box with rear ports";
    } else if (lowerName.includes('hard disk') || lowerName.includes('hdd')) {
        specificDesc = "internal 3.5 inch computer hard drive with metallic top and circuit board";
    } else if (lowerName.includes('camera')) {
        specificDesc = "professional security camera unit with glass lens";
    }

    optimized = `8k studio photography of a ${name}, ${specificDesc}. Centered, high resolution, sharp focus, clean white background, commercial lighting.`;
  }

  const finalPrompt = optimized.replace(/[\r\n]/g, ' ').slice(0, 850);
  const negative = "--no text, words, letters, font, watermark, logo, labels, hand, human, drawing, blur";

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt + " " + negative)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

  console.log(`[AI] Dispatching request to Image Generator...`);

  const filename = `ai-${Date.now()}-${makeId('img')}.jpg`;
  const filePath = path.join(__dirname, '../../../uploads', filename);

  try {
    return await new Promise((resolve, reject) => {
      const request = https.get(url, (res) => {
        if (res.statusCode !== 200) return reject(new Error(`Busy (${res.statusCode})`));
        const fileStream = fs.createWriteStream(filePath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`[AI] Image Saved: ${filename}`);
            resolve(`/uploads/${filename}`);
        });
      });
      request.on('error', (err) => reject(err));
      request.setTimeout(30000, () => { request.destroy(); reject(new Error('Timeout')); });
    });
  } catch (err) {
    if (attempt < 3) {
      console.log(`[AI] Generator error (${err.message}). Retrying...`);
      await new Promise(r => setTimeout(r, 2000));
      return generateProductImage(name, type, description, attempt + 1);
    }
    throw new Error('AI Engine is currently unresponsive. Please wait 10 seconds.');
  }
};

module.exports = {
  generateProductImage
};
