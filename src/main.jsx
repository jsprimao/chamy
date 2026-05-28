import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion } from 'framer-motion';
import {
  Bell, Send, Users, BarChart3, CalendarClock, Zap, Settings, Crown,
  Plus, Search, Play, Pause, CheckCircle2, MessageCircle, MousePointerClick,
  Clock, ShieldCheck, Store, LogIn, UserPlus, Sparkles, Target, Copy,
  Eye, Trash2, Edit3, Gift, Megaphone, ShoppingCart, RotateCcw,
  CreditCard, Download, TrendingUp, Filter, Globe, Smartphone, MailCheck,
  AlertCircle, Layers, CalendarDays, Repeat, MapPin, Tag, UserCheck, Link,
  Image, Save, Power, LayoutDashboard, SendHorizontal, X, Menu, ExternalLink
} from 'lucide-react';
import './styles.css';

const logo = '/chamy-logo.png';

const campaignTemplates = [
  { title: 'Promoção Relâmpago', icon: Gift, category: 'Vendas', message: '🔥 Ofertas especiais por tempo limitado. Clique e aproveite agora!', audience: 'Interessados em promoções', frequency: 'Envio único' },
  { title: 'Novidades da Semana', icon: Sparkles, category: 'Lançamentos', message: '✨ Chegaram novidades no catálogo. Confira antes que acabem!', audience: 'Todos os clientes', frequency: 'Semanal' },
  { title: 'Cliente Sumido', icon: RotateCcw, category: 'Reativação', message: 'Sentimos sua falta! Temos novidades esperando por você.', audience: 'Clientes inativos', frequency: 'A cada 4 horas' },
  { title: 'Carrinho Abandonado', icon: ShoppingCart, category: 'Recuperação', message: 'Você deixou produtos no carrinho. Finalize seu pedido em poucos cliques.', audience: 'Carrinho abandonado', frequency: 'Automática' },
  { title: 'Queima de Estoque', icon: Megaphone, category: 'Ofertas', message: 'Últimas unidades com preço especial. Clique e confira!', audience: 'Todos os clientes', frequency: 'Diária' },
  { title: 'Cupom Especial', icon: Tag, category: 'Cupom', message: 'Você ganhou uma condição especial. Aproveite antes que expire!', audience: 'Clientes VIP', frequency: 'Envio único' },
  { title: 'Volte ao Catálogo', icon: Store, category: 'Tráfego', message: 'Temos produtos novos no catálogo esperando por você.', audience: 'Visitantes recentes', frequency: 'A cada 4 horas' },
  { title: 'Aviso Importante', icon: AlertCircle, category: 'Comunicado', message: 'Temos um aviso importante para nossos clientes. Clique para ver.', audience: 'Todos os clientes', frequency: 'Envio único' },
];

const automations = [
  { title: 'Boas-vindas', active: true, trigger: 'Novo inscrito', sent: 1284, desc: 'Envia uma primeira mensagem quando o cliente aceita receber notificações.' },
  { title: 'Cliente inativo', active: true, trigger: '7 dias sem acesso', sent: 318, desc: 'Chama automaticamente clientes que não acessam há alguns dias.' },
  { title: 'Novidades semanais', active: true, trigger: 'Toda sexta às 09h', sent: 920, desc: 'Envia novidades da semana para manter clientes voltando.' },
  { title: 'Carrinho abandonado', active: false, trigger: '2 horas após abandono', sent: 0, desc: 'Lembra o cliente de concluir o pedido no catálogo ou WhatsApp.' },
  { title: 'Pós-clique', active: false, trigger: 'Clicou e não comprou', sent: 0, desc: 'Envia novo lembrete para quem clicou, mas não concluiu a ação.' },
  { title: 'Aniversário do cliente', active: false, trigger: 'Data cadastrada', sent: 0, desc: 'Envia cupom ou mensagem especial no aniversário do cliente.' },
];

const initialCampaigns = [
  { id: 1, title: 'Novidades da Semana', message: 'Chegaram novos produtos no catálogo. Clique e confira agora!', status: 'Ativa', audience: 'Todos os clientes', frequency: 'A cada 4 horas', duration: '7 dias', clicks: 86, sent: 1240, ctr: '6,9%', created: 'Hoje' },
  { id: 2, title: 'Promoção Relâmpago', message: 'Ofertas especiais disponíveis somente hoje.', status: 'Pausada', audience: 'Interessados em promoções', frequency: 'Envio único', duration: '1 dia', clicks: 42, sent: 680, ctr: '6,1%', created: 'Ontem' },
  { id: 3, title: 'Volte para o Catálogo', message: 'Temos produtos novos esperando por você.', status: 'Programada', audience: 'Clientes inativos', frequency: 'Diária', duration: '5 dias', clicks: 0, sent: 0, ctr: '0%', created: 'Amanhã 09h' },
];

