import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(status).json(body);
}

function slugify(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'loja';
}

function isUuid(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function normalizeStatus(status = '') {
  return String(status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Método não permitido.' });
    if (!supabaseUrl || !supabaseAnonKey) return json(res, 500, { ok: false, error: 'Supabase não configurado na Vercel.' });

    const identifier = String(req.query.identifier || '').trim();
    if (!identifier) return json(res, 400, { ok: false, error: 'Link da loja incompleto.' });

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    let loja = null;

    if (isUuid(identifier)) {
      const { data, error } = await supabase
        .from('lojas')
        .select('id,user_id,nome,site,whatsapp,cidade,status,logo_url,created_at')
        .eq('id', identifier)
        .maybeSingle();
      if (error) throw error;
      loja = data || null;
    } else {
      const { data, error } = await supabase
        .from('lojas')
        .select('id,user_id,nome,site,whatsapp,cidade,status,logo_url,created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const activeStores = (data || []).filter((l) => ['ativa', 'ativo', 'teste', ''].includes(normalizeStatus(l.status)));
      loja = activeStores.find((l) => slugify(l.nome) === identifier) || (activeStores.length === 1 ? activeStores[0] : null);
    }

    if (!loja) return json(res, 404, { ok: false, error: 'Loja não encontrada. Peça ao vendedor o link público atualizado.' });

    return json(res, 200, { ok: true, loja });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Erro ao carregar loja.' });
  }
}
