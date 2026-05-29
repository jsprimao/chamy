import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bell, BarChart3, Send, Zap, Users, Crown, Settings, Store, LifeBuoy, Plus, Search, Play, Pause, Trash2, Copy, ShieldCheck, MousePointerClick, MessageCircle, TrendingUp, ShoppingCart, Rocket, Gift, Sparkles, RotateCcw, Globe, CheckCircle2, Lock, LogOut, UserPlus, Eye, CreditCard, HelpCircle, Menu, MoreVertical } from 'lucide-react';
import './styles.css';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const plans = {
  Gratis: { label: 'Grátis', price: 'R$0', limit: 100, badge: 'Teste', features: ['Até 100 inscritos', 'Campanhas manuais', '1 loja', 'Marca Chamy', 'Suporte básico'] },
  Pro: { label: 'Pro', price: 'R$39', limit: 1000, badge: 'Mais indicado', features: ['Até 1.000 inscritos', 'Campanhas programadas', 'Automações', 'Segmentação', 'Sem marca Chamy'] },
  Business: { label: 'Business', price: 'R$149', limit: 10000, badge: 'Empresarial', features: ['Até 10.000 inscritos', 'Múltiplas lojas', 'Múltiplos usuários', 'Integrações/API', 'Suporte prioritário'] }
};

const seed = {
  vendors: [
    { id: 1, name: 'Comercial 10 Irmãos', email: 'loja@demo.com', plan: 'Pro', status: 'Ativo', subscribers: 842, campaigns: 12, sales: 12540 },
    { id: 2, name: 'Loja Santa Rita', email: 'santarita@demo.com', plan: 'Gratis', status: 'Teste', subscribers: 74, campaigns: 3, sales: 980 },
    { id: 3, name: 'Atacado São José', email: 'saojose@demo.com', plan: 'Business', status: 'Ativo', subscribers: 3692, campaigns: 48, sales: 48200 }
  ],
  customers: [
    { id: 1, name: 'Maria Aparecida', city: 'Aparecida/SP', whats: '(12) 99999-0001', interest: 'Promoções', status: 'Ativo', last: 'Hoje', device: 'Android' },
    { id: 2, name: 'Loja Santa Clara', city: 'Campinas/SP', whats: '(19) 98888-0002', interest: 'Novidades', status: 'Ativo', last: 'Ontem', device: 'Desktop' },
    { id: 3, name: 'Bazar Católico Luz', city: 'São Paulo/SP', whats: '(11) 97777-0003', interest: 'Todos', status: 'Inativo', last: '12 dias', device: 'iPhone' },
    { id: 4, name: 'Casa São José', city: 'Guaratinguetá/SP', whats: '(12) 96666-0004', interest: 'Promoções', status: 'Ativo', last: '3 horas', device: 'Android' }
  ],
  campaigns: [
    { id: 1, title: '🔥 Promoção Relâmpago', msg: 'Ofertas especiais por tempo limitado. Clique e aproveite!', status: 'Enviada', audience: 'Promoções', freq: 'Envio único', duration: '1 dia', sent: 842, clicks: 325, rate: '38,6%', date: '28/05/2026 10:30' },
    { id: 2, title: '✨ Novidades da Semana', msg: 'Chegaram novidades no catálogo. Confira agora!', status: 'Ativa', audience: 'Todos', freq: 'A cada 4 horas', duration: '7 dias', sent: 1240, clicks: 186, rate: '15,0%', date: 'Hoje' },
    { id: 3, title: 'Sentimos sua falta!', msg: 'Temos novidades esperando por você.', status: 'Programada', audience: 'Clientes inativos', freq: 'Diária', duration: '5 dias', sent: 0, clicks: 0, rate: '0%', date: 'Amanhã 09:00' }
  ],
  tickets: [{ id: 1, vendor: 'Loja Santa Rita', subject: 'Dúvida sobre campanha programada', status: 'Aberto' }]
};

function useData() {
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.chamyDataV2) || seed; } catch { return seed; }
  });
  useEffect(() => { localStorage.chamyDataV2 = JSON.stringify(data); }, [data]);
  return [data, setData];
}

function Button({ children, className = '', ...props }) { return <button className={`btn ${className}`} {...props}>{children}</button>; }
function Card({ children, className = '' }) { return <section className={`card ${className}`}>{children}</section>; }
function Badge({ children, tone = 'violet' }) { return <span className={`badge ${tone}`}>{children}</span>; }
function Logo({ compact = false }) { return <div className={compact ? 'brand compact' : 'brand'}><img src="/logo-chamy.png" alt="Chamy" /></div>; }

