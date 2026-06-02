import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bell, BarChart3, Send, Zap, Users, Crown, Settings, Store, LifeBuoy, Plus, Search, Play, Pause, Trash2, Copy, ShieldCheck, MousePointerClick, MessageCircle, TrendingUp, ShoppingCart, Rocket, Gift, Sparkles, RotateCcw, Globe, CheckCircle2, Lock, LogOut, UserPlus, CreditCard, HelpCircle, Menu, MoreVertical, Mail, AlertCircle } from 'lucide-react';
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
      <h1>Campanhas simples para chamar clientes de volta.</h1>
      <p>Login real pelo Supabase para vendedores e administração geral do Chamy.</p>
      <div className="heroCards"><span>Login real</span><span>Cadastro de lojas</span><span>Painel Admin</span><span>Supabase conectado</span></div>
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
  const sent = data.campaigns.reduce((a,c)=>a+(Number(c.sent)||0),0), clicks = data.campaigns.reduce((a,c)=>a+(Number(c.clicks)||0),0);
  const plan = plans[normalizePlan(user.plan)] || plans.gratis;
  const used = data.customers.length;
  const pct = Math.min(100, Math.round((used / plan.limit) * 100));
  return <>
    <div className="welcome"><div><Rocket/><h2>Bem-vindo de volta! 👋</h2><p>Veja o desempenho das suas campanhas e engaje ainda mais seus clientes.</p></div><Button onClick={() => setActive('camp')}><Send size={17}/> Criar campanha</Button></div>
    <div className="stats"><Stat Icon={Users} label="Inscritos" value={used} change="dados reais"/><Stat Icon={Send} label="Campanhas" value={data.campaigns.length} change="no banco" color="blue"/><Stat Icon={MousePointerClick} label="Cliques" value={clicks.toLocaleString('pt-BR')} change="em breve" color="green"/><Stat Icon={ShoppingCart} label="Envios" value={sent.toLocaleString('pt-BR')} change="em breve" color="orange"/></div>
    <div className="dashGrid"><Card className="chart"><div className="cardHead"><h3>Desempenho</h3><select><option>Últimos 30 dias</option></select></div><div className="fakeChart"><svg viewBox="0 0 900 260" preserveAspectRatio="none"><path d="M0,230 C120,130 180,80 280,85 C420,90 450,125 560,100 C700,70 760,35 900,25" fill="none" stroke="#6d28d9" strokeWidth="5"/><path d="M0,250 C130,180 230,200 330,150 C470,130 520,175 640,130 C760,80 820,130 900,90" fill="none" stroke="#fb8500" strokeWidth="5"/><path d="M0,260 C120,170 180,110 280,115 C420,120 450,155 560,130 C700,100 760,65 900,55 L900,260 Z" fill="url(#g)"/><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#7c3aed55"/><stop offset="1" stopColor="#fff0"/></linearGradient></defs></svg></div></Card><Card className="planBox"><div className="cardHead"><h3>Seu plano atual</h3><Badge>{plan.label}</Badge></div><h2>{used} <small>/ {plan.limit.toLocaleString('pt-BR')}</small></h2><p>inscritos utilizados</p><div className="bar"><i style={{width:`${pct}%`}} /></div><small>{pct}% utilizado</small><Button>Gerenciar plano</Button></Card></div>
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
function Reports(){return <><div className="stats"><Stat Icon={TrendingUp} label="Melhor campanha" value="Promoção" change="em breve"/><Stat Icon={Bell} label="Melhor horário" value="09h" change="em breve" color="blue"/><Stat Icon={Users} label="Melhor público" value="Promoções" change="em breve" color="green"/></div><Card><h3>Desempenho por campanha</h3><div className="bars"><p>Promoção Relâmpago <i style={{width:'85%'}} /></p><p>Novidades da Semana <i style={{width:'55%'}} /></p><p>Cliente Sumido <i style={{width:'35%'}} /></p></div></Card></>}
function SettingsPanel({ loja }){return <Card><h3>Configurações</h3><label>Nome da loja</label><input defaultValue={loja?.nome || ''}/><label>Site ou catálogo</label><input defaultValue={loja?.site || ''}/><p className="ok"><ShieldCheck/> Permissão e descadastro serão controlados automaticamente.</p><Button className="primary">Salvar configurações</Button></Card>}