const customers = [
  { name: 'Loja Santa Rita', city: 'Aparecida/SP', interest: 'Promoções', status: 'Ativo', last: 'Hoje', device: 'Android', group: 'VIP' },
  { name: 'Casa São José', city: 'Guaratinguetá/SP', interest: 'Novidades', status: 'Ativo', last: 'Ontem', device: 'Desktop', group: 'Lojistas' },
  { name: 'Artigos Nossa Senhora', city: 'Campinas/SP', interest: 'Todos', status: 'Inativo', last: '12 dias', device: 'Android', group: 'Inativos' },
  { name: 'Bazar Católico Luz', city: 'São Paulo/SP', interest: 'Promoções', status: 'Ativo', last: '3 horas', device: 'iPhone', group: 'Promoções' },
  { name: 'Santuário Presentes', city: 'Rio de Janeiro/RJ', interest: 'Todos', status: 'Ativo', last: '2 dias', device: 'Desktop', group: 'Atacado' },
  { name: 'Atacado Santa Clara', city: 'Belo Horizonte/MG', interest: 'Novidades', status: 'Inativo', last: '21 dias', device: 'Android', group: 'Inativos' },
];

const sellers = [
  { loja: 'Comercial 10 Irmãos', responsavel: 'Jonas', email: 'tempusatacado@gmail.com', plano: 'Pro', status: 'Ativo', clientes: 1284, campanhas: 36, uso: '26%', vencimento: '05/06/2026' },
  { loja: 'Loja Santa Rita', responsavel: 'Maria Rita', email: 'contato@santarita.com.br', plano: 'Grátis', status: 'Teste', clientes: 198, campanhas: 4, uso: '66%', vencimento: 'Teste grátis' },
  { loja: 'Atacado São José', responsavel: 'Carlos Mendes', email: 'vendas@saojose.com.br', plano: 'Business', status: 'Ativo', clientes: 8420, campanhas: 112, uso: '42%', vencimento: '12/06/2026' },
  { loja: 'Bazar Católico Luz', responsavel: 'Ana Paula', email: 'ana@bazarluz.com.br', plano: 'Pro', status: 'Vencido', clientes: 2360, campanhas: 27, uso: '47%', vencimento: 'Vencido há 3 dias' },
  { loja: 'Presentes Aparecida', responsavel: 'Roberto', email: 'contato@presentesaparecida.com.br', plano: 'Grátis', status: 'Bloqueado', clientes: 301, campanhas: 2, uso: '100%', vencimento: 'Limite atingido' },
];

const adminMenu = [
  { id: 'geral', label: 'Dashboard Geral', icon: LayoutDashboard },
  { id: 'vendedores', label: 'Vendedores', icon: Store },
  { id: 'lojas', label: 'Lojas', icon: Globe },
  { id: 'planos', label: 'Planos e limites', icon: Crown },
  { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
  { id: 'campanhas', label: 'Campanhas globais', icon: SendHorizontal },
  { id: 'suporte', label: 'Suporte', icon: MessageCircle },
  { id: 'sistema', label: 'Sistema', icon: Settings },
];

const menu = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'campanhas', label: 'Campanhas', icon: Send },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'automacoes', label: 'Automações', icon: Zap },
  { id: 'captura', label: 'Captura', icon: Bell },
  { id: 'relatorios', label: 'Relatórios', icon: TrendingUp },
  { id: 'planos', label: 'Planos', icon: Crown },
  { id: 'config', label: 'Configurações', icon: Settings },
];

