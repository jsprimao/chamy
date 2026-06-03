import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bell, BarChart3, Send, Zap, Users, Crown, Settings, Store, LifeBuoy, Plus, Search, Play, Pause, Trash2, Copy, ShieldCheck, MousePointerClick, MessageCircle, TrendingUp, ShoppingCart, Rocket, Gift, Sparkles, RotateCcw, Globe, CheckCircle2, Lock, LogOut, UserPlus, CreditCard, HelpCircle, Menu, MoreVertical, Mail, AlertCircle, QrCode, ExternalLink } from 'lucide-react';
import './styles.css';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const plans = {
  gratis: { label: 'Grátis', price: 'R$0', limit: 100, badge: 'Teste', features: ['Até 100 inscritos', 'Campanhas manuais', '1 loja', 'Marca Chamy', 'Suporte básico'] },
  pro: { label: 'Pro', price: 'R$39', limit: 1000, badge: 'Mais indicado', features: ['Até 1.000 inscritos', 'Campanhas programadas', 'Automações', 'Segmentação', 'Sem marca Chamy'] },
  business: { label: 'Business', price: 'R$149', limit: 10000, badge: 'Empresarial', features: ['Até 10.000 inscritos', 'Múltiplas lojas', 'Múltiplos usuários', 'Integrações/API', 'Suporte prioritário'] }
};

const emptyData = { vendors: [], customers: [], campaigns: [], tickets: [] };

function Button({ children, className = '', ...props }) { return <button className={`btn ${className}`} {...props}>{children}</button>; }
function Card({ children, className = '' }) { return <section className={`card ${className}`}>{children}</section>; }
function Badge({ children, tone = 'violet' }) { return <span className={`badge ${tone}`}>{children}</span>; }
function Logo({ compact = false }) { return <div className={compact ? 'brand compact' : 'brand'}><img src="/logo-chamy.png" alt="Chamy" /></div>; }
function normalizePlan(plan = 'gratis') { return String(plan).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function nicePlan(plan = 'gratis') { return plans[normalizePlan(plan)]?.label || plan || 'Grátis'; }
function slugify(text = '') { return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'loja'; }
function isUuid(value = '') { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim()); }


function parsePct(rate) {
  if (typeof rate === 'number') return rate;
  const n = Number(String(rate || '0').replace('%','').replace(',','.'));
  return Number.isFinite(n) ? n : 0;
}

function getPlanLimits(planKey = 'gratis') {
  const key = normalizePlan(planKey);
  if (key === 'business') return { subscribers: 10000, campaigns: null, label: 'Business' };
  if (key === 'pro') return { subscribers: 1000, campaigns: null, label: 'Pro' };
  return { subscribers: 100, campaigns: 20, label: 'Grátis' };
}

function calculateAnalytics(data, user) {
  const customers = data?.customers || [];
  const campaigns = data?.campaigns || [];
  const totalSent = campaigns.reduce((sum, campaign) => sum + Number(campaign.sent || 0), 0);
  const totalClicks = campaigns.reduce((sum, campaign) => sum + Number(campaign.clicks || 0), 0);
  const ctr = totalSent ? Math.round((totalClicks / totalSent) * 100) : 0;
  const bestCampaign = [...campaigns].sort((a, b) => {
    const bScore = Number(b.clicks || 0) * 1000 + Number(b.sent || 0);
    const aScore = Number(a.clicks || 0) * 1000 + Number(a.sent || 0);
    return bScore - aScore;
  })[0] || null;
  const planLimits = getPlanLimits(user?.plan || 'gratis');
  const subscribersUsed = customers.length;
  const campaignsUsed = campaigns.length;
  const subscriberPct = Math.min(100, Math.round((subscribersUsed / planLimits.subscribers) * 100));
  const campaignPct = planLimits.campaigns ? Math.min(100, Math.round((campaignsUsed / planLimits.campaigns) * 100)) : 100;
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const newThisWeek = customers.filter(c => c.createdAt && new Date(c.createdAt).getTime() >= weekAgo).length;
  const newThisMonth = customers.filter(c => c.createdAt && new Date(c.createdAt).getTime() >= monthAgo).length;
  return { totalSent, totalClicks, ctr, bestCampaign, planLimits, subscribersUsed, campaignsUsed, subscriberPct, campaignPct, newThisWeek, newThisMonth };
}

function ProgressLine({ label, value, limit, pct }) {
  return <div className="usageLine"><div><span>{label}</span><b>{limit ? `${value} / ${limit.toLocaleString('pt-BR')}` : `${value} / ilimitado`}</b></div><div className="bar"><i style={{width:`${pct}%`}} /></div></div>;
}

const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID || '';
let oneSignalInitPromise = null;

function isOneSignalConfigured() {
  return Boolean(oneSignalAppId);
}

function loadOneSignalSdk() {
  if (window.OneSignalDeferred) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-onesignal-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.async = true;
    script.defer = true;
    script.dataset.onesignalSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Não foi possível carregar o SDK do OneSignal.'));
    document.head.appendChild(script);
  });
}

async function initOneSignal(externalId) {
  if (!isOneSignalConfigured()) throw new Error('OneSignal não configurado. Confira VITE_ONESIGNAL_APP_ID na Vercel.');
  await loadOneSignalSdk();
  if (!oneSignalInitPromise) {
    oneSignalInitPromise = new Promise((resolve, reject) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal) {
        try {
          await OneSignal.init({ appId: oneSignalAppId, allowLocalhostAsSecureOrigin: true });
          resolve(OneSignal);
        } catch (e) {
          reject(e);
        }
      });
    });
  }
  const OneSignal = await oneSignalInitPromise;
  if (externalId && OneSignal.login) {
    try { await OneSignal.login(externalId); } catch (e) { console.warn('Falha ao vincular externalId no OneSignal', e); }
  }
  return OneSignal;
}

async function requestPushSubscription(externalId, lojaId) {
  if (!('Notification' in window)) throw new Error('Este navegador não suporta notificações web push.');
  const OneSignal = await initOneSignal(externalId);
  try { if (lojaId && OneSignal.User?.addTag) await OneSignal.User.addTag('loja_id', lojaId); } catch (e) { console.warn('Falha ao gravar tag loja_id no OneSignal', e); }
  if (OneSignal.Notifications?.requestPermission) {
    await OneSignal.Notifications.requestPermission();
  } else {
    await Notification.requestPermission();
  }
  const permission = Notification.permission;
  let subscriptionId = '';
  let optedIn = permission === 'granted';

  // O OneSignal às vezes leva alguns instantes para criar o Subscription ID
  // logo após o usuário clicar em "Permitir". Por isso tentamos algumas vezes.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      if (OneSignal.User?.PushSubscription?.optIn) {
        await OneSignal.User.PushSubscription.optIn();
      }
      subscriptionId = OneSignal.User?.PushSubscription?.id || '';
      optedIn = Boolean(OneSignal.User?.PushSubscription?.optedIn ?? optedIn);
      if (subscriptionId) break;
    } catch (e) {
      console.warn('Aguardando Subscription ID do OneSignal...', e);
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  return { permission, optedIn, subscriptionId };
}

