import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const oneSignalAppId = process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID;
const oneSignalRestKey = process.env.ONESIGNAL_REST_API_KEY;

function json(res, status, body) {
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Método não permitido.' });
  }

  const debug = {
    step: 'iniciado',
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasSupabaseAnonKey: Boolean(supabaseAnonKey),
    hasOneSignalAppId: Boolean(oneSignalAppId),
    hasOneSignalRestKey: Boolean(oneSignalRestKey),
    oneSignalStatus: null,
    oneSignalResponse: null,
    enviosInserted: 0,
    enviosError: null,
    campaignStatusError: null,
  };

  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return json(res, 500, { ok: false, error: 'Supabase não configurado no servidor da Vercel.', debug });
    }

    if (!oneSignalAppId || !oneSignalRestKey) {
      return json(res, 500, { ok: false, error: 'OneSignal não configurado no servidor. Confira VITE_ONESIGNAL_APP_ID e ONESIGNAL_REST_API_KEY na Vercel.', debug });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return json(res, 401, { ok: false, error: 'Sessão não enviada.', debug });

    const { campaignId, mode = 'all_subscribers' } = req.body || {};
    if (!campaignId) return json(res, 400, { ok: false, error: 'Campanha não informada.', debug });

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    debug.step = 'buscando campanha';
    const { data: campaign, error: campaignError } = await supabase
      .from('campanhas')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return json(res, 404, { ok: false, error: campaignError?.message || 'Campanha não encontrada ou sem permissão.', debug });
    }

    debug.campaign = { id: campaign.id, loja_id: campaign.loja_id, titulo: campaign.titulo };

    const { data: loja } = await supabase
      .from('lojas')
      .select('logo_url,nome')
      .eq('id', campaign.loja_id)
      .maybeSingle();

    const logoUrl = loja?.logo_url && /^https?:\/\//i.test(loja.logo_url) ? loja.logo_url : null;
    debug.storeLogoForPush = Boolean(logoUrl);

    debug.step = 'buscando clientes push';
    const { data: clients, error: clientsError } = await supabase
      .from('clientes')
      .select('id, onesignal_subscription_id')
      .eq('loja_id', campaign.loja_id)
      .eq('aceitou_push', true)
      .eq('status', 'ativo');

    if (clientsError) return json(res, 400, { ok: false, error: clientsError.message, debug });

    const pushClients = (clients || [])
      .map((client) => ({ id: client.id, subscriptionId: client.onesignal_subscription_id }))
      .filter((client) => Boolean(client.subscriptionId));

    const subscriptionIds = pushClients.map((client) => client.subscriptionId);

    debug.pushClientsInSupabase = clients?.length || 0;
    debug.oneSignalSubscriptionIds = subscriptionIds.length;

    if (!pushClients.length) {
      return json(res, 400, {
        ok: false,
        error: 'Nenhum cliente possui onesignal_subscription_id salvo. Vá em Captura Push e ative as notificações novamente neste navegador.',
        debug
      });
    }

    debug.step = 'enviando para OneSignal';
    debug.oneSignalPayloadMode = 'individual_click_tracking';

    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const defaultTarget = campaign.link || origin;
    const sentClients = [];
    const oneSignalResults = [];

    for (const client of pushClients) {
      const clickUrl = `${origin}/api/click?campaign_id=${encodeURIComponent(campaign.id)}&cliente_id=${encodeURIComponent(client.id)}&to=${encodeURIComponent(defaultTarget)}`;
      const payload = {
        app_id: oneSignalAppId,
        headings: { en: campaign.titulo || 'Chamy', pt: campaign.titulo || 'Chamy' },
        contents: { en: campaign.mensagem || 'Você tem uma novidade.', pt: campaign.mensagem || 'Você tem uma novidade.' },
        url: clickUrl,
        chrome_web_icon: logoUrl || `${origin}/favicon.png`,
        chrome_web_badge: logoUrl || `${origin}/favicon.png`,
        include_subscription_ids: [client.subscriptionId],
        data: {
          campaign_id: campaign.id,
          cliente_id: client.id,
          loja_id: campaign.loja_id,
          chamy: true,
          tracking: 'v9'
        }
      };

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Basic ${oneSignalRestKey}`
        },
        body: JSON.stringify(payload)
      });

      const raw = await response.text();
      let result = {};
      try { result = raw ? JSON.parse(raw) : {}; } catch (_) { result = { raw }; }
      oneSignalResults.push({ status: response.status, result, clientId: client.id });

      if (response.ok) {
        sentClients.push(client);
      }
    }

    debug.oneSignalStatus = oneSignalResults.some(r => r.status >= 400) ? 'partial_error' : 200;
    debug.oneSignalResponse = oneSignalResults;

    if (!sentClients.length) {
      return json(res, 400, {
        ok: false,
        error: oneSignalResults?.[0]?.result?.errors?.[0] || oneSignalResults?.[0]?.result?.error || 'Nenhuma notificação foi aceita pelo OneSignal.',
        debug
      });
    }

    debug.step = 'registrando envios';
    if (sentClients?.length) {
      const rows = sentClients.map((client) => ({
        campanha_id: campaign.id,
        cliente_id: client.id,
        recebido: true,
        clicou: false
      }));
      const { data: inserted, error: insertError } = await supabase.from('envios').insert(rows).select('id');
      if (insertError) {
        debug.enviosError = insertError.message;
      } else {
        debug.enviosInserted = inserted?.length || rows.length;
      }
    }

    const { error: updateError } = await supabase
      .from('campanhas')
      .update({ status: 'Enviada' })
      .eq('id', campaign.id);
    if (updateError) debug.campaignStatusError = updateError.message;

    debug.step = 'concluido';
    return json(res, 200, {
      ok: true,
      message: 'Campanha processada pela API do Chamy.',
      notificationId: oneSignalResults?.[0]?.result?.id || null,
      recipients: sentClients.length,
      supabasePushClients: clients?.length || 0,
      enviosInserted: debug.enviosInserted,
      enviosError: debug.enviosError,
      oneSignal: oneSignalResults,
      debug
    });
  } catch (error) {
    debug.exception = error?.stack || error?.message || String(error);
    return json(res, 500, { ok: false, error: error.message || 'Erro inesperado.', debug });
  }
}
