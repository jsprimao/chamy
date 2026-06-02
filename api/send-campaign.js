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

    debug.step = 'buscando clientes push';
    const { data: clients, error: clientsError } = await supabase
      .from('clientes')
      .select('id')
      .eq('loja_id', campaign.loja_id)
      .eq('aceitou_push', true)
      .eq('status', 'ativo');

    if (clientsError) return json(res, 400, { ok: false, error: clientsError.message, debug });

    debug.pushClientsInSupabase = clients?.length || 0;

    // MVP v5: envio para todos os inscritos do app OneSignal.
    // Motivo: garante teste real enquanto validamos tags/segmentos por loja.
    // Próxima etapa: segmentar por tag loja_id de forma definitiva.
    const payload = {
      app_id: oneSignalAppId,
      headings: { en: campaign.titulo || 'Chamy', pt: campaign.titulo || 'Chamy' },
      contents: { en: campaign.mensagem || 'Você tem uma novidade.', pt: campaign.mensagem || 'Você tem uma novidade.' },
      included_segments: ['Subscribed Users'],
      url: campaign.link || undefined,
      chrome_web_icon: `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/favicon.png`,
      chrome_web_badge: `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/favicon.png`,
      data: {
        campaign_id: campaign.id,
        loja_id: campaign.loja_id,
        chamy: true,
        mode
      }
    };

    // Se desejar testar segmentação por loja depois, troque o modo no frontend/API.
    if (mode === 'loja_tag') {
      delete payload.included_segments;
      payload.filters = [{ field: 'tag', key: 'loja_id', relation: '=', value: campaign.loja_id }];
    }

    debug.step = 'enviando para OneSignal';
    debug.oneSignalPayloadMode = mode === 'loja_tag' ? 'filters.loja_id' : 'included_segments.Subscribed Users';

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Basic ${oneSignalRestKey}`
      },
      body: JSON.stringify(payload)
    });

    const raw = await response.text();
    let oneSignalResult = {};
    try { oneSignalResult = raw ? JSON.parse(raw) : {}; } catch (_) { oneSignalResult = { raw }; }
    debug.oneSignalStatus = response.status;
    debug.oneSignalResponse = oneSignalResult;

    if (!response.ok) {
      return json(res, 400, {
        ok: false,
        error: oneSignalResult.errors?.[0] || oneSignalResult.error || 'Erro no envio OneSignal.',
        debug
      });
    }

    debug.step = 'registrando envios';
    if (clients?.length) {
      const rows = clients.map((client) => ({
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
      notificationId: oneSignalResult.id || null,
      recipients: oneSignalResult.recipients ?? 0,
      supabasePushClients: clients?.length || 0,
      enviosInserted: debug.enviosInserted,
      enviosError: debug.enviosError,
      oneSignal: oneSignalResult,
      debug
    });
  } catch (error) {
    debug.exception = error?.stack || error?.message || String(error);
    return json(res, 500, { ok: false, error: error.message || 'Erro inesperado.', debug });
  }
}