async function getProfile(sessionUser) {
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle();
  if (error) throw error;
  return profile;
}

function Login({ setUser }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('jsprimao@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function finishLogin(sessionUser) {
    const profile = await getProfile(sessionUser);
    if (!profile) {
      setMessage('Login feito, mas este usuário ainda não tem perfil em public.profiles. Crie o perfil no Supabase.');
      return;
    }
    setUser({
      id: sessionUser.id,
      role: profile.tipo === 'admin' ? 'admin' : 'seller',
      name: profile.nome || profile.email || sessionUser.email,
      email: profile.email || sessionUser.email,
      plan: normalizePlan(profile.plano || 'gratis'),
      status: profile.status || 'ativo'
    });
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) return setMessage('Supabase não configurado. Confira VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel.');
    setLoading(true); setMessage('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMessage(error.message);
    await finishLogin(data.user);
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) return setMessage('Supabase não configurado na Vercel.');
    if (!storeName.trim()) return setMessage('Informe o nome da loja.');
    if (!password || password.length < 6) return setMessage('A senha precisa ter pelo menos 6 caracteres.');
    setLoading(true); setMessage('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome: name || storeName || email,
          store_name: storeName || 'Minha loja'
        }
      }
    });
    setLoading(false);
    if (error) return setMessage(error.message);

    // O perfil e a loja são criados automaticamente no Supabase por trigger.
    // Isso evita falha quando a confirmação de e-mail está ativada.
    if (data.session?.user) {
      setMessage('Conta criada com sucesso. Agora você já pode entrar.');
    } else {
      setMessage('Conta criada. Se o Supabase pedir confirmação, confirme no e-mail antes de entrar.');
    }
    setMode('login');
  }

  async function resetPassword() {
    if (!email) return setMessage('Informe o e-mail para recuperar a senha.');
    if (!supabase) return setMessage('Supabase não configurado.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setMessage(error ? error.message : 'Enviamos o link de recuperação para seu e-mail.');
  }

  return <div className="loginScreen">
    <div className="loginHero">
      <Logo />
      <h1>Notificações que trazem clientes de volta para comprar.</h1>
      <p>Crie campanhas de promoções, novidades e lembretes em poucos cliques. Seus clientes autorizam o recebimento e voltam direto para sua loja, catálogo ou WhatsApp.</p>
      <div className="heroCards"><span>Promoções em 1 clique</span><span>Clientes inscritos</span><span>Relatórios reais</span><span>Menos dependência do WhatsApp</span></div>
    </div>
    <Card className="loginBox">
      <img className="loginIcon" src="/app-icon.png" alt="" />
      <h2>{mode === 'login' ? 'Entrar no Chamy' : 'Criar conta grátis'}</h2>
      <p className="muted">Use seu e-mail e senha cadastrados.</p>
      {!isSupabaseConfigured && <p className="authMessage"><AlertCircle size={16}/> Supabase não configurado na Vercel.</p>}
      <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
        {mode === 'signup' && <><label>Seu nome</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" /><label>Nome da loja</label><input value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="Nome da loja" /></>}
        <label>E-mail</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" />
        <label>Senha</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha" />
        {message && <p className="authMessage">{message}</p>}
        <Button className="primary" disabled={loading}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</Button>
      </form>
      <div className="two">
        <Button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? <UserPlus size={17}/> : <Lock size={17}/>} {mode === 'login' ? 'Criar conta' : 'Já tenho conta'}</Button>
        <Button onClick={resetPassword}><Mail size={17}/> Recuperar senha</Button>
      </div>
    </Card>
  </div>;
}

const sellerMenu = [ ['dash','Dashboard',BarChart3], ['camp','Campanhas',Send], ['auto','Automação',Zap], ['clients','Inscritos',Users], ['capture','Captura Push',Bell], ['segments','Segmentos',Users], ['reports','Relatórios',TrendingUp], ['store','Loja',Store], ['plans','Planos',Crown], ['config','Configurações',Settings] ];
const adminMenu = [ ['dash','Dashboard Geral',BarChart3], ['vendors','Vendedores',Store], ['plans','Planos',Crown], ['global','Campanhas Globais',Send], ['support','Suporte',LifeBuoy], ['settings','Configurações',Settings] ];

function Shell({ user, setUser, active, setActive, menu, children, data }) {
  return <div className="app">
    <aside className="sidebar">
      <Logo />
      <nav>{menu.map(([id, label, Icon]) => <button key={id} onClick={() => setActive(id)} className={active === id ? 'active' : ''}><Icon size={19}/><span>{label}</span><b>›</b></button>)}</nav>
      <SidebarValueCard user={user} data={data} setActive={setActive} />
      <button className="logout" onClick={async () => { if (supabase) await supabase.auth.signOut(); setUser(null); }}><LogOut size={17}/> Sair</button>
    </aside>
    <main>
      <header className="topbar"><div className="topTitle"><Menu/><div><h1>{menu.find(m => m[0] === active)?.[1]}</h1><p>{user.role === 'admin' ? 'Administração geral da plataforma' : 'Visão geral da sua loja'}</p></div></div><div className="userArea"><HelpCircle/> <Bell/> <div className="avatar">{user.name.slice(0,2).toUpperCase()}</div><div><b>{user.name}</b><small>{user.role === 'admin' ? 'Dono da plataforma' : `Plano ${nicePlan(user.plan)}`}</small></div></div></header>
      {children}
    </main>
  </div>;
}

function Stat({ Icon, label, value, change, color = 'purple' }) { return <Card className="stat"><span className={color}><Icon/></span><div><h2>{value}</h2><p>{label}</p><small>↗ {change}</small></div></Card>; }

