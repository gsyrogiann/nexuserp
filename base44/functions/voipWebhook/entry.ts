import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { fetchAllEntities } from '../_shared/fetchAll.ts';

/**
 * 3CX VoIP Webhook Handler
 * POST /voipWebhook
 * Authenticates via voip_api_key from AppSettings, identifies customer by phone,
 * creates CallLog, then triggers async AI analysis.
 */

function normalizePhone(raw) {
  if (!raw) return '';
  // Remove spaces, dashes, parentheses
  let n = raw.replace(/[\s\-().]/g, '');
  // Strip Greek/international prefixes
  if (n.startsWith('+30')) n = n.slice(3);
  else if (n.startsWith('0030')) n = n.slice(4);
  else if (n.startsWith('+')) n = n.slice(1);
  return n;
}

function phonesMatch(storedPhone, incomingNormalized) {
  if (!storedPhone || !incomingNormalized) return false;
  const stored = normalizePhone(storedPhone);
  // Check if either ends-with the other (handles 10-digit vs shorter stored)
  return stored.endsWith(incomingNormalized) || incomingNormalized.endsWith(stored);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // --- AUTH: validate api_key from header or query param ---
    const apiKeyHeader = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    const urlParams = new URL(req.url).searchParams;
    const apiKeyParam = urlParams.get('api_key');
    const incomingKey = apiKeyHeader || apiKeyParam;

    const settingsList = await base44.asServiceRole.entities.AppSettings.filter({ key: 'voip' });
    const settings = settingsList[0] || null;

    if (!settings) {
      return Response.json({ error: 'VoIP not configured. Add AppSettings with key=voip.' }, { status: 503 });
    }

    if (settings.voip_api_key && incomingKey !== settings.voip_api_key) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- PARSE PAYLOAD (3CX sends JSON) ---
    const body = await req.json();
    
    const callerNumber = body.callerID || body.caller_id || body.from || body.CallerID || '';
    const direction = (body.direction || body.call_type || 'inbound').toLowerCase().includes('out') ? 'outbound' : 'inbound';
    const duration = parseInt(body.duration || body.Duration || 0, 10);
    const extension = body.extension || body.Extension || body.agent || '';
    const recordingUrl = body.recording_url || body.RecordingUrl || body.recordingUrl || '';

    // --- CUSTOMER MATCHING ---
    const normalizedCaller = normalizePhone(callerNumber);
    let matchedCustomer = null;

    if (normalizedCaller) {
      const allCustomers = await fetchAllEntities(base44.asServiceRole.entities.Customer, { sort: 'name' });
      matchedCustomer = allCustomers.find((c) =>
        phonesMatch(c.phone, normalizedCaller) ||
        phonesMatch(c.mobile, normalizedCaller) ||
        phonesMatch(c.mobile2, normalizedCaller)
      ) || null;
    }

    // --- CREATE CALL LOG ---
    const callLog = await base44.asServiceRole.entities.CallLog.create({
      customer_id: matchedCustomer?.id || null,
      customer_name: matchedCustomer?.name || 'Unknown',
      caller_number: callerNumber,
      direction,
      duration,
      extension,
      recording_url: recordingUrl,
      ai_processed: false,
      raw_payload: JSON.stringify(body),
    });

    // --- TRIGGER AI ANALYSIS (async, best-effort) ---
    if (recordingUrl || body.transcript) {
      // Fire and forget - don't await so webhook responds fast
      analyzeCallAsync(base44, callLog.id, recordingUrl, body.transcript || '', settings).catch(console.error);
    }

    return Response.json({
      success: true,
      call_log_id: callLog.id,
      matched_customer: matchedCustomer ? matchedCustomer.name : null,
    });

  } catch (error) {
    console.error('VoIP Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function analyzeCallAsync(base44, callLogId, recordingUrl, existingTranscript, settings) {
  let transcript = existingTranscript;

  // --- WHISPER TRANSCRIPTION ---
  if (!transcript && recordingUrl && settings.whisper_host) {
    try {
      const whisperResponse = await fetch(`${settings.whisper_host}/asr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: recordingUrl, language: 'el' }),
      });
      if (whisperResponse.ok) {
        const whisperData = await whisperResponse.json();
        transcript = whisperData.text || whisperData.transcript || '';
      }
    } catch (e) {
      console.warn('Whisper transcription failed:', e.message);
    }
  }

  if (!transcript) return;

  // --- OLLAMA AI ANALYSIS ---
  let sentiment = 'neutral';
  let psychography = '';
  let aiSummary = '';

  const ollamaHost = settings.ollama_host || 'http://localhost:11434';
  try {
    const ollamaResponse = await fetch(`${ollamaHost}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt: `Analyze this customer call transcript. Return ONLY valid JSON with keys: sentiment (one of: positive, angry, neutral, skeptical), psychography (e.g. Price-sensitive, High-value, Churn-risk), summary (max 2 sentences in Greek).

Transcript:
${transcript}

JSON:`,
        stream: false,
      }),
    });

    if (ollamaResponse.ok) {
      const ollamaData = await ollamaResponse.json();
      const raw = ollamaData.response || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        sentiment = parsed.sentiment || 'neutral';
        psychography = parsed.psychography || '';
        aiSummary = parsed.summary || '';
      }
    }
  } catch (e) {
    console.warn('Ollama analysis failed:', e.message);
    // Fallback: use base44 LLM
    try {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Analyze this call transcript. Return JSON: {"sentiment": "positive|angry|neutral|skeptical", "psychography": "string", "summary": "max 2 sentences in Greek"}\n\nTranscript:\n${transcript}`,
        response_json_schema: {
          type: 'object',
          properties: {
            sentiment: { type: 'string' },
            psychography: { type: 'string' },
            summary: { type: 'string' },
          },
        },
      });
      sentiment = result?.sentiment || 'neutral';
      psychography = result?.psychography || '';
      aiSummary = result?.summary || '';
    } catch (e2) {
      console.warn('Fallback LLM also failed:', e2.message);
    }
  }

  // --- UPDATE CALL LOG ---
  await base44.asServiceRole.entities.CallLog.update(callLogId, {
    transcript,
    sentiment,
    psychography,
    ai_summary: aiSummary,
    ai_processed: true,
  });
}