function Seller({ user, setUser, data, setData, loja, refreshData }) {
  const [active,setActive]=useState('dash');
  return <Shell user={user} setUser={setUser} active={active} setActive={setActive} menu={sellerMenu} data={data}>{active==='dash'&&<Dashboard data={data} user={user} setActive={setActive}/>} {active==='camp'&&<Campaigns data={data} setData={setData} lojaId={loja?.id} refreshData={refreshData}/>} {active==='auto'&&<Automations/>} {active==='clients'&&<Customers data={data} setData={setData} lojaId={loja?.id} refreshData={refreshData}/>} {active==='capture'&&<Capture loja={loja} data={data} setData={setData} refreshData={refreshData} user={user}/>} {active==='segments'&&<Customers data={data} setData={setData} lojaId={loja?.id} refreshData={refreshData}/>} {active==='reports'&&<Reports/>} {active==='store'&&<SettingsPanel loja={loja}/>} {active==='plans'&&<Plans/>} {active==='config'&&<SettingsPanel loja={loja}/>}</Shell>;
}

function Admin({ user, setUser, data, setData, refreshData }) {
  const [active,setActive]=useState('dash');
  async function addVendor(){
    alert('Por segurança, crie vendedores pelo cadastro normal ou em Authentication > Users. Depois eles aparecerão aqui.');
  }
  return <Shell user={user} setUser={setUser} active={active} setActive={setActive} menu={adminMenu} data={data}>{active==='dash'&&<><div className="stats"><Stat Icon={Store} label="Vendedores" value={data.vendors.length} change="dados reais"/><Stat Icon={Users} label="Inscritos totais" value={data.vendors.reduce((a,v)=>a+(Number(v.subscribers)||0),0).toLocaleString('pt-BR')} change="em todas as lojas" color="blue"/><Stat Icon={CreditCard} label="Planos pagos" value={data.vendors.filter(v=>normalizePlan(v.plan)!=='gratis').length} change="Pro/Business" color="green"/><Stat Icon={TrendingUp} label="MRR estimado" value={`R$ ${data.vendors.reduce((a,v)=>a+(normalizePlan(v.plan)==='pro'?39:normalizePlan(v.plan)==='business'?149:0),0)}`} change="base atual" color="orange"/></div><Card><div className="cardHead"><h3>Vendedores recentes</h3><Button onClick={refreshData}>Atualizar</Button></div><Table rows={data.vendors} cols={['name','email','plan','status','subscribers','campaigns','sales']}/></Card></>} {active==='vendors'&&<Card><div className="cardHead"><h3>Vendedores / usuários</h3><Button className="primary" onClick={addVendor}><Plus size={17}/> Adicionar</Button></div><Table rows={data.vendors} cols={['name','email','plan','status','subscribers','campaigns','sales']}/></Card>} {active==='plans'&&<Plans/>} {active==='global'&&<Card><h3>Campanha global para vendedores</h3><input defaultValue="Novidade no Chamy"/><textarea defaultValue="Agora você pode criar campanhas automáticas em poucos cliques."/><Button className="primary"><Send size={17}/> Enviar aviso geral</Button></Card>} {active==='support'&&<Card><h3>Chamados</h3><Table rows={data.tickets} cols={['vendor','subject','status']}/></Card>} {active==='settings'&&<SettingsPanel/>}</Shell>;
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
          customers: (clientes || []).map((c) => ({ id: c.id, name: c.nome || 'Cliente', city: c.cidade || '', whats: c.whatsapp || '', interest: c.interesse || 'Todos', status: c.status || 'ativo', last: 'Supabase', device: c.aceitou_push ? 'Push ativo' : 'Sem push' })),
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

  if (checking) return <div className="loginScreen"><Card className="loginBox"><Logo/><h2>Carregando Chamy...</h2></Card></div>;
  if(!user) return <Login setUser={setUser}/>;
  const refreshData = () => loadUserData(user);
  return <>{loadError && <div className="globalError">{loadError}</div>}{user.role==='admin'?<Admin user={user} setUser={setUser} data={data} setData={setData} refreshData={refreshData}/>:<Seller user={user} setUser={setUser} data={data} setData={setData} loja={loja} refreshData={refreshData}/>}</>;
}

createRoot(document.getElementById('root')).render(<App/>);