function SidebarValueCard({ user, data, setActive }) {
  if (!user) return null;
  if (user.role === 'admin') {
    const paid = (data?.vendors || []).filter(v => normalizePlan(v.plan) !== 'gratis').length;
    return <div className="accountSummary adminSummary">
      <div className="summaryTop"><BarChart3 size={20}/><b>Resumo da Plataforma</b></div>
      <p><span>Vendedores</span><strong>{data?.vendors?.length || 0}</strong></p>
      <p><span>Planos pagos</span><strong>{paid}</strong></p>
      <p><span>Status</span><strong>Ativo</strong></p>
      <button onClick={() => setActive('dash')}>Ver painel geral</button>
    </div>;
  }

  const planKey = normalizePlan(user.plan || 'gratis');
  const plan = plans[planKey] || plans.gratis;
  const subscribers = data?.customers?.length || 0;
  const campaigns = data?.campaigns?.length || 0;
  const campaignLimit = planKey === 'gratis' ? 20 : null;
  const subPct = Math.min(100, Math.round((subscribers / plan.limit) * 100));
  const campPct = campaignLimit ? Math.min(100, Math.round((campaigns / campaignLimit) * 100)) : 100;
  const best = [...(data?.campaigns || [])].sort((a, b) => (Number(b.clicks || 0) - Number(a.clicks || 0)) || (Number(b.sent || 0) - Number(a.sent || 0)))[0];
  const bestLabel = best ? best.title.replace(/^🔥|^✨/g, '').trim() : 'Nenhuma campanha ainda';
  const bestMetric = best ? `${Number(best.sent || 0)} envios • ${Number(best.clicks || 0)} cliques` : 'Crie sua primeira campanha';

  return <div className="accountSummary">
    <div className="summaryTop"><BarChart3 size={20}/><b>Resumo da Conta</b></div>
    <p><span>Plano atual</span><strong>{plan.label}</strong></p>

    <div className="usageBlock">
      <div><span>Inscritos</span><strong>{subscribers} / {plan.limit.toLocaleString('pt-BR')}</strong></div>
      <div className="miniBar"><i style={{ width: `${subPct}%` }} /></div>
    </div>

    <div className="usageBlock">
      <div><span>Campanhas</span><strong>{campaignLimit ? `${campaigns} / ${campaignLimit}` : `${campaigns} / ilimitado`}</strong></div>
      <div className="miniBar"><i style={{ width: `${campPct}%` }} /></div>
    </div>

    <div className="bestCampaign">
      <small>Melhor campanha do mês</small>
      <b>{bestLabel}</b>
      <em>{bestMetric}</em>
    </div>

    <button onClick={() => setActive('reports')}>Ver Relatórios</button>
  </div>;
}

function Dashboard({ data, user, setActive }) {
  const analytics = calculateAnalytics(data, user);
  const plan = plans[normalizePlan(user.plan)] || plans.gratis;
  const best = analytics.bestCampaign;
  const bestTitle = best ? best.title : 'Nenhuma campanha enviada';
  const bestSubtitle = best ? `${Number(best.sent || 0)} envios • ${Number(best.clicks || 0)} cliques • ${best.rate || '0%'}` : 'Envie uma campanha para gerar métricas.';

  return <>
    <div className="welcome"><div><Rocket/><h2>Bem-vindo de volta! 👋</h2><p>Veja resultados reais das suas campanhas e acompanhe o crescimento da sua loja.</p></div><Button onClick={() => setActive('camp')}><Send size={17}/> Criar campanha</Button></div>

    <div className="stats">
      <Stat Icon={Users} label="Inscritos" value={analytics.subscribersUsed} change="dados reais" />
      <Stat Icon={Send} label="Campanhas" value={analytics.campaignsUsed} change="no banco" color="blue" />
      <Stat Icon={ShoppingCart} label="Envios" value={analytics.totalSent.toLocaleString('pt-BR')} change="registrados" color="orange" />
      <Stat Icon={MousePointerClick} label="Cliques" value={analytics.totalClicks.toLocaleString('pt-BR')} change={`${analytics.ctr}% de CTR`} color="green" />
    </div>

    <div className="dashGrid enhanced">
      <Card className="chart">
        <div className="cardHead"><h3>Desempenho real</h3><select><option>Últimos 30 dias</option></select></div>
        <div className="realPerformance">
          <div className="performanceNumber"><b>{analytics.totalSent}</b><span>envios registrados</span></div>
          <div className="performanceNumber"><b>{analytics.totalClicks}</b><span>cliques registrados</span></div>
          <div className="performanceNumber"><b>{analytics.ctr}%</b><span>taxa de clique</span></div>
        </div>
        <div className="realMetricGrid">
          <div><small>Novos inscritos</small><b>+{analytics.newThisMonth}</b><span>últimos 30 dias</span></div>
          <div><small>Campanhas criadas</small><b>{analytics.campaignsUsed}</b><span>no período atual</span></div>
          <div><small>Melhor campanha</small><b>{best ? best.title : 'Sem dados'}</b><span>{best ? `${Number(best.sent || 0)} envios • ${Number(best.clicks || 0)} cliques` : 'envie uma campanha'}</span></div>
          <div><small>Uso do plano</small><b>{analytics.subscriberPct}%</b><span>{analytics.subscribersUsed} de {analytics.planLimits.subscribers.toLocaleString('pt-BR')} inscritos</span></div>
        </div>
      </Card>

      <div className="valueStack">
        <Card className="accountPanel">
          <div className="cardHead"><h3>Resumo da Conta</h3><Badge>{plan.label}</Badge></div>
          <ProgressLine label="Inscritos" value={analytics.subscribersUsed} limit={analytics.planLimits.subscribers} pct={analytics.subscriberPct} />
          <ProgressLine label="Campanhas" value={analytics.campaignsUsed} limit={analytics.planLimits.campaigns} pct={analytics.campaignPct} />
          <p className="miniInfo">Status: <b>{user.status || 'ativo'}</b></p>
          <Button onClick={() => setActive('reports')}>Ver Relatórios</Button>
        </Card>

        <Card className="bestPanel">
          <small>🏆 Melhor campanha do mês</small>
          <h3>{bestTitle}</h3>
          <p>{bestSubtitle}</p>
        </Card>

        <Card className="growthPanel">
          <small>📈 Crescimento</small>
          <p><b>+{analytics.newThisWeek}</b> inscritos esta semana</p>
          <p><b>+{analytics.newThisMonth}</b> inscritos este mês</p>
          <em>💡 Use títulos curtos e envie campanhas nos horários de maior movimento.</em>
        </Card>
      </div>
    </div>

    <Card><div className="cardHead"><h3>Campanhas recentes</h3><Button onClick={() => setActive('camp')}>Ver todas</Button></div><CampaignList data={data}/></Card>
  </>;
}

const templates = [
  ['Promoção Relâmpago', Gift, '🔥 Promoção Relâmpago', 'Ofertas especiais por tempo limitado. Clique e aproveite agora!'],
  ['Novidades da Semana', Sparkles, '✨ Novidades da Semana', 'Chegaram novidades no catálogo. Confira antes que acabem!'],
  ['Cliente Sumido', RotateCcw, 'Sentimos sua falta!', 'Temos novidades esperando por você.'],
  ['Carrinho Abandonado', ShoppingCart, 'Você esqueceu produtos', 'Finalize seu pedido em poucos cliques.']
];

