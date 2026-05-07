// Cloudflare Pages Function — POST /api/subscribe
// Env vars needed (set in Cloudflare Pages dashboard):
//   BREVO_API_KEY   — your Brevo (Sendinblue) API key
//   BREVO_LIST_ID   — numeric ID of the target contact list

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://le-francais-moyen.com',
    'Content-Type': 'application/json',
  };

  let email;
  try {
    const body = await request.json();
    email = (body.email || '').trim().toLowerCase();
  } catch {
    return new Response(JSON.stringify({ error: 'Corps de requête invalide.' }), { status: 400, headers: corsHeaders });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Adresse email invalide.' }), { status: 400, headers: corsHeaders });
  }

  const apiKey = env.BREVO_API_KEY;
  const listId = parseInt(env.BREVO_LIST_ID, 10);

  if (!apiKey || !listId) {
    // Graceful degradation: log & succeed so the form isn't broken during dev
    console.error('BREVO_API_KEY or BREVO_LIST_ID not configured');
    return new Response(JSON.stringify({ ok: true, dev: true }), { status: 200, headers: corsHeaders });
  }

  const payload = {
    email,
    listIds: [listId],
    updateEnabled: true,
    attributes: { SOURCE: 'le-francais-moyen.com' },
  };

  const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  // 201 = created, 204 = already exists (updateEnabled)
  if (brevoRes.status === 201 || brevoRes.status === 204) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  let errMsg = 'Erreur serveur. Réessayez.';
  try {
    const errBody = await brevoRes.json();
    if (errBody.message) errMsg = errBody.message;
  } catch { /* ignore */ }

  return new Response(JSON.stringify({ error: errMsg }), { status: 502, headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://le-francais-moyen.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