function Login({ setUser }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('jsprimao@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function finishLogin(sessionUser) {
    if (!supabase) return;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle();
    if (!profile) {
      setMessage('Usuário autenticado, mas sem perfil na tabela profiles. Crie o perfil no Supabase.');
      return;
    }
    setUser({ id: sessionUser.id, role: profile.tipo === 'admin' ? 'admin' : 'seller', name: profile.nome || profile.email, email: profile.email, plan: profile.plano || 'gratis' });
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setMessage('Supabase ainda não configurado na Vercel. Entrando em modo demonstração.');
      setUser({ role: 'admin', name: 'Administrador Demo', plan: 'Business' });
      return;
    }
    setLoading(true); setMessage('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMessage(error.message);
    await finishLogin(data.user);
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (!isSupabaseConfigured) return setMessage('Supabase ainda não configurado na Vercel.');
    setLoading(true); setMessage('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setLoading(false); return setMessage(error.message); }
    const userId = data.user?.id;
    if (userId) {
      await supabase.from('profiles').insert({ id: userId, nome: name || storeName || email, email, tipo: 'vendedor', plano: 'gratis', status: 'ativo' });
      await supabase.from('lojas').insert({ user_id: userId, nome: storeName || name || 'Minha loja', status: 'ativa' });
    }
    setLoading(false);
    setMessage('Conta criada. Se o Supabase pedir confirmação por e-mail, confirme antes de entrar.');
  }

  return <div className="loginScreen">
    <div className="loginHero">
      <Logo />
      <h1>Campanhas simples para chamar clientes de volta.</h1>
      <p>Agora com login real pelo Supabase para vendedores e administração geral do Chamy.</p>
      <div className="heroCards"><span>Login real</span><span>Cadastro de lojas</span><span>Painel Admin</span><span>Supabase conectado</span></div>
    </div>
    <Card className="loginBox">
      <img className="loginIcon" src="/app-icon.png" alt="" />
      <h2>{mode === 'login' ? 'Entrar no Chamy' : 'Criar conta grátis'}</h2>
      <p className="muted">Use seu e-mail e senha cadastrados no Supabase.</p>
      <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
        {mode === 'signup' && <><label>Seu nome</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" /><label>Nome da loja</label><input value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="Nome da loja" /></>}
        <label>E-mail</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" />
        <label>Senha</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha" />
        {message && <p className="authMessage">{message}</p>}
        <Button className="primary" disabled={loading}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</Button>
      </form>
      <div className="two">
        <Button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? <UserPlus size={17}/> : <Lock size={17}/>} {mode === 'login' ? 'Criar conta' : 'Já tenho conta'}</Button>
        <Button onClick={() => setUser({ role: 'admin', name: 'Administrador Demo', plan: 'Business' })}><ShieldCheck size={17}/> Demo</Button>
      </div>
    </Card>
  </div>;
}

const sellerMenu = [ ['dash','Dashboard',BarChart3], ['camp','Campanhas',Send], ['auto','Automação',Zap], ['clients','Inscritos',Users], ['segments','Segmentos',Users], ['reports','Relatórios',TrendingUp], ['store','Loja',Store], ['plans','Planos',Crown], ['config','Configurações',Settings] ];
const adminMenu = [ ['dash','Dashboard Geral',BarChart3], ['vendors','Vendedores',Store], ['plans','Planos',Crown], ['global','Campanhas Globais',Send], ['support','Suporte',LifeBuoy], ['settings','Configurações',Settings] ];

function Shell({ user, setUser, active, setActive, menu, children }) {
  return <div className="app">
    <aside className="sidebar">
      <Logo />
      <nav>{menu.map(([id, label, Icon]) => <button key={id} onClick={() => setActive(id)} className={active === id ? 'active' : ''}><Icon size={19}/><span>{label}</span><b>›</b></button>)}</nav>
      <div className="referral"><Rocket/><h3>Indique e ganhe</h3><p>Convide lojistas e ganhe descontos exclusivos.</p><Button>Indicar agora</Button></div>
      <button className="logout" onClick={async () => { if (supabase) await supabase.auth.signOut(); setUser(null); }}><LogOut size={17}/> Sair</button>
    </aside>
    <main>
      <header className="topbar"><div className="topTitle"><Menu/><div><h1>{menu.find(m => m[0] === active)?.[1]}</h1><p>{user.role === 'admin' ? 'Administração geral da plataforma' : 'Visão geral da sua loja'}</p></div></div><div className="userArea"><HelpCircle/> <Bell/> <div className="avatar">{user.name.slice(0,2).toUpperCase()}</div><div><b>{user.name}</b><small>{user.role === 'admin' ? 'Dono da plataforma' : `Plano ${user.plan}`}</small></div></div></header>
      {children}
    </main>
  </div>;
}

function Stat({ Icon, label, value, change, color = 'purple' }) { return <Card className="stat"><span className={color}><Icon/></span><div><h2>{value}</h2><p>{label}</p><small>↗ {change}</small></div></Card>; }

function Dashboard({ data, setActive }) {
  const sent = data.campaigns.reduce((a,c)=>a+c.sent,0), clicks = data.campaigns.reduce((a,c)=>a+c.clicks,0);
  return <>
    <div className="welcome"><div><Rocket/><h2>Bem-vindo de volta! 👋</h2><p>Veja o desempenho das suas campanhas e engaje ainda mais seus clientes.</p></div><Button onClick={() => setActive('camp')}><Send size={17}/> Criar campanha</Button></div>
    <div className="stats"><Stat Icon={Users} label="Inscritos" value="842" change="12,5% vs mês passado"/><Stat Icon={Send} label="Campanhas" value={data.campaigns.length} change="20% vs mês passado" color="blue"/><Stat Icon={MousePointerClick} label="Cliques" value={clicks.toLocaleString('pt-BR')} change="18,7% vs mês passado" color="green"/><Stat Icon={ShoppingCart} label="Vendas geradas" value="R$ 12.540" change="22,4% vs mês passado" color="orange"/></div>
    <div className="dashGrid"><Card className="chart"><div className="cardHead"><h3>Desempenho</h3><select><option>Últimos 30 dias</option></select></div><div className="fakeChart"><svg viewBox="0 0 900 260" preserveAspectRatio="none"><path d="M0,230 C120,130 180,80 280,85 C420,90 450,125 560,100 C700,70 760,35 900,25" fill="none" stroke="#6d28d9" strokeWidth="5"/><path d="M0,250 C130,180 230,200 330,150 C470,130 520,175 640,130 C760,80 820,130 900,90" fill="none" stroke="#fb8500" strokeWidth="5"/><path d="M0,260 C120,170 180,110 280,115 C420,120 450,155 560,130 C700,100 760,65 900,55 L900,260 Z" fill="url(#g)"/><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#7c3aed55"/><stop offset="1" stopColor="#fff0"/></linearGradient></defs></svg></div></Card><Card className="planBox"><div className="cardHead"><h3>Seu plano atual</h3><Badge>PRO</Badge></div><h2>842 <small>/ 1.000</small></h2><p>inscritos utilizados</p><div className="bar"><i style={{width:'84%'}} /></div><small>Renova em 12/06/2026</small><Button>Gerenciar plano</Button></Card></div>
    <Card><div className="cardHead"><h3>Campanhas recentes</h3><Button onClick={() => setActive('camp')}>Ver todas</Button></div><CampaignList data={data}/></Card>
  </>;
}

const templates = [
  ['Promoção Relâmpago', Gift, '🔥 Promoção Relâmpago', 'Ofertas especiais por tempo limitado. Clique e aproveite agora!'],
  ['Novidades da Semana', Sparkles, '✨ Novidades da Semana', 'Chegaram novidades no catálogo. Confira antes que acabem!'],
  ['Cliente Sumido', RotateCcw, 'Sentimos sua falta!', 'Temos novidades esperando por você.'],
  ['Carrinho Abandonado', ShoppingCart, 'Você esqueceu produtos', 'Finalize seu pedido em poucos cliques.']
];

function Campaigns({ data, setData }) {
  const [form, setForm] = useState({ title: '🔥 Promoção Relâmpago', msg: 'Ofertas especiais por tempo limitado. Clique e aproveite agora!', audience: 'Todos', freq: 'A cada 4 horas', duration: '7 dias' });
  function addCampaign(){ setData({...data, campaigns:[{ id:Date.now(), ...form, status:'Ativa', sent:0, clicks:0, rate:'0%', date:'Agora' }, ...data.campaigns]}); }
  function testNotify(){ if(!('Notification' in window)) return alert('Seu navegador não suporta notificações.'); Notification.requestPermission().then(p=> p==='granted' ? new Notification(form.title,{body:form.msg,icon:'/favicon.png'}) : alert('Permissão de notificação negada.')); }
  return <div className="campaignPage"><Card className="creator"><h3>Nova campanha</h3><p className="muted">Escolha um modelo pronto ou personalize.</p><div className="templates">{templates.map(([name,Icon,title,msg])=><button key={name} onClick={()=>setForm({...form,title,msg})}><Icon/><b>{name}</b></button>)}</div><label>Título</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><label>Mensagem</label><textarea value={form.msg} onChange={e=>setForm({...form,msg:e.target.value})}/><label>Link de destino</label><input defaultValue="https://sualoja.com/promocoes"/><div className="two"><div><label>Público</label><select value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}><option>Todos</option><option>Promoções</option><option>Clientes inativos</option><option>Quem clicou na última campanha</option></select></div><div><label>Frequência</label><select value={form.freq} onChange={e=>setForm({...form,freq:e.target.value})}><option>A cada 4 horas</option><option>Diária</option><option>Semanal</option><option>Envio único</option></select></div></div><label>Duração</label><select value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}><option>7 dias</option><option>3 dias</option><option>1 dia</option><option>Até pausar</option></select><label className="check"><input type="checkbox" defaultChecked/> Não enviar de madrugada</label><label className="check"><input type="checkbox" defaultChecked/> Não repetir para quem já clicou</label><div className="two"><Button className="primary" onClick={addCampaign}><Play size={17}/> Iniciar campanha</Button><Button onClick={testNotify}><Bell size={17}/> Testar notificação</Button></div></Card><Card><div className="cardHead"><h3>Campanhas</h3><Badge>{data.campaigns.length} criadas</Badge></div><CampaignList data={data} setData={setData}/></Card></div>;
}

