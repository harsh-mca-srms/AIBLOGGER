// Vercel serverless function to store sign-up details in Upstash Redis
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body || {};

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return res.status(500).json({ error: "Redis env vars are not set" });
  }

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const { createHash } = await import("crypto");
    const { Redis } = await import("@upstash/redis");

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    });

    const passwordHash = createHash("sha256").update(password).digest("hex");
    const userKey = `user:${email.toLowerCase()}`;

    await redis.set(userKey, JSON.stringify({
      email,
      passwordHash,
      createdAt: new Date().toISOString()
    }));

    return res.status(200).json({ ok: true });
  } catch (error) {
    const details = error?.response?.data || error.message;
    console.error("Signup error:", details);
    return res.status(500).json({ error: "Failed to save user", details });
  }
}
