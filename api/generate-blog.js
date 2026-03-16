// Vercel serverless function for generating a blog via Google Gemini
// Caches generated posts in Upstash Redis (Vercel KV-style) keyed by topic.

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

  // Lazy-load Redis client to keep cold starts small.
  let redis = null;
  const useRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  if (useRedis) {
    const { Redis } = await import("@upstash/redis");
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    });
  }

  try {
    // Serve from cache if present.
    if (redis) {
      const cached = await redis.get(`blog:${topic}`);
      if (cached) {
        return res.status(200).json({ blog: cached, cached: true });
      }
    }

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

    // Cache the result for 6 hours if Redis is available.
    if (redis) {
      await redis.set(`blog:${topic}`, text, { ex: 6 * 60 * 60 });
    }

    return res.status(200).json({ blog: text });
  } catch (error) {
    const details = error?.response?.data || error.message;
    console.error("Gemini error:", details);
    return res.status(500).json({ error: "Error generating blog", details });
  }
};