function CampaignList({ data, setData }) {
  return <div className="campaignList">{data.campaigns.map(c=><div className="campaign" key={c.id}><div className="thumb"><Send/></div><div><b>{c.title}</b><p>{c.msg}</p><small>{c.freq} • {c.duration} • {c.audience}</small></div><div className="metrics"><span><b>{c.sent}</b>Enviados</span><span><b>{c.clicks}</b>Cliques</span><span><b>{c.rate}</b>Taxa</span><Badge tone={c.status==='Ativa'?'green':c.status==='Programada'?'violet':'gray'}>{c.status}</Badge>{setData&&<><Button onClick={()=>setData({...data,campaigns:data.campaigns.map(x=>x.id===c.id?{...x,status:x.status==='Ativa'?'Pausada':'Ativa'}:x)})}>{c.status==='Ativa'?<Pause size={16}/>:<Play size={16}/>}</Button><Button onClick={()=>setData({...data,campaigns:data.campaigns.filter(x=>x.id!==c.id)})}><Trash2 size={16}/></Button></>}<MoreVertical size={18}/></div></div>)}</div>;
}

function Customers({ data, setData }) { const [q,setQ]=useState(''); const rows=data.customers.filter(c=>(c.name+c.city+c.interest+c.status).toLowerCase().includes(q.toLowerCase())); function add(){let name=prompt('Nome do cliente/inscrito:'); if(name)setData({...data,customers:[{id:Date.now(),name,city:'Cidade/UF',whats:'',interest:'Todos',status:'Ativo',last:'Agora',device:'Android'},...data.customers]});}
  return <Card><div className="cardHead"><h3>Clientes inscritos</h3><Button className="primary" onClick={add}><Plus size={17}/> Adicionar</Button></div><div className="search"><Search/><input placeholder="Buscar por nome, cidade, interesse..." value={q} onChange={e=>setQ(e.target.value)}/></div><Table rows={rows} cols={['name','city','whats','interest','device','last','status']}/></Card> }