function Campaigns({ data, setData, lojaId, refreshData }) {
  const [form, setForm] = useState({ title: '🔥 Promoção Relâmpago', msg: 'Ofertas especiais por tempo limitado. Clique e aproveite agora!', link: '', audience: 'Todos', freq: 'A cada 4 horas', duration: '7 dias' });
  const [saving, setSaving] = useState(false);
  async function addCampaign(){
    if (!lojaId) return alert('Nenhuma loja encontrada para este usuário.');
    setSaving(true);
    const duracao = parseInt(form.duration, 10) || 1;
    const { data: created, error } = await supabase.from('campanhas').insert({ loja_id: lojaId, titulo: form.title, mensagem: form.msg, link: form.link, publico: form.audience, frequencia: form.freq, duracao_dias: duracao, status:'Ativa' }).select('*').single();
    setSaving(false);
    if (error) return alert(error.message);
    setData({...data, campaigns:[{ id:created.id, title:created.titulo, msg:created.mensagem, status:created.status, audience:created.publico, freq:created.frequencia, duration:`${created.duracao_dias} dias`, sent:0, clicks:0, rate:'0%', date:'Agora' }, ...data.campaigns]});
    refreshData?.();
  }
  async function toggleCampaign(c){
    const next = c.status === 'Ativa' ? 'Pausada' : 'Ativa';
    const { error } = await supabase.from('campanhas').update({ status: next }).eq('id', c.id);
    if (error) return alert(error.message);
    setData({...data,campaigns:data.campaigns.map(x=>x.id===c.id?{...x,status:next}:x)});
  }
  async function deleteCampaign(c){
    if (!confirm('Excluir esta campanha?')) return;
    const { error } = await supabase.from('campanhas').delete().eq('id', c.id);
    if (error) return alert(error.message);
    setData({...data,campaigns:data.campaigns.filter(x=>x.id!==c.id)});
  }
  async function sendCampaign(c){
    if (!confirm(`Enviar a campanha "${c.title}" agora?`)) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return alert('Sessão expirada. Entre novamente.');
      const res = await fetch('/api/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ campaignId: c.id, mode: 'all_subscribers' })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        console.error('Erro envio Chamy/OneSignal:', json);
        throw new Error(json.error || 'Falha ao enviar campanha. Abra o console/logs para detalhes.');
      }
      console.log('Resposta envio Chamy/OneSignal:', json);
      const avisoEnvios = json.enviosError ? `\nAtenção: notificação enviada, mas houve erro ao registrar envios: ${json.enviosError}` : '';
      alert(`Campanha enviada para o OneSignal!\nDestinatários OneSignal: ${json.recipients || 0}\nClientes push no Supabase: ${json.supabasePushClients || 0}\nRegistros em envios: ${json.enviosInserted || 0}${avisoEnvios}`);
      refreshData?.();
    } catch (e) {
      alert(e.message || 'Falha ao enviar campanha.');
    }
  }
  function testNotify(){ if(!('Notification' in window)) return alert('Seu navegador não suporta notificações.'); Notification.requestPermission().then(p=> p==='granted' ? new Notification(form.title,{body:form.msg,icon:'/favicon.png'}) : alert('Permissão de notificação negada.')); }
  return <div className="campaignPage"><Card className="creator"><h3>Nova campanha</h3><p className="muted">Escolha um modelo pronto ou personalize.</p><div className="templates">{templates.map(([name,Icon,title,msg])=><button key={name} onClick={()=>setForm({...form,title,msg})}><Icon/><b>{name}</b></button>)}</div><label>Título</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><label>Mensagem</label><textarea value={form.msg} onChange={e=>setForm({...form,msg:e.target.value})}/><label>Link de destino</label><input value={form.link} onChange={e=>setForm({...form,link:e.target.value})} placeholder="https://sualoja.com/promocoes"/><div className="two"><div><label>Público</label><select value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}><option>Todos</option><option>Promoções</option><option>Clientes inativos</option><option>Quem clicou na última campanha</option></select></div><div><label>Frequência</label><select value={form.freq} onChange={e=>setForm({...form,freq:e.target.value})}><option>A cada 4 horas</option><option>Diária</option><option>Semanal</option><option>Envio único</option></select></div></div><label>Duração</label><select value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}><option>7 dias</option><option>3 dias</option><option>1 dia</option><option>Até pausar</option></select><label className="check"><input type="checkbox" defaultChecked/> Não enviar de madrugada</label><label className="check"><input type="checkbox" defaultChecked/> Não repetir para quem já clicou</label><div className="two"><Button className="primary" onClick={addCampaign} disabled={saving}><Play size={17}/> {saving ? 'Salvando...' : 'Iniciar campanha'}</Button><Button onClick={testNotify}><Bell size={17}/> Testar notificação</Button></div></Card><Card><div className="cardHead"><h3>Campanhas</h3><Badge>{data.campaigns.length} criadas</Badge></div><CampaignList data={data} onToggle={toggleCampaign} onDelete={deleteCampaign} onSend={sendCampaign}/></Card></div>;
}

function CampaignList({ data, onToggle, onDelete, onSend }) {
  if (!data.campaigns.length) return <p className="muted">Nenhuma campanha criada ainda.</p>;
  return <div className="campaignList">{data.campaigns.map(c=><div className="campaign" key={c.id}><div className="thumb"><Send/></div><div><b>{c.title}</b><p>{c.msg}</p><small>{c.freq} • {c.duration} • {c.audience}</small></div><div className="metrics"><span><b>{c.sent}</b>Enviados</span><span><b>{c.clicks}</b>Cliques</span><span><b>{c.rate}</b>Taxa</span><Badge tone={c.status==='Ativa'?'green':c.status==='Programada'?'violet':'gray'}>{c.status}</Badge>{onToggle&&<><Button className="primary" onClick={()=>onSend?.(c)}><Send size={16}/> Enviar agora</Button><Button onClick={()=>onToggle(c)}>{c.status==='Ativa'?<Pause size={16}/>:<Play size={16}/>}</Button><Button onClick={()=>onDelete(c)}><Trash2 size={16}/></Button></>}<MoreVertical size={18}/></div></div>)}</div>;
}

function Customers({ data, setData, lojaId, refreshData }) {
  const [q,setQ]=useState('');
  const rows=data.customers.filter(c=>(c.name+c.city+c.interest+c.status).toLowerCase().includes(q.toLowerCase()));
  async function add(){
    if (!lojaId) return alert('Nenhuma loja encontrada para este usuário.');
    const name=prompt('Nome do cliente/inscrito:'); if(!name) return;
    const whats=prompt('WhatsApp do cliente:') || '';
    const city=prompt('Cidade/UF:') || '';
    const { data: created, error } = await supabase.from('clientes').insert({ loja_id: lojaId, nome:name, whatsapp:whats, cidade:city, interesse:'Todos', aceitou_push:false, status:'ativo' }).select('*').single();
    if (error) return alert(error.message);
    setData({...data,customers:[{id:created.id,name:created.nome,city:created.cidade || '',whats:created.whatsapp || '',interest:created.interesse || 'Todos',status:created.status || 'ativo',last:'Agora',device:created.aceitou_push ? 'Push ativo':'Sem push'},...data.customers]});
    refreshData?.();
  }
  return <Card><div className="cardHead"><h3>Clientes inscritos</h3><Button className="primary" onClick={add}><Plus size={17}/> Adicionar</Button></div><div className="search"><Search/><input placeholder="Buscar por nome, cidade, interesse..." value={q} onChange={e=>setQ(e.target.value)}/></div><Table rows={rows} cols={['name','city','whats','interest','device','last','status']}/></Card>;
}