function Badge({ children, tone = 'slate' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Button({ children, className = '', variant = 'primary', onClick, type = 'button' }) {
  return <button type={type} onClick={onClick} className={`btn ${variant} ${className}`}>{children}</button>;
}

function Field(props) { return <input {...props} className={`field ${props.className || ''}`} />; }
function TextArea(props) { return <textarea {...props} className={`field textarea ${props.className || ''}`} />; }
function Select(props) { return <select {...props} className={`field ${props.className || ''}`} />; }
function Card({ children, className = '' }) { return <div className={`card ${className}`}>{children}</div>; }

function StatCard({ icon: Icon, label, value, detail }) {
  return <Card><div className="stat-card"><div><p>{label}</p><h3>{value}</h3><small>{detail}</small></div><div className="icon-gradient"><Icon size={22} /></div></div></Card>;
}

function Landing({ onEnter, onSignup, onAdmin }) {
  return <div className="landing">
    <div className="landing-bg" />
    <header className="topbar">
      <img src={logo} className="logo-full" alt="Chamy" />
      <div className="top-actions"><Button variant="ghostLight" onClick={onEnter}><LogIn size={16}/> Entrar</Button><Button variant="ghostLight" onClick={onAdmin}><ShieldCheck size={16}/> Admin</Button><Button variant="white" onClick={onSignup}><UserPlus size={16}/> Testar grátis</Button></div>
    </header>
    <main className="hero">
      <motion.section initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="hero-copy">
        <span className="pill"><Zap size={16}/> Campanhas automáticas para trazer clientes de volta</span>
        <h1>Chame clientes de volta sem depender só do WhatsApp.</h1>
        <p>Crie campanhas de promoções, novidades, cupons, carrinho abandonado e reativação. O cliente recebe o aviso, clica e volta para seu catálogo, loja ou WhatsApp.</p>
        <div className="hero-actions"><Button onClick={onSignup}>Começar grátis</Button><Button variant="ghostLight" onClick={onEnter}>Ver painel demo</Button></div>
        <div className="metrics"><div><b>4h</b><span>envios programados</span></div><div><b>7 dias</b><span>campanhas contínuas</span></div><div><b>1 clique</b><span>modelos prontos</span></div></div>
      </motion.section>
      <motion.section initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}} className="hero-card-wrap">
        <Card className="hero-card">
          <div className="campaign-preview">
            <div className="preview-head"><div className="icon-gradient"><Bell /></div><div><h3>Nova campanha</h3><p>Promoção da semana</p></div><Badge tone="green">Ativa</Badge></div>
            <Field readOnly value="🔥 Ofertas especiais chegaram!" />
            <TextArea readOnly value="Clique e veja as novidades antes que acabem." />
            <div className="preview-grid"><div><Clock/> <b>A cada 4 horas</b><span>08h às 22h</span></div><div><CalendarClock/> <b>Durante 7 dias</b><span>pausar quando quiser</span></div></div>
            <div className="dark-result"><span><small>Resultado parcial</small><b>86 cliques em 1.240 envios</b></span><MousePointerClick/></div>
          </div>
        </Card>
      </motion.section>
    </main>
    <section className="template-strip">{campaignTemplates.slice(0,4).map((t,i)=>{const I=t.icon;return <Card key={i} className="template-mini"><I/><b>{t.title}</b><span>{t.category}</span></Card>})}</section>
  </div>;
}

function AuthScreen({ onEnter, onBack }) {
  return <div className="auth-page"><Card className="auth-card"><div className="auth-left"><img src={logo} alt="Chamy" /><h2>Crie sua conta e comece a chamar clientes hoje.</h2><p>Este projeto já está preparado para receber login real, banco de dados, planos e integração com OneSignal.</p><ul><li><CheckCircle2/> Sem cartão no plano grátis</li><li><CheckCircle2/> Campanhas prontas em poucos cliques</li><li><CheckCircle2/> Instalação simples no site ou catálogo</li></ul></div><div className="auth-right"><h3>Cadastro grátis</h3><p>Preencha os dados da sua loja.</p><div className="form-grid"><Field placeholder="Seu nome"/><Field placeholder="E-mail"/><Field placeholder="Nome da loja"/><Field placeholder="Link do site ou catálogo"/><Field type="password" placeholder="Senha"/><Button onClick={onEnter}><UserPlus size={16}/> Criar conta demo</Button><Button variant="light" onClick={onBack}>Voltar</Button></div></div></Card></div>;
}