function Automations(){return <div className="autoGrid">{[['Cliente sumido','Envia aviso para quem não acessa há 7 dias.'],['Novidades da semana','Toda sexta-feira às 09h.'],['Carrinho abandonado','Lembra o cliente de finalizar o pedido.'],['Boas-vindas','Mensagem logo após aceitar notificações.']].map((a,i)=><Card key={a[0]}><Zap className="bigIcon"/><div className="cardHead"><h3>{a[0]}</h3><Badge tone={i===2?'gray':'green'}>{i===2?'Inativa':'Ativa'}</Badge></div><p>{a[1]}</p><Button>{i===2?<Play size={17}/>:<Pause size={17}/>} {i===2?'Ativar':'Pausar'}</Button></Card>)}</div>}
function Capture(){return <div className="campaignPage"><Card><h3>Widget de captura</h3><p className="muted">Mensagem exibida para visitantes aceitarem receber notificações.</p><label>Título</label><input defaultValue="Receba promoções e novidades"/><label>Mensagem</label><textarea defaultValue="Quer ser avisado quando chegarem ofertas e produtos novos?"/><Button className="primary" onClick={()=>navigator.clipboard?.writeText('<script src=https://chamy.com.br/widget.js></script>')}><Copy size={17}/> Copiar código</Button><pre>{'<script src="https://chamy.com.br/widget.js" data-loja="sua-loja"></script>'}</pre></Card><Card className="preview"><Globe/><div className="popup"><Bell/><h3>Receba promoções e novidades</h3><p>Quer ser avisado quando chegarem ofertas e produtos novos?</p><div className="two"><Button className="primary">Sim, quero</Button><Button>Agora não</Button></div></div></Card></div>}
function Plans(){return <div className="plans">{Object.values(plans).map((p,i)=><Card className={i===1?'featured':''} key={p.label}><Badge tone={i===1?'violet':'gray'}>{p.badge}</Badge><h2>{p.label}</h2><h1>{p.price}<small>/mês</small></h1>{p.features.map(f=><p className="ok" key={f}><CheckCircle2/> {f}</p>)}<Button className="primary">Escolher plano</Button></Card>)}</div>}
function Reports(){return <><div className="stats"><Stat Icon={TrendingUp} label="Melhor campanha" value="Promoção" change="325 cliques"/><Stat Icon={Bell} label="Melhor horário" value="09h" change="maior retorno" color="blue"/><Stat Icon={Users} label="Melhor público" value="Promoções" change="38,6% CTR" color="green"/></div><Card><h3>Desempenho por campanha</h3><div className="bars"><p>Promoção Relâmpago <i style={{width:'85%'}} /></p><p>Novidades da Semana <i style={{width:'55%'}} /></p><p>Cliente Sumido <i style={{width:'35%'}} /></p></div></Card></>}
function SettingsPanel(){return <Card><h3>Configurações</h3><label>Nome da loja</label><input defaultValue="Comercial 10 Irmãos"/><label>Site ou catálogo</label><input defaultValue="https://sualoja.com.br"/><p className="ok"><ShieldCheck/> Permissão e descadastro serão controlados automaticamente.</p><Button className="primary">Salvar configurações</Button></Card>}