function Automations(){return <div className="autoGrid">{[['Cliente sumido','Envia aviso para quem não acessa há 7 dias.'],['Novidades da semana','Toda sexta-feira às 09h.'],['Carrinho abandonado','Lembra o cliente de finalizar o pedido.'],['Boas-vindas','Mensagem logo após aceitar notificações.']].map((a,i)=><Card key={a[0]}><Zap className="bigIcon"/><div className="cardHead"><h3>{a[0]}</h3><Badge tone={i===2?'gray':'green'}>{i===2?'Inativa':'Ativa'}</Badge></div><p>{a[1]}</p><Button>{i===2?<Play size={17}/>:<Pause size={17}/>} {i===2?'Ativar':'Pausar'}</Button></Card>)}</div>}
function Capture({ loja, data, setData, refreshData, user }){
  const [status, setStatus] = useState(isOneSignalConfigured() ? 'Pronto para ativar no navegador.' : 'Configure VITE_ONESIGNAL_APP_ID na Vercel.');
  const [loading, setLoading] = useState(false);
  const widgetCode = `<script src="https://chamy.vercel.app/widget.js" data-loja="${loja?.id || 'ID_DA_LOJA'}"></script>`;
  async function activatePush(){
    if (!loja?.id) return setStatus('Nenhuma loja vinculada ao usuário.');
    try {
      setLoading(true);
      setStatus('Solicitando permissão do navegador...');
      const result = await requestPushSubscription(`${loja.id}:${user?.id || 'usuario'}`, loja.id);
      if (result.permission !== 'granted') {
        setStatus('Permissão negada. Autorize as notificações no navegador para testar.');
        return;
      }
      const nome = result.subscriptionId ? `Push ${result.subscriptionId.slice(0, 8)}` : 'Inscrito Push';
      if (!result.subscriptionId) {
        setStatus('Permissão concedida, mas o OneSignal ainda não retornou o ID da inscrição. Aguarde alguns segundos e clique novamente em Ativar notificações.');
        return;
      }
      const { data: created, error } = await supabase.from('clientes').insert({
        loja_id: loja.id,
        nome,
        cidade: 'Navegador',
        interesse: 'Todos',
        aceitou_push: true,
        onesignal_subscription_id: result.subscriptionId,
        status: 'ativo'
      }).select('*').single();
      if (error) throw error;
      setData({...data, customers:[{ id:created.id, name:created.nome, city:created.cidade || '', whats:'', interest:created.interesse || 'Todos', status:created.status || 'ativo', last:'Agora', device:'Push ativo' }, ...data.customers]});
      setStatus(`Push ativado com sucesso. Subscription ID sincronizado: ${result.subscriptionId}`);
      refreshData?.();
    } catch (e) {
      console.error(e);
      setStatus(e.message || 'Falha ao ativar OneSignal.');
    } finally {
      setLoading(false);
    }
  }
  function testLocal(){
    if(!('Notification' in window)) return setStatus('Seu navegador não suporta notificações.');
    Notification.requestPermission().then(p => p === 'granted' ? new Notification('Chamy ativo', { body:'As notificações já podem aparecer neste navegador.', icon:'/favicon.png' }) : setStatus('Permissão negada.'));
  }
  return <div className="campaignPage"><Card><h3>Widget de captura</h3><p className="muted">Mensagem exibida para visitantes aceitarem receber notificações.</p><label>Título</label><input defaultValue="Receba promoções e novidades"/><label>Mensagem</label><textarea defaultValue="Quer ser avisado quando chegarem ofertas e produtos novos?"/><div className="two"><Button className="primary" onClick={activatePush} disabled={loading}><Bell size={17}/> {loading ? 'Ativando...' : 'Ativar notificações neste navegador'}</Button><Button onClick={testLocal}><Play size={17}/> Teste local</Button></div><p className="authMessage">{status}</p><Button onClick={()=>navigator.clipboard?.writeText(widgetCode)}><Copy size={17}/> Copiar código do widget</Button><pre>{widgetCode}</pre><p className="muted">Observação: o widget público será a próxima etapa. Nesta versão, o botão acima registra seu navegador para teste real com OneSignal.</p></Card><Card className="preview"><Globe/><div className="popup"><Bell/><h3>Receba promoções e novidades</h3><p>Quer ser avisado quando chegarem ofertas e produtos novos?</p><div className="two"><Button className="primary" onClick={activatePush}>Sim, quero</Button><Button>Agora não</Button></div></div></Card></div>}

function Plans(){return <div className="plans">{Object.values(plans).map((p,i)=><Card className={i===1?'featured':''} key={p.label}><Badge tone={i===1?'violet':'gray'}>{p.badge}</Badge><h2>{p.label}</h2><h1>{p.price}<small>/mês</small></h1>{p.features.map(f=><p className="ok" key={f}><CheckCircle2/> {f}</p>)}<Button className="primary">Escolher plano</Button></Card>)}</div>}
function Reports({ data, user }){
  const analytics = calculateAnalytics(data, user);
  const best = analytics.bestCampaign;
  const ordered = [...(data.campaigns || [])].sort((a,b)=>Number(b.sent || 0) - Number(a.sent || 0));
  return <>
    <div className="stats">
      <Stat Icon={TrendingUp} label="Melhor campanha" value={best ? best.title.slice(0,18) : 'Sem dados'} change={best ? `${best.sent} envios` : 'envie uma campanha'} />
      <Stat Icon={Bell} label="Envios totais" value={analytics.totalSent.toLocaleString('pt-BR')} change="dados reais" color="blue" />
      <Stat Icon={MousePointerClick} label="Taxa de clique" value={`${analytics.ctr}%`} change={`${analytics.totalClicks} cliques`} color="green" />
    </div>
    <Card>
      <div className="cardHead"><h3>Desempenho real por campanha</h3><Badge>{ordered.length} campanhas</Badge></div>
      {!ordered.length ? <p className="muted">Nenhuma campanha encontrada.</p> : <div className="reportRows">
        {ordered.map(c => {
          const sent = Number(c.sent || 0);
          const pct = Math.max(4, Math.min(100, sent ? sent * 10 : 4));
          return <div className="reportRow" key={c.id}>
            <div><b>{c.title}</b><small>{sent} envios • {Number(c.clicks || 0)} cliques • {c.rate || '0%'}</small></div>
            <i style={{width:`${pct}%`}} />
          </div>;
        })}
      </div>}
    </Card>
    <Card className="tipsCard"><h3>O que estes dados mostram?</h3><p>Envios vêm da tabela <b>envios</b>, inscritos vêm da tabela <b>clientes</b> e campanhas vêm da tabela <b>campanhas</b>. Assim o vendedor passa a enxergar o resultado real das notificações enviadas.</p></Card>
  </>;
}

