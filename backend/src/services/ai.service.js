const axios = require('axios');

async function extractPrescription(voiceText) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const noKey = !geminiKey || geminiKey.startsWith('your_');

  if (noKey) {
    return {
      medicines: [{ name: 'Amoxicillin', dose: '500mg', frequency: '3 times daily', duration: '5 days', instructions: 'After food' }],
      instructions: 'Test prescription — configure GEMINI_API_KEY',
      followUp: null,
    };
  }

  const prompt = `You are a dental prescription assistant. Extract prescription details from this dentist's voice note and return ONLY valid JSON.

Schema:
{
  "medicines": [
    { "name": "string", "dose": "string", "frequency": "string", "duration": "string", "instructions": "string or null" }
  ],
  "instructions": "string or null — general patient instructions",
  "followUp": "string or null"
}

Return ONLY the JSON. No markdown. No explanation.

Voice note: ${voiceText}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`;

  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    let text = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('Empty response from Gemini');
    text = text.replace(/^```json?\n?/i, '').replace(/```$/, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('[AI] Prescription extraction error:', err.message);
    return {
      medicines: [{ name: 'Amoxicillin', dose: '500mg', frequency: '3 times daily', duration: '5 days', instructions: 'After food' }],
      instructions: 'Extraction failed — please add medicines manually',
      followUp: null,
    };
  }
}

module.exports = { extractPrescription };
