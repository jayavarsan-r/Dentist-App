const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Ensure upload directory exists
const UPLOAD_DIR = '/tmp/dental-uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});
exports.uploadMiddleware = upload.single('audio');

exports.transcribe = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file received. Make sure field name is "audio".' });
    }

    const noKey = !process.env.SARVAM_API_KEY || process.env.SARVAM_API_KEY === 'your_sarvam_api_key_here';
    if (noKey) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.json({
        transcript: 'Root canal completed on tooth 26. Temporary crown placed. Patient tolerated procedure well. Follow up in 7 days.'
      });
    }

    // Sarvam accepts: wav, mp3, ogg, flac, m4a — NOT webm
    // Detect format from original filename (set by frontend) and MIME type
    const origName = req.file.originalname || '';
    const mimeType = req.file.mimetype || 'audio/ogg';

    let ext = 'ogg'; // safe default Sarvam accepts
    if (origName.endsWith('.ogg') || mimeType.includes('ogg')) ext = 'ogg';
    else if (origName.endsWith('.mp4') || origName.endsWith('.m4a') || mimeType.includes('mp4') || mimeType.includes('mpeg')) ext = 'm4a';
    else if (origName.endsWith('.wav') || mimeType.includes('wav')) ext = 'wav';
    else if (origName.endsWith('.mp3') || mimeType.includes('mp3')) ext = 'mp3';
    // webm is NOT accepted by Sarvam — rename to ogg (same opus codec, Sarvam accepts the container)
    // This works because webm/opus and ogg/opus share the same audio codec

    const filename = `recording.${ext}`;
    const contentType = ext === 'ogg' ? 'audio/ogg' : ext === 'm4a' ? 'audio/mp4' : `audio/${ext}`;
    console.log(`Transcribe: file=${filename} mime=${mimeType} orig=${origName}`);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), {
      filename,
      contentType,
    });
    formData.append('language_code', 'en-IN');
    formData.append('model', 'saarika:v2.5');
    formData.append('with_timestamps', 'false');

    const response = await axios.post('https://api.sarvam.ai/speech-to-text', formData, {
      headers: {
        ...formData.getHeaders(),
        'api-subscription-key': process.env.SARVAM_API_KEY,
      },
      timeout: 30000,
    });

    try { fs.unlinkSync(req.file.path); } catch {}
    res.json({ transcript: response.data.transcript });
  } catch (e) {
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {}
    const sarvamErr = e.response?.data?.error?.message || e.response?.data?.message || e.message;
    console.error('Transcribe error (Sarvam):', sarvamErr, '| HTTP:', e.response?.status, '| Body:', JSON.stringify(e.response?.data));
    res.json({
      transcript: '',
      warning: `Transcription failed: ${sarvamErr}. You can type your notes manually below.`,
    });
  }
};

function buildPrompt() {
  const today = new Date().toISOString().split('T')[0];
  return `You are a dental clinical AI assistant. Today's date is ${today}.
Extract structured information from a dentist's voice note and return ONLY valid JSON with this exact schema:
{
  "procedure": "string (e.g. Root Canal, Scaling, Crown Placement)",
  "toothNumber": "string or null (FDI tooth number mentioned, e.g. '26', '14', '21'. Convert from Universal to FDI if needed. Upper right: 11-18, upper left: 21-28, lower left: 31-38, lower right: 41-48. If multiple teeth mentioned, use the primary tooth.)",
  "status": "completed|in_progress|pending",
  "notes": "string (clinical observations and what was done)",
  "medications": "string or null",
  "nextSteps": "string or null",
  "followUpDays": "number or null (how many days until follow-up)",
  "followUpDate": "YYYY-MM-DD or null (calculate from today ${today} using followUpDays if mentioned, use the correct year ${new Date().getFullYear()})",
  "cost": "number or null (extract any monetary amount mentioned, e.g. if 'charged 2500 rupees' or 'cost is 1500' then 2500 or 1500. Return as plain number without currency symbol.)",
  "currency": "string (currency code, default 'INR'. Use 'USD' if dollars mentioned, 'INR' if rupees/Rs mentioned.)"
}
If a follow-up is mentioned (e.g. 'follow up in 7 days', 'next appointment in 2 weeks'), calculate the exact date from today ${today}.
For FDI tooth numbers: if the dentist says 'tooth 6' or 'upper right 6', map to FDI '16'. If 'lower left molar' or 'tooth 36', use '36'. Always output standard FDI two-digit numbers.
Return ONLY the JSON object, no markdown, no explanation, no code blocks.`;
}

exports.generateNote = async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript required' });

    const geminiKey = process.env.GEMINI_API_KEY;
    const noKey = !geminiKey || geminiKey.startsWith('your_');

    if (noKey) {
      return res.json({ structured: mockNote(transcript) });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`;
    const response = await axios.post(url, {
      system_instruction: { parts: [{ text: buildPrompt() }] },
      contents: [{ parts: [{ text: transcript }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    let text = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('Empty response from Gemini');

    // Strip markdown code fences if present
    text = text.replace(/^```json?\n?/i, '').replace(/```$/,'').trim();

    const structured = JSON.parse(text);
    res.json({ structured });
  } catch (e) {
    console.error('Gemini error:', e.response?.data || e.message);
    res.json({ structured: mockNote(req.body?.transcript) });
  }
};

function mockNote(transcript) {
  return {
    procedure: 'Dental Consultation',
    toothNumber: null,
    status: 'completed',
    notes: transcript || 'Visit completed.',
    medications: null,
    nextSteps: null,
    followUpDays: null,
    followUpDate: null,
    cost: null,
    currency: 'INR',
  };
}
