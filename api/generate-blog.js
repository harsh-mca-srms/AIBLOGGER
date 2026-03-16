// Vercel serverless function for generating a blog via Google Gemini

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic } = req.body || {};

  if (!process.env.GOOGLE_API_KEY) {
    return res.status(500).json({ error: "GOOGLE_API_KEY is not set" });
  }

  if (!topic || typeof topic !== "string") {
    return res.status(400).json({ error: "Please provide a topic" });
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const modelId = process.env.GEMINI_MODEL_ID || "gemini-flash-latest";
    const model = genAI.getGenerativeModel({ model: modelId });
    const prompt = `Write a 1000 word SEO optimized blog on ${topic} with headings`;

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.();

    if (!text) {
      return res.status(500).json({ error: "No content returned from Gemini" });
    }

    return res.status(200).json({ blog: text });
  } catch (error) {
    const details = error?.response?.data || error.message;
    console.error("Gemini error:", details);
    return res.status(500).json({ error: "Error generating blog", details });
  }
};