function PublicCapture(){
  const [loja, setLoja] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome:'', whatsapp:'', cidade:'', interesse:'Todos' });
  const [status, setStatus] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function loadLoja(){
      if (!supabase) { setStatus('Supabase não configurado.'); setLoading(false); return; }
      const params = new URLSearchParams(window.location.search);
      const lojaId = params.get('loja_id') || params.get('loja');
      try {
        if (lojaId) {
          const { data, error } = await supabase.from('lojas').select('*').eq('id', lojaId).maybeSingle();
          if (error) throw error;
          setLoja(data);
        } else {
          const slug = decodeURIComponent(window.location.pathname.split('/loja/')[1]?.replace(/\/$/,'') || '').trim();
          if (isUuid(slug)) {
            const { data, error } = await supabase.from('lojas').select('*').eq('id', slug).maybeSingle();
            if (error) throw error;
            setLoja(data);
          } else {
            const { data, error } = await supabase.from('lojas').select('*');
            if (error) throw error;
            const activeStores = (data || []).filter(l => ['ativa','ativo','teste'].includes(String(l.status || '').toLowerCase()));
            const found = activeStores.find(l => slugify(l.nome) === slug) || (activeStores.length === 1 ? activeStores[0] : null);
            setLoja(found);
          }
        }
      } catch (e) {
        setStatus(e.message || 'Erro ao carregar loja.');
      } finally { setLoading(false); }
    }
    loadLoja();
  }, []);

  async function activatePublicPush(e){
    e?.preventDefault?.();
    if (!loja?.id) return setStatus('Loja não encontrada.');
    if (!form.nome.trim()) return setStatus('Informe seu nome para continuar.');
    try {
      setLoading(true);
      setStatus('Solicitando permissão para notificações...');
      const result = await requestPushSubscription(`public:${loja.id}:${form.whatsapp || form.nome}`, loja.id);
      if (result.permission !== 'granted') {
        setStatus('Você precisa permitir as notificações no navegador para concluir o cadastro.');
        return;
      }
      if (!result.subscriptionId) {
        setStatus('Permissão concedida, mas o OneSignal ainda não retornou o ID. Aguarde alguns segundos e tente novamente.');
        return;
      }
      const { error } = await supabase.rpc('chamy_public_register_push', {
        p_loja_id: loja.id,
        p_nome: form.nome,
        p_whatsapp: form.whatsapp || '',
        p_cidade: form.cidade || '',
        p_interesse: form.interesse || 'Todos',
        p_subscription_id: result.subscriptionId
      });
      if (error) throw error;
      setDone(true);
      setStatus('Cadastro realizado! Agora você receberá novidades e promoções desta loja.');
    } catch (e) {
      console.error(e);
      setStatus(e.message || 'Falha ao cadastrar.');
    } finally { setLoading(false); }
  }

  if (loading && !loja) return <div className="publicPage"><Card className="publicCard"><Logo/><h2>Carregando loja...</h2></Card></div>;
  if (!loja) return <div className="publicPage"><Card className="publicCard"><Logo/><h2>Loja não encontrada</h2><p>Confira o link recebido ou peça um novo convite para a loja.</p><a className="publicLink" href="/">Voltar para o Chamy</a></Card></div>;

  return <div className="publicPage">
    <Card className="publicCard">
      <Logo />
      <Badge tone="green">Inscrição gratuita</Badge>
      <h1>Receba promoções e novidades da {loja.nome}</h1>
      <p className="publicLead">Cadastre-se para ser avisado quando chegarem ofertas, lançamentos e campanhas especiais. Você pode bloquear as notificações quando quiser no seu navegador.</p>
      <form onSubmit={activatePublicPush} className="publicForm">
        <label>Seu nome</label><input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Ex: Maria Silva" />
        <label>WhatsApp</label><input value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})} placeholder="(12) 99999-9999" />
        <div className="two"><div><label>Cidade/UF</label><input value={form.cidade} onChange={e=>setForm({...form,cidade:e.target.value})} placeholder="Aparecida/SP" /></div><div><label>Interesse</label><select value={form.interesse} onChange={e=>setForm({...form,interesse:e.target.value})}><option>Todos</option><option>Promoções</option><option>Novidades</option><option>Clientes VIP</option></select></div></div>
        {status && <p className={done ? 'successMessage' : 'authMessage'}>{status}</p>}
        <Button className="primary" disabled={loading || done}>{done ? <CheckCircle2 size={17}/> : <Bell size={17}/>} {done ? 'Notificações ativadas' : loading ? 'Ativando...' : 'Quero receber avisos'}</Button>
      </form>
      <div className="publicBenefits"><span><Gift/> Promoções</span><span><Sparkles/> Novidades</span><span><ShieldCheck/> Cadastro seguro</span></div>
    </Card>
  </div>;
}

function StorePanel({ loja, refreshData }){
  const [form, setForm] = useState({
    nome: loja?.nome || '',
    site: loja?.site || '',
    whatsapp: loja?.whatsapp || '',
    cidade: loja?.cidade || ''
  });
  const [msg, setMsg] = useState('');
  const slug = slugify(loja?.nome || 'minha-loja');
  const publicLink = `${window.location.origin}/loja/${loja?.id || slug}`;
  const widgetCode = `<script src="${window.location.origin}/widget.js" data-loja="${loja?.id || 'ID_DA_LOJA'}"></script>`;
  useEffect(()=>{ setForm({ nome: loja?.nome || '', site: loja?.site || '', whatsapp: loja?.whatsapp || '', cidade: loja?.cidade || '' }); }, [loja?.id]);
  async function save(){
    if (!loja?.id) return setMsg('Nenhuma loja vinculada ao usuário.');
    setMsg('Salvando dados da loja...');
    const { error } = await supabase.from('lojas').update({ nome: form.nome, site: form.site, whatsapp: form.whatsapp, cidade: form.cidade }).eq('id', loja.id);
    if (error) return setMsg(error.message);
    setMsg('Dados da loja salvos com sucesso.');
    refreshData?.();
  }
  return <div className="storeGrid">
    <Card>
      <div className="cardHead"><h3>Dados da Loja</h3><Badge tone={loja?.status === 'ativa' ? 'green' : 'gray'}>{loja?.status || 'ativa'}</Badge></div>
      <label>Nome da loja</label><input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Nome da sua loja" />
      <label>Site ou catálogo</label><input value={form.site} onChange={e=>setForm({...form,site:e.target.value})} placeholder="https://sualoja.com.br" />
      <div className="two"><div><label>WhatsApp</label><input value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})} placeholder="(12) 99999-9999" /></div><div><label>Cidade/UF</label><input value={form.cidade} onChange={e=>setForm({...form,cidade:e.target.value})} placeholder="Aparecida/SP" /></div></div>
      {msg && <p className="authMessage">{msg}</p>}
      <Button className="primary" onClick={save}>Salvar dados da loja</Button>
    </Card>
    <Card>
      <div className="cardHead"><h3>Link público e instalação</h3><Store size={22}/></div>
      <p className="muted">Use estes dados para divulgar a captura de inscritos da loja.</p>
      <label>Link público da loja</label><div className="copyBox"><code>{publicLink}</code><Button onClick={()=>navigator.clipboard?.writeText(publicLink)}><Copy size={16}/> Copiar</Button></div><p className="miniNote">Este é o link estável da captura pública. Ele usa o ID da loja para evitar erro quando o nome da loja muda.</p>
      <label>Código do widget</label><pre>{widgetCode}</pre>
      <Button onClick={()=>navigator.clipboard?.writeText(widgetCode)}><Copy size={16}/> Copiar widget</Button>
      <div className="qrPlaceholder"><QrCode/><b>Página pública pronta</b><span>Divulgue este link em grupos, redes sociais, bio do Instagram, catálogo e materiais impressos. O QR Code visual será uma próxima melhoria.</span><Button onClick={()=>window.open(publicLink, '_blank')}><ExternalLink size={16}/> Abrir página pública</Button></div>
    </Card>
  </div>;
}

