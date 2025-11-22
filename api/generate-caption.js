// api/generate-caption.js
// Vercel Serverless function (Node.js). Uses fetch to call OpenAI.
// Requires environment variable OPENAI_API_KEY set in Vercel.

const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(500).json({ error: 'OpenAI key not configured on server' });
    }

    // Build a simple message for caption generation
    const systemMsg = "You are a helpful assistant that writes short engaging social media captions (1-3 lines) tailored to the user's input.";
    const userMsg = `Write 5 short Instagram captions for: ${prompt}\nKeep them punchy, emoji-friendly, and 1-2 sentences each.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // or change to a model you have access to
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg }
        ],
        max_tokens: 250,
        temperature: 0.8,
        n: 1
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error('OpenAI error', txt);
      return res.status(502).json({ error: 'OpenAI API error', details: txt });
    }

    const json = await response.json();
    const output = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content
      ? json.choices[0].message.content
      : 'Sorry — no caption received.';

    return res.status(200).json({ captions: output });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
