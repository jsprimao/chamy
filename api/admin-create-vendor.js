import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, body) {
  return res.status(status).json(body);
}

function normalizePlan(plan = 'gratis') {
  const key = String(plan || 'gratis').toLowerCase();
  return ['gratis', 'pro', 'business'].includes(key) ? key : 'gratis';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Método não permitido.' });

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return json(res, 500, { ok: false, error: 'Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return json(res, 401, { ok: false, error: 'Sessão do administrador não enviada.' });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: callerData, error: callerError } = await admin.auth.getUser(token);
    if (callerError || !callerData?.user) return json(res, 401, { ok: false, error: 'Sessão inválida.' });

    const { data: callerProfile, error: profileError } = await admin
      .from('profiles')
      .select('id,tipo,status')
      .eq('id', callerData.user.id)
      .maybeSingle();

    if (profileError) return json(res, 400, { ok: false, error: profileError.message });
    if (!callerProfile || callerProfile.tipo !== 'admin' || callerProfile.status !== 'ativo') {
      return json(res, 403, { ok: false, error: 'Apenas o dono/admin ativo pode criar contas pelo painel master.' });
    }

    const { name, email, password, storeName, plan = 'gratis', status = 'ativo' } = req.body || {};
    if (!name || !email || !password || !storeName) {
      return json(res, 400, { ok: false, error: 'Preencha nome, e-mail, senha e nome da loja.' });
    }
    if (String(password).length < 6) return json(res, 400, { ok: false, error: 'A senha precisa ter pelo menos 6 caracteres.' });

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome: name, store_name: storeName }
    });

    if (createError) return json(res, 400, { ok: false, error: createError.message });
    const userId = created.user.id;
    const planKey = normalizePlan(plan);

    const { error: profileUpsertError } = await admin.from('profiles').upsert({
      id: userId,
      nome: name,
      email,
      tipo: 'vendedor',
      plano: planKey,
      status: status || 'ativo'
    });
    if (profileUpsertError) return json(res, 400, { ok: false, error: profileUpsertError.message });

    const { data: existingStore } = await admin.from('lojas').select('id').eq('user_id', userId).limit(1).maybeSingle();
    if (!existingStore) {
      const { error: storeError } = await admin.from('lojas').insert({
        user_id: userId,
        nome: storeName,
        status: status === 'ativo' ? 'ativa' : status
      });
      if (storeError) return json(res, 400, { ok: false, error: storeError.message });
    }

    return json(res, 200, { ok: true, userId, email, plan: planKey });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Erro inesperado ao criar vendedor.' });
  }
}