function Seller({ user, setUser, data, setData }) { const [active,setActive]=useState('dash'); return <Shell user={user} setUser={setUser} active={active} setActive={setActive} menu={sellerMenu}>{active==='dash'&&<Dashboard data={data} setActive={setActive}/>} {active==='camp'&&<Campaigns data={data} setData={setData}/>} {active==='auto'&&<Automations/>} {active==='clients'&&<Customers data={data} setData={setData}/>} {active==='segments'&&<Customers data={data} setData={setData}/>} {active==='reports'&&<Reports/>} {active==='store'&&<SettingsPanel/>} {active==='plans'&&<Plans/>} {active==='config'&&<SettingsPanel/>}</Shell> }

function Admin({ user, setUser, data, setData }) { const [active,setActive]=useState('dash'); function addVendor(){let name=prompt('Nome do vendedor/loja:'); if(name)setData({...data,vendors:[{id:Date.now(),name,email:'novo@cliente.com',plan:'Gratis',status:'Teste',subscribers:0,campaigns:0,sales:0},...data.vendors]});}
  return <Shell user={user} setUser={setUser} active={active} setActive={setActive} menu={adminMenu}>{active==='dash'&&<><div className="stats"><Stat Icon={Store} label="Vendedores" value={data.vendors.length} change="cadastrados"/><Stat Icon={Users} label="Inscritos totais" value={data.vendors.reduce((a,v)=>a+v.subscribers,0).toLocaleString('pt-BR')} change="em todas as lojas" color="blue"/><Stat Icon={CreditCard} label="Planos pagos" value={data.vendors.filter(v=>v.plan!=='Gratis').length} change="Pro/Business" color="green"/><Stat Icon={TrendingUp} label="MRR demo" value="R$188" change="simulado" color="orange"/></div><Card><h3>Vendedores recentes</h3><Table rows={data.vendors} cols={['name','email','plan','status','subscribers','campaigns','sales']}/></Card></>} {active==='vendors'&&<Card><div className="cardHead"><h3>Vendedores / usuários</h3><Button className="primary" onClick={addVendor}><Plus size={17}/> Adicionar</Button></div><Table rows={data.vendors} cols={['name','email','plan','status','subscribers','campaigns','sales']}/></Card>} {active==='plans'&&<Plans/>} {active==='global'&&<Card><h3>Campanha global para vendedores</h3><input defaultValue="Novidade no Chamy"/><textarea defaultValue="Agora você pode criar campanhas automáticas em poucos cliques."/><Button className="primary"><Send size={17}/> Enviar aviso geral</Button></Card>} {active==='support'&&<Card><h3>Chamados</h3><Table rows={data.tickets} cols={['vendor','subject','status']}/></Card>} {active==='settings'&&<SettingsPanel/>}</Shell> }