function ConfigPanel({ user, setUser }){
  const [name, setName] = useState(user?.name || '');
  const [msg, setMsg] = useState('');
  async function saveProfile(){
    if (!user?.id) return;
    setMsg('Salvando perfil...');
    const { error } = await supabase.from('profiles').update({ nome: name }).eq('id', user.id);
    if (error) return setMsg(error.message);
    setUser({...user, name});
    setMsg('Perfil atualizado com sucesso.');
  }
  async function resetPassword(){
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin });
    setMsg(error ? error.message : 'Link de recuperação enviado para seu e-mail.');
  }
  return <div className="storeGrid">
    <Card>
      <div className="cardHead"><h3>Perfil do Usuário</h3><Badge>{user.role === 'admin' ? 'Admin' : 'Vendedor'}</Badge></div>
      <label>Nome</label><input value={name} onChange={e=>setName(e.target.value)} />
      <label>E-mail</label><input value={user.email || ''} disabled />
      <label>Plano atual</label><input value={nicePlan(user.plan)} disabled />
      {msg && <p className="authMessage">{msg}</p>}
      <div className="two"><Button className="primary" onClick={saveProfile}>Salvar perfil</Button><Button onClick={resetPassword}><Lock size={16}/> Alterar senha</Button></div>
    </Card>
    <Card>
      <div className="cardHead"><h3>Preferências e Segurança</h3><ShieldCheck size={22}/></div>
      <p className="ok"><ShieldCheck/> Login protegido pelo Supabase Auth.</p>
      <p className="ok"><Bell/> Notificações controladas com permissão do navegador.</p>
      <p className="ok"><Crown/> Recursos liberados de acordo com o plano.</p>
      <div className="settingsList">
        <p><span>Status da conta</span><b>{user.status || 'ativo'}</b></p>
        <p><span>Tipo de acesso</span><b>{user.role === 'admin' ? 'Administrador' : 'Vendedor'}</b></p>
        <p><span>Ambiente</span><b>Produção</b></p>
      </div>
    </Card>
  </div>;
}

function Segments({ data }){
  const customers = data?.customers || [];
  const map = new Map();
  customers.forEach(c => {
    const key = (c.interest || 'Todos').trim() || 'Todos';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  });
  if (!map.has('Todos')) map.set('Todos', customers);
  const segments = Array.from(map.entries()).map(([name, rows]) => ({ name, count: rows.length, push: rows.filter(c => c.device === 'Push ativo' || c.oneSignalSubscriptionId).length, cities: [...new Set(rows.map(r=>r.city).filter(Boolean))].slice(0,3).join(', ') || 'Sem cidade' })).sort((a,b)=> (b.name === 'Todos' ? -1 : 0) || b.count - a.count);
  return <div className="segmentPage">
    <Card>
      <div className="cardHead"><div><h3>Segmentos</h3><p className="muted">Grupos calculados a partir do campo interesse dos inscritos.</p></div><Badge>{segments.length} segmentos</Badge></div>
      <div className="segmentGrid">
        {segments.map(seg => <div className="segmentCard" key={seg.name}>
          <div><TargetIcon/><b>{seg.name}</b></div>
          <h2>{seg.count}</h2>
          <p>inscritos no segmento</p>
          <small>{seg.push} com push ativo • {seg.cities}</small>
        </div>)}
      </div>
    </Card>
    <Card className="tipsCard">
      <h3>Como usar segmentos?</h3>
      <p>Na tela <b>Inscritos</b>, cada cliente possui um interesse. Esse interesse vira um segmento para campanhas mais direcionadas, como Promoções, Novidades, VIP, Atacado ou Clientes inativos.</p>
      <p>Na criação de campanhas, escolha o público desejado para enviar mensagens mais relevantes e melhorar a taxa de clique.</p>
    </Card>
  </div>;
}
function TargetIcon(){ return <Users size={20}/>; }

function Seller({ user, setUser, data, setData, loja, refreshData }) {
  const [active,setActive]=useState('dash');
  return <Shell user={user} setUser={setUser} active={active} setActive={setActive} menu={sellerMenu} data={data}>{active==='dash'&&<Dashboard data={data} user={user} setActive={setActive}/>} {active==='camp'&&<Campaigns data={data} setData={setData} lojaId={loja?.id} refreshData={refreshData}/>} {active==='auto'&&<Automations/>} {active==='clients'&&<Customers data={data} setData={setData} lojaId={loja?.id} refreshData={refreshData}/>} {active==='capture'&&<Capture loja={loja} data={data} setData={setData} refreshData={refreshData} user={user}/>} {active==='segments'&&<Segments data={data}/>} {active==='reports'&&<Reports data={data} user={user}/>} {active==='store'&&<StorePanel loja={loja} refreshData={refreshData}/>} {active==='plans'&&<Plans/>} {active==='config'&&<ConfigPanel user={user} setUser={setUser}/>}</Shell>;
}

function Admin({ user, setUser, data, setData, refreshData }) {
  const [active,setActive]=useState('dash');
  async function addVendor(){
    alert('Por segurança, crie vendedores pelo cadastro normal ou em Authentication > Users. Depois eles aparecerão aqui.');
  }
  return <Shell user={user} setUser={setUser} active={active} setActive={setActive} menu={adminMenu} data={data}>{active==='dash'&&<><div className="stats"><Stat Icon={Store} label="Vendedores" value={data.vendors.length} change="dados reais"/><Stat Icon={Users} label="Inscritos totais" value={data.vendors.reduce((a,v)=>a+(Number(v.subscribers)||0),0).toLocaleString('pt-BR')} change="em todas as lojas" color="blue"/><Stat Icon={CreditCard} label="Planos pagos" value={data.vendors.filter(v=>normalizePlan(v.plan)!=='gratis').length} change="Pro/Business" color="green"/><Stat Icon={TrendingUp} label="MRR estimado" value={`R$ ${data.vendors.reduce((a,v)=>a+(normalizePlan(v.plan)==='pro'?39:normalizePlan(v.plan)==='business'?149:0),0)}`} change="base atual" color="orange"/></div><Card><div className="cardHead"><h3>Vendedores recentes</h3><Button onClick={refreshData}>Atualizar</Button></div><Table rows={data.vendors} cols={['name','email','plan','status','subscribers','campaigns','sales']}/></Card></>} {active==='vendors'&&<Card><div className="cardHead"><h3>Vendedores / usuários</h3><Button className="primary" onClick={addVendor}><Plus size={17}/> Adicionar</Button></div><Table rows={data.vendors} cols={['name','email','plan','status','subscribers','campaigns','sales']}/></Card>} {active==='plans'&&<Plans/>} {active==='global'&&<Card><h3>Campanha global para vendedores</h3><input defaultValue="Novidade no Chamy"/><textarea defaultValue="Agora você pode criar campanhas automáticas em poucos cliques."/><Button className="primary"><Send size={17}/> Enviar aviso geral</Button></Card>} {active==='support'&&<Card><h3>Chamados</h3><Table rows={data.tickets} cols={['vendor','subject','status']}/></Card>} {active==='settings'&&<ConfigPanel user={user} setUser={setUser}/>}</Shell>;
}

