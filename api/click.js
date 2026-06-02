import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function safeRedirect(value, fallback) {
  if (!value) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    const url = new URL(decoded);
    if (url.protocol === 'http:' || url.protocol === 'https:') return decoded;
    return fallback;
  } catch (_) {
    return fallback;
  }
}

export default async function handler(req, res) {
  const campaignId = req.query.campaign_id || req.query.c;
  const clientId = req.query.cliente_id || req.query.client_id || req.query.u;
  const fallback = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  const target = safeRedirect(req.query.to, fallback);

  try {
    if (supabaseUrl && supabaseAnonKey && campaignId && clientId) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      await supabase.rpc('chamy_track_click', {
        p_campanha_id: campaignId,
        p_cliente_id: clientId
      });
    }
  } catch (error) {
    console.error('Erro ao registrar clique Chamy:', error);
  }

  res.writeHead(302, { Location: target });
  res.end();
}
