const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(cors());
app.use(express.json());
// Serve static files (e.g., index.html) from the project root.
app.use(express.static(__dirname));

// Explicit route for the root page.
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Expect the Google API key to be provided via environment variable.
// NOTE: Never hardcode secrets in source files.
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.post("/generate-blog", async (req, res) => {
  const topic = req.body.topic;

  if (!process.env.GOOGLE_API_KEY) {
    return res.status(500).json({ error: "GOOGLE_API_KEY env var is not set" });
  }

  if (!topic || typeof topic !== "string") {
    return res.status(400).json({ error: "Please provide a topic" });
  }

  try {
    // Use a known-available model; allow override via env MODEL_ID.
    const modelId = process.env.GEMINI_MODEL_ID || "gemini-flash-latest";
    const model = genAI.getGenerativeModel({ model: modelId });
    const prompt = `Write a 1000 word SEO optimized blog on ${topic} with headings`;

    const result = await model.generateContent(prompt);
    const text = result && result.response && typeof result.response.text === "function"
      ? result.response.text()
      : null;

    if (!text) {
      return res.status(500).json({ error: "No content returned from Gemini" });
    }

    res.json({ blog: text });
  } catch (error) {
    // Surface the Gemini error payload if available to ease debugging.
    const apiError = (error && error.response && error.response.data) || error.message;
    console.error("Gemini error:", apiError);
    res.status(500).json({ error: "Error generating blog", details: apiError });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