function Table({ rows, cols }) { return <div className="table"><table><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}>{cols.map(c=><td key={c}>{c==='status'?<Badge tone={r[c]==='Ativo'?'green':'gray'}>{r[c]}</Badge>:c==='sales'?`R$ ${Number(r[c]||0).toLocaleString('pt-BR')}`:r[c]}</td>)}</tr>)}</tbody></table></div>; }

function App(){
  const [data,setData]=useData();
  const [user,setUser]=useState(null);
  const [checking,setChecking]=useState(true);

  useEffect(() => {
    let alive = true;
    async function loadSession(){
      if (!isSupabaseConfigured || !supabase) { setChecking(false); return; }
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user;
      if (!sessionUser) { setChecking(false); return; }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle();
      if (alive && profile) setUser({ id: sessionUser.id, role: profile.tipo === 'admin' ? 'admin' : 'seller', name: profile.nome || profile.email, email: profile.email, plan: profile.plano || 'gratis' });
      if (alive) setChecking(false);
    }
    loadSession();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    async function loadInitialData(){
      if (!user?.id || !supabase) return;
      try {
        if (user.role === 'admin') {
          const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending:false });
          const { data: lojas } = await supabase.from('lojas').select('*').order('created_at', { ascending:false });
          setData(prev => ({...prev, vendors: (profiles || []).map((p, idx) => ({ id: idx+1, name: p.nome || p.email, email: p.email, plan: p.plano || 'gratis', status: p.status || 'ativo', subscribers: 0, campaigns: 0, sales: 0, tipo: p.tipo, loja: (lojas || []).find(l=>l.user_id===p.id)?.nome || '' })) }));
        } else {
          const { data: lojas } = await supabase.from('lojas').select('*').eq('user_id', user.id).limit(1);
          const lojaId = lojas?.[0]?.id;
          if (!lojaId) return;
          const { data: clientes } = await supabase.from('clientes').select('*').eq('loja_id', lojaId).order('created_at', { ascending:false });
          const { data: campanhas } = await supabase.from('campanhas').select('*').eq('loja_id', lojaId).order('created_at', { ascending:false });
          setData(prev => ({...prev,
            customers: (clientes || []).map((c, idx) => ({ id: c.id || idx, name: c.nome || 'Cliente', city: c.cidade || '', whats: c.whatsapp || '', interest: c.interesse || 'Todos', status: c.status || 'Ativo', last: 'Banco Supabase', device: c.aceitou_push ? 'Push ativo' : 'Sem push' })),
            campaigns: (campanhas || []).map((c, idx) => ({ id: c.id || idx, title: c.titulo, msg: c.mensagem, status: c.status || 'rascunho', audience: c.publico || 'Todos', freq: c.frequencia || 'único', duration: `${c.duracao_dias || 1} dias`, sent: 0, clicks: 0, rate: '0%', date: new Date(c.created_at).toLocaleDateString('pt-BR') }))
          }));
        }
      } catch (e) { console.warn('Falha ao carregar Supabase', e); }
    }
    loadInitialData();
  }, [user?.id, user?.role]);

  if (checking) return <div className="loginScreen"><Card className="loginBox"><Logo/><h2>Carregando Chamy...</h2></Card></div>;
  if(!user) return <Login setUser={setUser}/>;
  return user.role==='admin'?<Admin user={user} setUser={setUser} data={data} setData={setData}/>:<Seller user={user} setUser={setUser} data={data} setData={setData}/>;
}

createRoot(document.getElementById('root')).render(<App/>);