function Table({ rows, cols }) {
  if (!rows?.length) return <p className="muted">Nenhum registro encontrado.</p>;
  return <div className="table"><table><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r, idx)=><tr key={r.id || idx}>{cols.map(c=><td key={c}>{c==='status'?<Badge tone={String(r[c]).toLowerCase()==='ativo'?'green':'gray'}>{r[c]}</Badge>:c==='sales'?`R$ ${Number(r[c]||0).toLocaleString('pt-BR')}`:r[c]}</td>)}</tr>)}</tbody></table></div>;
}

function App(){
  const [data,setData]=useState(emptyData);
  const [user,setUser]=useState(null);
  const [loja,setLoja]=useState(null);
  const [checking,setChecking]=useState(true);
  const [loadError,setLoadError]=useState('');
  const isPublicCapture = window.location.pathname.startsWith('/loja');

  async function loadUserData(currentUser) {
    if (!currentUser?.id || !supabase) return;
    setLoadError('');
    try {
      if (currentUser.role === 'admin') {
        const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').order('created_at', { ascending:false });
        if (profilesError) throw profilesError;
        const { data: lojas, error: lojasError } = await supabase.from('lojas').select('*').order('created_at', { ascending:false });
        if (lojasError) throw lojasError;
        const { data: clientes } = await supabase.from('clientes').select('id, loja_id');
        const { data: campanhas } = await supabase.from('campanhas').select('id, loja_id');
        const vendors = (profiles || []).map((p) => {
          const lojaAtual = (lojas || []).find(l=>l.user_id===p.id);
          return { id:p.id, name:p.nome || p.email, email:p.email, plan:nicePlan(p.plano || 'gratis'), status:p.status || 'ativo', subscribers:(clientes || []).filter(c=>c.loja_id===lojaAtual?.id).length, campaigns:(campanhas || []).filter(c=>c.loja_id===lojaAtual?.id).length, sales:0, tipo:p.tipo, loja:lojaAtual?.nome || '' };
        });
        setData(prev => ({...prev, vendors}));
      } else {
        const { data: lojas, error: lojaError } = await supabase.from('lojas').select('*').eq('user_id', currentUser.id).limit(1);
        if (lojaError) throw lojaError;
        let lojaAtual = lojas?.[0];
        if (!lojaAtual) {
          const { data: novaLoja, error: createError } = await supabase.from('lojas').insert({ user_id: currentUser.id, nome: currentUser.name || 'Minha loja', status:'ativa' }).select('*').single();
          if (createError) throw createError;
          lojaAtual = novaLoja;
        }
        setLoja(lojaAtual);
        const { data: clientes, error: clientesError } = await supabase.from('clientes').select('*').eq('loja_id', lojaAtual.id).order('created_at', { ascending:false });
        if (clientesError) throw clientesError;
        const { data: campanhas, error: campanhasError } = await supabase.from('campanhas').select('*').eq('loja_id', lojaAtual.id).order('created_at', { ascending:false });
        if (campanhasError) throw campanhasError;
        const campaignIds = (campanhas || []).map(c => c.id);
        let envios = [];
        if (campaignIds.length) {
          const { data: enviosData, error: enviosError } = await supabase.from('envios').select('campanha_id,clicou').in('campanha_id', campaignIds);
          if (!enviosError) envios = enviosData || [];
        }
        setData(prev => ({...prev,
          customers: (clientes || []).map((c) => ({ id: c.id, name: c.nome || 'Cliente', city: c.cidade || '', whats: c.whatsapp || '', interest: c.interesse || 'Todos', status: c.status || 'ativo', last: c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : 'Supabase', createdAt: c.created_at, device: c.aceitou_push ? 'Push ativo' : 'Sem push', oneSignalSubscriptionId: c.onesignal_subscription_id || '' })),
          campaigns: (campanhas || []).map((c) => {
            const rows = envios.filter(e => e.campanha_id === c.id);
            const sent = rows.length;
            const clicks = rows.filter(e => e.clicou).length;
            const rate = sent ? `${Math.round((clicks / sent) * 100)}%` : '0%';
            return { id: c.id, title: c.titulo, msg: c.mensagem, status: c.status || 'rascunho', audience: c.publico || 'Todos', freq: c.frequencia || 'único', duration: `${c.duracao_dias || 1} dias`, sent, clicks, rate, date: c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '' };
          })
        }));
      }
    } catch (e) {
      console.error(e);
      setLoadError(e.message || 'Falha ao carregar dados do Supabase.');
    }
  }

  useEffect(() => {
    let alive = true;
    async function loadSession(){
      if (!isSupabaseConfigured || !supabase) { setChecking(false); return; }
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user;
      if (!sessionUser) { setChecking(false); return; }
      try {
        const profile = await getProfile(sessionUser);
        if (alive && profile) {
          const currentUser = { id: sessionUser.id, role: profile.tipo === 'admin' ? 'admin' : 'seller', name: profile.nome || profile.email || sessionUser.email, email: profile.email || sessionUser.email, plan: normalizePlan(profile.plano || 'gratis'), status: profile.status || 'ativo' };
          setUser(currentUser);
          await loadUserData(currentUser);
        }
      } catch (e) { setLoadError(e.message); }
      if (alive) setChecking(false);
    }
    loadSession();
    const { data: sub } = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) setUser(null);
    }) || { data: null };
    return () => { alive = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  useEffect(() => { if (user?.id) loadUserData(user); }, [user?.id, user?.role]);

  if (isPublicCapture) return <PublicCapture/>;
  if (checking) return <div className="loginScreen"><Card className="loginBox"><Logo/><h2>Carregando Chamy...</h2></Card></div>;
  if(!user) return <Login setUser={setUser}/>;
  const refreshData = () => loadUserData(user);
  return <>{loadError && <div className="globalError">{loadError}</div>}{user.role==='admin'?<Admin user={user} setUser={setUser} data={data} setData={setData} refreshData={refreshData}/>:<Seller user={user} setUser={setUser} data={data} setData={setData} loja={loja} refreshData={refreshData}/>}</>;
}

createRoot(document.getElementById('root')).render(<App/>);
