import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const oneSignalAppId = process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID;
const oneSignalRestKey = process.env.ONESIGNAL_REST_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase não configurado no servidor da Vercel.' });
    }
    if (!oneSignalAppId || !oneSignalRestKey) {
      return res.status(500).json({ error: 'OneSignal não configurado no servidor. Cadastre ONESIGNAL_REST_API_KEY e ONESIGNAL_APP_ID/VITE_ONESIGNAL_APP_ID na Vercel.' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Sessão não enviada.' });

    const { campaignId } = req.body || {};
    if (!campaignId) return res.status(400).json({ error: 'Campanha não informada.' });

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: campaign, error: campaignError } = await supabase
      .from('campanhas')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: campaignError?.message || 'Campanha não encontrada ou sem permissão.' });
    }

    const { data: clients, error: clientsError } = await supabase
      .from('clientes')
      .select('id')
      .eq('loja_id', campaign.loja_id)
      .eq('aceitou_push', true)
      .eq('status', 'ativo');

    if (clientsError) return res.status(400).json({ error: clientsError.message });

    const payload = {
      app_id: oneSignalAppId,
      headings: { en: campaign.titulo || 'Chamy', pt: campaign.titulo || 'Chamy' },
      contents: { en: campaign.mensagem || 'Você tem uma novidade.', pt: campaign.mensagem || 'Você tem uma novidade.' },
      filters: [
        { field: 'tag', key: 'loja_id', relation: '=', value: campaign.loja_id }
      ],
      url: campaign.link || undefined,
      chrome_web_icon: '/favicon.png'
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Basic ${oneSignalRestKey}`
      },
      body: JSON.stringify(payload)
    });

    const oneSignalResult = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(400).json({ error: oneSignalResult.errors?.[0] || oneSignalResult.error || 'Erro no envio OneSignal.', detail: oneSignalResult });
    }

    if (clients?.length) {
      const rows = clients.map((client) => ({
        campanha_id: campaign.id,
        cliente_id: client.id,
        recebido: true,
        clicou: false
      }));
      await supabase.from('envios').insert(rows);
    }

    await supabase.from('campanhas').update({ status: 'Enviada' }).eq('id', campaign.id);

    return res.status(200).json({
      ok: true,
      id: oneSignalResult.id,
      recipients: oneSignalResult.recipients ?? clients?.length ?? 0,
      oneSignal: oneSignalResult
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro inesperado.' });
  }
}
