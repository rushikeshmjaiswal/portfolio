// /api/generate-caption.js
// Vercel Node serverless function — uses built-in fetch (no node-fetch).
// Make sure OPENAI_API_KEY is set in Vercel env vars.

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Accept either { description: "..." } or { prompt: "..." }
    const body = req.body || {};
    const prompt = (body.description ?? body.prompt ?? "").toString().trim();

    if (!prompt) {
      return res.status(400).json({ error: "Missing description or prompt in request body" });
    }

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) {
      console.error("Missing OPENAI_API_KEY on server");
      return res.status(500).json({ error: "OpenAI API key not configured on server" });
    }

    const systemMsg = "You are a helpful assistant that writes short engaging social media captions (1-3 lines).";
    const userMsg = `Write 5 short Instagram captions for: ${prompt}\nKeep them punchy, emoji-friendly, and 1-2 sentences each.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // change to a model you have access to if needed
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: userMsg }
        ],
        max_tokens: 300,
        temperature: 0.8
      })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("OpenAI responded non-OK:", resp.status, txt);
      return res.status(502).json({ error: "OpenAI API error", details: txt });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? null;

    if (!content) {
      console.error("No content returned by OpenAI:", JSON.stringify(data).slice(0, 1000));
      return res.status(502).json({ error: "Invalid OpenAI response", raw: data });
    }

    return res.status(200).json({ captions: content.trim() });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Server error", message: String(err) });
  }
}
