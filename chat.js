// /api/chat.js
// Vercel Serverless Function — Omkar AI Backend
// Deploy to Vercel. Set OPENAI_API_KEY in Environment Variables.

export default async function handler(req, res) {
  // CORS headers (adjust origin in production)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
  }

  // Build messages array
  const systemPrompt = {
    role: 'system',
    content: `You are Omkar's personal AI assistant. Be helpful, smart, and slightly friendly but not overly casual. 
You excel at coding, study help, productivity tips, and thoughtful life advice.
Keep responses concise and well-structured. Use markdown formatting when it aids clarity (code blocks, lists, etc.).
Never mention that you are ChatGPT or made by OpenAI — you are "Omkar AI".`
  };

  // Sanitize and limit history (last 20 turns to control token usage)
  const sanitizedHistory = history
    .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content }));

  const messages = [
    systemPrompt,
    ...sanitizedHistory,
    { role: 'user', content: message.trim() }
  ];

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 1500,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });

    if (!openaiRes.ok) {
      const errData = await openaiRes.json().catch(() => ({}));
      const msg = errData?.error?.message || `OpenAI error ${openaiRes.status}`;
      console.error('[Omkar AI] OpenAI error:', msg);
      return res.status(502).json({ error: msg });
    }

    const data = await openaiRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({ error: 'Empty response from OpenAI' });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('[Omkar AI] Server error:', err);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
}