function AppShell() {
  const [active, setActive] = useState('dashboard');
  const [openMenu, setOpenMenu] = useState(false);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [query, setQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(campaignTemplates[0]);
  const [copied, setCopied] = useState(false);
  const filteredCustomers = useMemo(() => customers.filter(c => `${c.name} ${c.city} ${c.interest} ${c.status} ${c.group}`.toLowerCase().includes(query.toLowerCase())), [query]);

  const createCampaign = () => {
    const next = { id: Date.now(), title: selectedTemplate.title, message: selectedTemplate.message, status: 'Ativa', audience: selectedTemplate.audience, frequency: selectedTemplate.frequency, duration: '7 dias', clicks: 0, sent: 0, ctr: '0%', created: 'Agora' };
    setCampaigns([next, ...campaigns]);
    setActive('campanhas');
  };

  const activeLabel = menu.find(m => m.id === active)?.label;
  return <div className="app-shell">
    <aside className={`sidebar ${openMenu ? 'open' : ''}`}>
      <div className="side-logo"><img src={logo} alt="Chamy" /></div>
      <nav>{menu.map(item => { const Icon=item.icon; return <button key={item.id} onClick={()=>{setActive(item.id);setOpenMenu(false)}} className={active===item.id?'active':''}><Icon size={18}/>{item.label}</button> })}</nav>
      <div className="plan-card"><div><b>Plano Grátis</b><Badge tone="violet">Demo</Badge></div><p>300 inscritos e campanhas manuais.</p><Button onClick={()=>setActive('planos')}>Fazer upgrade</Button></div>
    </aside>
    <main className="main">
      <header className="page-header"><button className="mobile-menu" onClick={()=>setOpenMenu(!openMenu)}><Menu/></button><div><h2>{activeLabel}</h2><p>Loja exemplo: Comercial 10 Irmãos • Ambiente demonstrativo</p></div><div className="header-actions"><Button variant="light" onClick={()=>setActive('captura')}><Eye size={16}/> Captura</Button><Button onClick={createCampaign}><Plus size={16}/> Nova campanha</Button></div></header>
      {active==='dashboard' && <Dashboard campaigns={campaigns} onCampaigns={()=>setActive('campanhas')} createCampaign={createCampaign}/>} 
      {active==='campanhas' && <Campaigns campaigns={campaigns} templates={campaignTemplates} selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate} createCampaign={createCampaign}/>} 
      {active==='clientes' && <Customers query={query} setQuery={setQuery} filteredCustomers={filteredCustomers}/>} 
      {active==='automacoes' && <Automations/>} 
      {active==='captura' && <Capture copied={copied} setCopied={setCopied}/>} 
      {active==='relatorios' && <Reports campaigns={campaigns}/>} 
      {active==='planos' && <Plans/>} 
      {active==='config' && <SettingsPage/>} 
    </main>
  </div>;
}

function Dashboard({ campaigns, onCampaigns, createCampaign }) { return <div className="space"><div className="stats-grid"><StatCard icon={Users} label="Clientes inscritos" value="1.284" detail="+18 esta semana"/><StatCard icon={Send} label="Campanhas enviadas" value="36" detail="12 ativas/programadas"/><StatCard icon={MousePointerClick} label="Cliques" value="428" detail="Taxa média 12,8%"/><StatCard icon={MessageCircle} label="Pedidos gerados" value="74" detail="via catálogo/WhatsApp"/></div><div className="dashboard-grid"><Card><div className="card-title"><div><h3>Campanhas recentes</h3><p>Acompanhe desempenho e status</p></div><Button variant="light" onClick={onCampaigns}>Ver todas</Button></div><div className="row-list">{campaigns.slice(0,4).map(c=><CampaignRow key={c.id} c={c}/>)}</div></Card><Card className="suggestion"><Sparkles/><h3>Sugestão Chamy</h3><p>Seu melhor horário de clique está entre 09h e 12h. Programe uma campanha de novidades para amanhã às 09h.</p><Button variant="white" onClick={createCampaign}>Criar com sugestão</Button></Card></div></div> }

function Campaigns({ campaigns, templates, selectedTemplate, setSelectedTemplate, createCampaign }) { return <div className="campaign-layout"><Card className="campaign-form"><h3>Criar campanha</h3><p>Use um modelo pronto ou personalize.</p><div className="template-grid">{templates.map((t,i)=>{const I=t.icon;return <button key={i} onClick={()=>setSelectedTemplate(t)} className={selectedTemplate.title===t.title?'selected':''}><I size={18}/><b>{t.title}</b><span>{t.category}</span></button>})}</div><Field value={selectedTemplate.title} readOnly/><TextArea value={selectedTemplate.message} readOnly/><Field defaultValue="https://sualoja.com/promocoes"/><div className="two"><Select defaultValue={selectedTemplate.frequency}><option>A cada 4 horas</option><option>Diária</option><option>Envio único</option><option>Semanal</option><option>Automática</option></Select><Select><option>Durante 7 dias</option><option>Durante 3 dias</option><option>Durante 1 dia</option><option>Até pausar</option></Select></div><Select defaultValue={selectedTemplate.audience}><option>Todos os clientes</option><option>Clientes inativos</option><option>Interessados em promoções</option><option>Quem clicou na última campanha</option><option>Carrinho abandonado</option><option>Clientes VIP</option><option>Cidade específica</option></Select><div className="check-boxes"><label><input type="checkbox" defaultChecked/> Enviar somente das 08h às 22h</label><label><input type="checkbox" defaultChecked/> Não repetir para quem já clicou</label><label><input type="checkbox" defaultChecked/> Permitir descadastro</label><label><input type="checkbox"/> Teste A/B de mensagem</label></div><Button onClick={createCampaign}><Play size={16}/> Iniciar campanha</Button></Card><div className="row-list wide">{campaigns.map(c=><CampaignRow key={c.id} c={c}/>)}</div></div> }

