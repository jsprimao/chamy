import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const oneSignalAppId = process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID;
const oneSignalRestKey = process.env.ONESIGNAL_REST_API_KEY;

function json(res, status, body) { return res.status(status).json(body); }
function isUrl(value) { return /^https?:\/\//i.test(String(value || '')); }

async function sendOne(campaign, client, loja, origin) {
  const logoUrl = isUrl(loja?.logo_url) ? loja.logo_url : null;
  const campaignImageUrl = isUrl(campaign.imagem_url) ? campaign.imagem_url : null;
  const clickUrl = `${origin}/api/click?campaign_id=${encodeURIComponent(campaign.id)}&cliente_id=${encodeURIComponent(client.id)}&to=${encodeURIComponent(campaign.link)}`;
  const payload = {
    app_id: oneSignalAppId,
    headings: { en: campaign.titulo || loja?.nome || 'Chamy', pt: campaign.titulo || loja?.nome || 'Chamy' },
    contents: { en: campaign.mensagem || 'Você tem uma novidade.', pt: campaign.mensagem || 'Você tem uma novidade.' },
    url: clickUrl,
    chrome_web_icon: logoUrl || `${origin}/app-icon.png`,
    chrome_web_badge: `${origin}/favicon.png`,
    chrome_web_image: campaignImageUrl || logoUrl || undefined,
    big_picture: campaignImageUrl || undefined,
    include_subscription_ids: [client.onesignal_subscription_id],
    ttl: 86400,
    priority: 10,
    data: { campaign_id: campaign.id, cliente_id: client.id, loja_id: campaign.loja_id, chamy: true, scheduled: true }
  };
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Basic ${oneSignalRestKey}` },
    body: JSON.stringify(payload)
  });
  const raw = await response.text();
  let result = {};
  try { result = raw ? JSON.parse(raw) : {}; } catch { result = { raw }; }
  return { ok: response.ok, status: response.status, result };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return json(res, 405, { ok: false, error: 'Método não permitido.' });
  if (!supabaseUrl || !serviceRoleKey) return json(res, 500, { ok: false, error: 'Configure SUPABASE_SERVICE_ROLE_KEY na Vercel para processar agendamentos.' });
  if (!oneSignalAppId || !oneSignalRestKey) return json(res, 500, { ok: false, error: 'OneSignal não configurado.' });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  const now = new Date().toISOString();

  const { data: campaigns, error } = await supabase
    .from('campanhas')
    .select('*')
    .eq('status', 'Programada')
    .not('agendada_para', 'is', null)
    .lte('agendada_para', now)
    .limit(10);
  if (error) return json(res, 500, { ok: false, error: error.message });

  const results = [];
  for (const campaign of campaigns || []) {
    if (!isUrl(campaign.link)) {
      await supabase.from('campanhas').update({ status: 'Erro: link inválido' }).eq('id', campaign.id);
      results.push({ campaignId: campaign.id, sent: 0, error: 'link inválido' });
      continue;
    }
    const { data: loja } = await supabase.from('lojas').select('id,nome,logo_url').eq('id', campaign.loja_id).maybeSingle();
    const { data: clients, error: clientsError } = await supabase
      .from('clientes')
      .select('id,onesignal_subscription_id')
      .eq('loja_id', campaign.loja_id)
      .eq('aceitou_push', true)
      .eq('status', 'ativo')
      .not('onesignal_subscription_id', 'is', null);
    if (clientsError) {
      results.push({ campaignId: campaign.id, sent: 0, error: clientsError.message });
      continue;
    }
    const sent = [];
    const failures = [];
    for (const client of clients || []) {
      const r = await sendOne(campaign, client, loja, origin);
      if (r.ok) sent.push(client); else failures.push(r);
    }
    if (sent.length) {
      await supabase.from('envios').insert(sent.map(client => ({ campanha_id: campaign.id, cliente_id: client.id, recebido: true, clicou: false })));
    }
    await supabase.from('campanhas').update({ status: sent.length ? 'Enviada' : 'Erro no envio' }).eq('id', campaign.id);
    results.push({ campaignId: campaign.id, sent: sent.length, failures: failures.length });
  }

  return json(res, 200, { ok: true, processed: results.length, results });
}