function CampaignRow({ c }) { return <div className="campaign-row"><div className="campaign-info"><div className="small-icon"><Bell size={18}/></div><div><h4>{c.title}</h4><p>{c.message}</p><small>{c.frequency} • {c.duration} • {c.audience}</small></div></div><div className="campaign-stats"><Badge tone={c.status==='Ativa'?'green':c.status==='Pausada'?'amber':'violet'}>{c.status}</Badge><span>{c.sent} envios</span><span>{c.clicks} cliques</span><span>CTR {c.ctr}</span><button><Edit3 size={14}/></button><button><Trash2 size={14}/></button></div></div> }

function Customers({ query, setQuery, filteredCustomers }) { return <Card><div className="toolbar"><div className="searchbox"><Search size={18}/><Field value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cliente, cidade, interesse, grupo ou status..."/></div><Button variant="light"><Filter size={16}/> Filtros</Button><Button><Download size={16}/> Exportar</Button></div><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Cidade</th><th>Interesse</th><th>Grupo</th><th>Último acesso</th><th>Dispositivo</th><th>Status</th></tr></thead><tbody>{filteredCustomers.map((c,i)=><tr key={i}><td><b>{c.name}</b></td><td>{c.city}</td><td>{c.interest}</td><td>{c.group}</td><td>{c.last}</td><td>{c.device}</td><td><Badge tone={c.status==='Ativo'?'green':'slate'}>{c.status}</Badge></td></tr>)}</tbody></table></div></Card> }

function Automations() { return <div className="space"><Card><div className="card-title"><div><h3>Automações prontas</h3><p>Ative modelos para vender sem criar campanhas todos os dias.</p></div><Button><Plus size={16}/> Nova automação</Button></div></Card><div className="auto-grid">{automations.map((a,i)=><Card key={i}><div className="icon-gradient"><Zap/></div><div className="auto-head"><h3>{a.title}</h3><Badge tone={a.active?'green':'slate'}>{a.active?'Ativa':'Inativa'}</Badge></div><p>{a.desc}</p><div className="auto-box"><b>Gatilho:</b> {a.trigger}<br/><b>Envios:</b> {a.sent}</div><Button variant={a.active?'dark':'light'}>{a.active?<Pause size={16}/>:<Play size={16}/>} {a.active?'Pausar':'Ativar'}</Button></Card>)}</div></div> }

function Capture({ copied, setCopied }) { return <div className="capture-layout"><Card><h3>Widget de captura</h3><p>Mensagem que aparece para o visitante aceitar receber avisos.</p><Field defaultValue="Receba promoções e novidades"/><TextArea defaultValue="Quer ser avisado quando chegarem ofertas e produtos novos?"/><div className="two"><Field defaultValue="Sim, quero receber"/><Field defaultValue="Agora não"/></div><Select><option>Aparecer após 5 segundos</option><option>Aparecer ao rolar a página</option><option>Aparecer ao tentar sair</option></Select><Button onClick={()=>setCopied(true)}><Copy size={16}/> {copied?'Código copiado':'Copiar código de instalação'}</Button><pre>{'<script src="https://chamy.com.br/widget.js" data-loja="sua-loja"></script>'}</pre></Card><Card className="browser-preview"><h3>Prévia no site do cliente</h3><div className="fake-browser"><div className="dots"><span/><span/><span/><Globe size={18}/></div><div className="fake-products">{[1,2,3,4].map(i=><div key={i}><div/><p/><p/></div>)}</div><div className="permission-box"><div><div className="icon-gradient"><Bell/></div><span><b>Receba promoções e novidades</b><p>Quer ser avisado quando chegarem ofertas e produtos novos?</p></span></div><div className="two"><Button>Sim, quero</Button><Button variant="light">Agora não</Button></div></div></div></Card></div> }

function Reports({ campaigns }) { return <div className="space"><div className="stats-grid three"><StatCard icon={TrendingUp} label="Melhor campanha" value="Novidades" detail="86 cliques"/><StatCard icon={Clock} label="Melhor horário" value="09h" detail="maior taxa de clique"/><StatCard icon={Target} label="Melhor público" value="Promoções" detail="17,4% de cliques"/></div><Card><h3>Desempenho por campanha</h3><div className="report-list">{campaigns.map(c=>{const pct=Math.min(92, (parseFloat(c.ctr.replace(',','.'))||.5)*8);return <div className="report-item" key={c.id}><div><b>{c.title}</b><span>CTR {c.ctr}</span></div><div className="bar"><i style={{width:pct+'%'}}/></div><p>{c.sent} envios • {c.clicks} cliques • Público: {c.audience}</p></div>})}</div></Card></div> }

function Plans() { return <div className="plans-grid"><Plan name="Grátis" price="R$0" features={['Até 300 inscritos','Campanhas manuais','1 loja','Relatório simples','Marca Chamy']}/><Plan name="Pro" price="R$49" featured features={['Até 5.000 inscritos','Campanhas programadas','Automações','Segmentação','Sem marca Chamy']}/><Plan name="Business" price="R$99" features={['Até 20.000 inscritos','Múltiplas lojas','Relatórios avançados','Suporte prioritário','Integrações']}/></div> }
function Plan({ name, price, features, featured }) { return <Card className={featured?'featured-plan':''}>{featured&&<Badge tone="violet">Mais indicado</Badge>}<h3>{name}</h3><div className="price"><b>{price}</b><span>/mês</span></div><ul>{features.map((f,i)=><li key={i}><CheckCircle2 size={17}/>{f}</li>)}</ul><Button>{featured?'Começar no Pro':'Escolher plano'}</Button></Card> }

function SettingsPage() { return <div className="settings-layout"><Card><h3>Configuração da loja</h3><Field defaultValue="Comercial 10 Irmãos"/><Field defaultValue="https://sualoja.com.br"/><Field defaultValue="contato@sualoja.com.br"/><pre>{'<script src="https://chamy.com.br/widget.js" data-loja="comercial-10-irmaos"></script>'}</pre><p className="success"><ShieldCheck size={18}/> Permissão e descadastro controlados automaticamente.</p><Button><Save size={16}/> Salvar configurações</Button></Card><Card><h3>Integrações para produção</h3><Integration icon={Bell} title="OneSignal" desc="Motor real de entrega das notificações push." status="Recomendado"/><Integration icon={Store} title="Supabase" desc="Login, banco de dados e contas de usuários." status="Backend"/><Integration icon={CreditCard} title="Mercado Pago / Stripe" desc="Planos e assinaturas mensais." status="Pagamentos"/><Integration icon={MessageCircle} title="WhatsApp" desc="Levar cliente para fechar pedido no WhatsApp." status="Link"/></Card></div> }
function Integration({ icon: Icon, title, desc, status }) { return <div className="integration"><div><span><Icon size={18}/></span><div><b>{title}</b><p>{desc}</p></div></div><Badge tone="violet">{status}</Badge></div> }


function AdminShell({ onVendorPanel, onLanding }) {
  const [active, setActive] = useState('geral');
  const [q, setQ] = useState('');
  const [openMenu, setOpenMenu] = useState(false);
  const filtered = useMemo(() => sellers.filter(s => `${s.loja} ${s.responsavel} ${s.email} ${s.plano} ${s.status}`.toLowerCase().includes(q.toLowerCase())), [q]);
  const activeLabel = adminMenu.find(m => m.id === active)?.label;
  return <div className="app-shell admin-mode">
    <aside className={`sidebar ${openMenu ? 'open' : ''}`}>
      <div className="side-logo"><img src={logo} alt="Chamy" /></div>
      <Badge tone="violet">Área do administrador</Badge>
      <nav>{adminMenu.map(item => { const Icon=item.icon; return <button key={item.id} onClick={()=>{setActive(item.id);setOpenMenu(false)}} className={active===item.id?'active':''}><Icon size={18}/>{item.label}</button> })}</nav>
      <div className="plan-card"><div><b>Admin Chamy</b><Badge tone="green">Master</Badge></div><p>Controle vendedores, planos, uso, campanhas e suporte.</p><Button onClick={onVendorPanel}>Ver painel do vendedor</Button></div>
    </aside>
    <main className="main">
      <header className="page-header"><button className="mobile-menu" onClick={()=>setOpenMenu(!openMenu)}><Menu/></button><div><h2>{activeLabel}</h2><p>Controle interno da plataforma Chamy • Dados demonstrativos prontos para Supabase</p></div><div className="header-actions"><Button variant="light" onClick={onVendorPanel}><Store size={16}/> Painel vendedor</Button><Button onClick={onLanding}><ExternalLink size={16}/> Landing</Button></div></header>
      {active==='geral' && <AdminDashboard/>}
      {active==='vendedores' && <AdminSellers q={q} setQ={setQ} filtered={filtered}/>} 
      {active==='lojas' && <AdminStores filtered={filtered}/>} 
      {active==='planos' && <AdminPlans/>} 
      {active==='pagamentos' && <AdminPayments/>} 
      {active==='campanhas' && <AdminGlobalCampaigns/>} 
      {active==='suporte' && <AdminSupport/>} 
      {active==='sistema' && <AdminSystem/>} 
    </main>
  </div>;
}

function AdminDashboard() { return <div className="space"><div className="stats-grid"><StatCard icon={Store} label="Vendedores cadastrados" value="128" detail="+9 nos últimos 7 dias"/><StatCard icon={Crown} label="Planos pagos" value="43" detail="R$ 2.407/mês estimado"/><StatCard icon={Users} label="Clientes finais" value="42.918" detail="somando todas as lojas"/><StatCard icon={Send} label="Push enviados" value="186 mil" detail="este mês"/></div><div className="dashboard-grid"><Card><div className="card-title"><div><h3>Visão geral dos vendedores</h3><p>Contas que precisam de atenção.</p></div><Badge tone="amber">3 alertas</Badge></div><div className="row-list">{sellers.slice(0,5).map(s=><SellerRow key={s.email} s={s}/>)}</div></Card><Card className="suggestion"><ShieldCheck/><h3>Ações rápidas do Admin</h3><p>Libere teste grátis, altere planos, bloqueie contas vencidas, acompanhe uso e envie avisos gerais para todos os vendedores.</p><Button variant="white">Enviar aviso geral</Button></Card></div></div> }

function SellerRow({ s }) { return <div className="campaign-row"><div className="campaign-info"><div className="small-icon"><Store size={18}/></div><div><h4>{s.loja}</h4><p>{s.responsavel} • {s.email}</p><small>Plano {s.plano} • {s.clientes} clientes • {s.campanhas} campanhas</small></div></div><div className="campaign-stats"><Badge tone={s.status==='Ativo'?'green':s.status==='Vencido'?'amber':s.status==='Bloqueado'?'slate':'violet'}>{s.status}</Badge><span>Uso {s.uso}</span><span>{s.vencimento}</span><button title="Editar"><Edit3 size={14}/></button><button title="Bloquear"><Power size={14}/></button></div></div> }

function AdminSellers({ q, setQ, filtered }) { return <Card><div className="toolbar"><div className="searchbox"><Search size={18}/><Field value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar vendedor, loja, e-mail, plano ou status..."/></div><Button variant="light"><Filter size={16}/> Filtros</Button><Button><Plus size={16}/> Novo vendedor</Button></div><div className="table-wrap"><table><thead><tr><th>Loja</th><th>Responsável</th><th>E-mail</th><th>Plano</th><th>Status</th><th>Clientes</th><th>Campanhas</th><th>Vencimento</th><th>Ações</th></tr></thead><tbody>{filtered.map(s=><tr key={s.email}><td><b>{s.loja}</b></td><td>{s.responsavel}</td><td>{s.email}</td><td>{s.plano}</td><td><Badge tone={s.status==='Ativo'?'green':s.status==='Vencido'?'amber':s.status==='Bloqueado'?'slate':'violet'}>{s.status}</Badge></td><td>{s.clientes}</td><td>{s.campanhas}</td><td>{s.vencimento}</td><td><div className="mini-actions"><button>Ativar</button><button>Plano</button><button>Bloquear</button></div></td></tr>)}</tbody></table></div></Card> }

function AdminStores({ filtered }) { return <div className="space"><div className="stats-grid three"><StatCard icon={Globe} label="Lojas ativas" value="92" detail="com widget instalado"/><StatCard icon={Bell} label="Permissões push" value="42.918" detail="clientes autorizados"/><StatCard icon={AlertCircle} label="Com alerta" value="7" detail="limite, atraso ou erro"/></div><Card><h3>Lojas e uso da plataforma</h3><div className="row-list">{filtered.map(s=><SellerRow key={s.email} s={s}/>)}</div></Card></div> }

function AdminPlans() { return <div className="plans-grid"><Plan name="Grátis" price="R$0" features={['Até 300 inscritos','Campanhas manuais','1 loja','Marca Chamy','Suporte básico']}/><Plan name="Pro" price="R$49" featured features={['Até 5.000 inscritos','Campanhas programadas','Automações','Segmentação','Sem marca Chamy']}/><Plan name="Business" price="R$99" features={['Até 20.000 inscritos','Múltiplas lojas','Relatórios avançados','Suporte prioritário','Integrações']}/></div> }
function AdminPayments() { return <div className="space"><div className="stats-grid three"><StatCard icon={CreditCard} label="Receita mensal" value="R$ 2.407" detail="estimativa dos planos ativos"/><StatCard icon={AlertCircle} label="Vencidos" value="5" detail="precisam de cobrança"/><StatCard icon={CheckCircle2} label="Pagos" value="43" detail="assinaturas ativas"/></div><Card><h3>Pagamentos e cobranças</h3><div className="row-list">{sellers.map(s=><SellerRow key={s.email} s={s}/>)}</div></Card></div> }
function AdminGlobalCampaigns() { return <div className="campaign-layout"><Card className="campaign-form"><h3>Aviso geral para vendedores</h3><p>Use para avisar manutenção, novidade da plataforma ou cobrança.</p><Field defaultValue="Nova função disponível no Chamy"/><TextArea defaultValue="Agora você pode programar campanhas automáticas para a semana inteira."/><Select><option>Todos os vendedores</option><option>Somente plano grátis</option><option>Somente plano Pro</option><option>Contas vencidas</option></Select><Button><SendHorizontal size={16}/> Enviar aviso</Button></Card><Card><h3>Campanhas globais recentes</h3><div className="row-list"><CampaignRow c={{title:'Aviso de melhoria',message:'Novas automações de campanhas disponíveis.',status:'Ativa',frequency:'Envio único',duration:'Hoje',audience:'Todos os vendedores',sent:128,clicks:41,ctr:'32%'}}/><CampaignRow c={{title:'Lembrete de pagamento',message:'Regularize sua assinatura para manter as campanhas ativas.',status:'Programada',frequency:'Diária',duration:'3 dias',audience:'Contas vencidas',sent:0,clicks:0,ctr:'0%'}}/></div></Card></div> }
function AdminSupport() { return <div className="space"><Card><div className="card-title"><div><h3>Chamados de suporte</h3><p>Organize dúvidas, problemas de instalação e solicitações de plano.</p></div><Button><Plus size={16}/> Novo chamado</Button></div><div className="row-list"><SupportRow title="Dúvida para instalar widget" loja="Loja Santa Rita" status="Aberto"/><SupportRow title="Alterar plano para Business" loja="Atacado São José" status="Em análise"/><SupportRow title="Pagamento vencido" loja="Bazar Católico Luz" status="Urgente"/></div></Card></div> }
function SupportRow({ title, loja, status }) { return <div className="campaign-row"><div className="campaign-info"><div className="small-icon"><MessageCircle size={18}/></div><div><h4>{title}</h4><p>{loja}</p><small>Última atualização hoje</small></div></div><div className="campaign-stats"><Badge tone={status==='Urgente'?'amber':status==='Aberto'?'violet':'slate'}>{status}</Badge><button><Eye size={14}/></button></div></div> }
function AdminSystem() { return <div className="settings-layout"><Card><h3>Configurações gerais</h3><Field defaultValue="Chamy"/><Field defaultValue="https://chamy.com.br"/><Field defaultValue="suporte@chamy.com.br"/><div className="check-boxes"><label><input type="checkbox" defaultChecked/> Permitir cadastro grátis</label><label><input type="checkbox" defaultChecked/> Bloquear envio ao atingir limite do plano</label><label><input type="checkbox" defaultChecked/> Mostrar marca Chamy no plano grátis</label></div><Button><Save size={16}/> Salvar configurações</Button></Card><Card><h3>Próxima conexão com Supabase</h3><Integration icon={Store} title="Tabela vendedores" desc="Contas, lojas, planos e status." status="Pronto"/><Integration icon={Users} title="Tabela clientes" desc="Clientes finais inscritos por loja." status="Pronto"/><Integration icon={Send} title="Tabela campanhas" desc="Campanhas, envios, cliques e relatórios." status="Pronto"/><Integration icon={ShieldCheck} title="Permissões admin" desc="Acesso restrito para você administrar tudo." status="Pronto"/></Card></div> }

function Root() { const [screen,setScreen]=useState('landing'); if(screen==='signup') return <AuthScreen onEnter={()=>setScreen('app')} onBack={()=>setScreen('landing')}/>; if(screen==='admin') return <AdminShell onVendorPanel={()=>setScreen('app')} onLanding={()=>setScreen('landing')}/>; if(screen==='app') return <AppShell/>; return <Landing onEnter={()=>setScreen('app')} onSignup={()=>setScreen('signup')} onAdmin={()=>setScreen('admin')}/>; }

createRoot(document.getElementById('root')).render(<Root />);
