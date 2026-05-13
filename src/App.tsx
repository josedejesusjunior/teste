import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, Search, Book, Ticket, MessageSquare, Loader2,
  Settings, LogOut, Plus, ChevronRight, 
  AlertCircle, CheckCircle2, Clock, Send,
  HardDrive, ShieldAlert, Zap, UserPlus, Users,
  Wrench, ChevronDown, Filter, Trash2,
  FileText, BookOpen, Image, X, Video, Play,
  Copy, Check, Link, Eye, Pencil, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, signIn, logOut, signInEmail } from './lib/firebase.ts';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { onAuthStateChanged, User, getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  serverTimestamp, updateDoc, doc, setDoc, deleteDoc,
  where,
  limit, getDocs,
  Timestamp
} from 'firebase/firestore';
import { askSupportBot, analyzeEscalation, generateSupportImage } from './lib/gemini.ts';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

// --- Types ---
interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

interface TechnicalManual {
  id: string;
  title: string;
  model: string;
  size: string;
  url: string;
  createdAt: Timestamp;
}

interface TicketData {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'escalated' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  technicianId: string;
  technicianEmail: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  imageUrls?: string[];
  timestamp: Timestamp;
  isBot: boolean;
}

// --- Constants ---

const INITIAL_KB_ARTICLES = [
  {
    title: "Instalação e Substituição: Banco do Brasil",
    category: "Procedimentos",
    tags: ["bb", "banco do brasil", "instalação", "configuração"],
    content: "# Guia de Instalação no Banco do Brasil\n\n## 1. Verificação Elétrica\n- **Voltagem:** Verificar se a rede está entre **115v e 132v** (estabilizador ou tomada).\n- **Locais 220v:** É OBRIGATÓRIO o uso de transformador de no mínimo **3000VA**.\n\n## 2. Configuração de Rede (Agências)\n- **Range de IP:** 10.10.10.201 até 10.10.10.210.\n- **Máscara:** 255.255.255.0\n- **Gateway:** Final sempre **254** (Ex: 10.10.10.254).\n- **Fixação de IP:** Colocar a impressora em DHCP primeiro para identificar a rede, depois fixar o IP conforme o range acima.\n\n### Procedimento DHCP:\n`Configurações > Redes e portas > Ethernet > Ipv4 > Ativar DHCP`\n\n## 3. Senhas e Master Reset\n- **Senha Padrão:** `ctisoimp`\n- **Falha de Senha (Jumper):** Faça um jumper na placa lateral direita. Localize o **jumper amarelo** 🟡 e mude a posição com a máquina ligada. Reinicie o equipamento.\n\n## 4. Estação do Usuário\n- **Linux:** Apenas reinicie o computador; a impressora será instalada automaticamente.\n- **Windows:** Vá na **Central de Software** e instale via IP.\n\n## 5. Digitalização (Específico MX722)\n- **Requisito Físico:** É obrigatório possuir **HD (Hard Disk)** instalado para a digitalização funcionar.\n- **Arquivos de Solução:** Instalar os arquivos via interface web na ordem:\n  1. `SCANFROMWEBSERVICE FLS`\n  2. `SCANFROMWEBSERVICE UCF` \n- **Link dos Arquivos:** [Acesse a pasta no Google Drive](https://drive.google.com/drive/folders/1Kz7Zo2LyFfqhYRtgljXoR5Y67VlgVVTv)\n\n*Nota: Os modelos MS826 e CS720 são exclusivamente para impressão.*"
  },
  {
    title: "Catálogo Geral: Peças e Part Numbers Lexmark",
    category: "Peças",
    tags: ["lexmark", "part numbers", "catálogo", "suporte"],
    content: "### Fontes e Power Supplies\n- **40X7676**: FONTE MX711 / LVPS\n- **41X1112**: FONTE MX722 / MS826\n- **40X7694**: FONTE MS812 / LVPS\n- **41X1201**: FONTE MX622 / MS622 / MX522\n- **40X7578**: HVPS MX711 / MS812\n- **41X1099**: HVPS MX722 / MS826\n- **41X0425**: LVPS CS720 / CX725\n\n### Fusores\n- **41X2141**: FUSOR MX722, MS826\n- **40X8019**: FUSOR MX711, MS812\n- **41X0252**: FUSOR CS720, CX725\n- **41X1178**: FUSOR MX622, MS622, MX522\n- **40X8343**: FUSOR MS610 DN / MS510 (100V)\n- **40X7100/101/102**: FUSER X792 (115V/220V/100V)\n\n### Suprimentos (Unidades de Imagem e Tonner)\n- **58D0Z00**: UI MX722 / MS826\n- **52D0Z00**: UI MX711 / MS812\n- **56F0Z00**: UI MS521 / MX521 / MS621 / MX522 / MS622\n- **52DBX0E**: TONNER PRETO MX711 (Extra Rendimento)\n- **52DBH00**: TONNER MS812\n- **56F0UA0**: TONNER MX522 / MX622\n- **74C4SY0/SC0**: TONNER AMARELO/CIANO CS725\n\n### Componentes ADF e Digitalização\n- **40X7786**: FLATBED SCANNER CCD MX711\n- **41X1899**: CCD MESA MX722\n- **41X2361**: CABO FLAT CCD MX722\n- **40X8375**: CABO FLAT SCANNER MX711\n- **40X9229**: ADF ASSEMBLY COMPLETO MX711\n- **41X1895**: CONJUNTO ADF MX722\n- **40X7774**: ROLO DE COLETA ADF\n- **40X7749**: CORREIA DE ALIMENTAÇÃO ADF\n\n### Placas e Mecânica\n- **40X9234**: CONTROLLER MX711\n- **41X1147**: CONTROLLER MX722\n- **41X1127**: CONTROLLER MS826\n- **40X7684**: MOTOR DUPLEX MX711/MS812\n- **41X1050**: MOTOR DUPLEX MX722/MS826\n- **41X1096**: MOTOR REDRIVE MX722\n- **41X1658**: BANDEJA OPCIONAL 550 MX722/MS826"
  },
  {
    title: "Peças Comuns: MX711 (Part Numbers)",
    category: "Peças",
    tags: ["mx711", "lexmark", "específico"],
    content: "- **40X7689**: Contato do chip inteligente UI\n- **40X7692**: Contato do chip inteligente Tonner\n- **40X7667**: Aba frontal duplex (capa azul)\n- **40X7723**: Mola de torção\n- **40X7762**: ADF Dobradiça Direita\n- **40X7779**: Sensor ADF 1ª varredura\n- **40X9232**: Placa controladora ADF MX711"
  },
  {
    title: "Tutoriais: Impressão de Relatórios",
    category: "Tutoriais",
    tags: ["relatórios", "configuração", "estatísticas", "rede"],
    content: "# Como retirar Relatórios do Equipamento\n\nSiga os seguintes passos no painel de controle:\n\n1. **Acesse o menu:** No painel de controle da impressora.\n2. **Navegação:** Vá em **Configurações** > **Relatórios**.\n3. **Estatísticas do Dispositivo:** Em Relatórios, selecione **Dispositivo** > **Estatísticas do dispositivo** > **Imprimir**.\n4. **Página de Rede:** Em Relatórios, selecione **Rede** > **Página de configuração de rede**.\n\n[Assista aqui: Tutorial de Relatórios Lexmark (YouTube)](https://www.youtube.com/watch?v=t_6J6lO3j9I)"
  },
  {
    title: "Diagnóstico: Manchas e Falhas na Impressão",
    category: "Troubleshooting",
    tags: ["falha", "mancha", "qualidade", "impressão"],
    content: "# Guia de Diagnóstico de Qualidade\n\n## Sintomas Comuns:\n- **Listras Verticais Brancas:** Geralmente indicam obstáculo no laser ou espelho sujo.\n- **Fundo Cinza ou Manchas Repetitivas:** Pode ser cilindro da Unidade de Imagem (UI) desgastado ou vazamento de tonner.\n- **Pontos Repetitivos a cada 38mm ou 94mm:**\n  - 38mm: Rolo de transferência.\n  - 94mm: Cilindro da Unidade de Imagem.\n\n## Perguntas de Diagnóstico:\n1. O defeito aparece em todas as cores ou apenas em uma?\n2. O erro persiste após a limpeza dos contatos da UI?\n\n[Veja a foto de exemplo de falha de cilindro](https://www.google.com/search?q=lexmark+drum+failure+sample&tbm=isch)"
  },
  {
    title: "Vídeo: Troca da Unidade de Imagem (UI) - MX/MS Series",
    category: "Vídeos",
    tags: ["vídeo", "ui", "unidade de imagem", "manutenção"],
    content: "# Substituição da Unidade de Imagem\n\nEste vídeo demonstra como remover e instalar corretamente a Unidade de Imagem 50F0Z00 ou 52D0Z00.\n\n[Assista aqui: Troca de Cilindro Lexmark (YouTube)](https://www.youtube.com/watch?v=E73l9fUf67I)"
  },
  {
    title: "Vídeo: Limpeza do Vidro do Scanner e Listras na Digitalização",
    category: "Vídeos",
    tags: ["vídeo", "scanner", "limpeza", "digitalização", "lista"],
    content: "# Como limpar o Vidro do Scanner\n\nSe houver listras pretas na digitalização ou cópia via ADF, o problema geralmente é sujeira no vidro pequeno da esquerda.\n\n[Assista aqui: Limpeza de Scanner Lexmark (YouTube)](https://www.youtube.com/watch?v=vVjI-idAEvY)"
  },
  {
    title: "Vídeo: Atolamento de Papel na Bandeja e Pick Rollers",
    category: "Vídeos",
    tags: ["vídeo", "atolamento", "paper jam", "rolete", "pick roller"],
    content: "# Resolvendo Atolamento de Papel\n\nProcedimento para limpeza ou troca dos roletes de tração (Pick Rollers) quando a máquina não puxa papel.\n\n[Assista aqui: Manutenção de Rolete Lexmark (YouTube)](https://www.youtube.com/watch?v=A2dYq1Yv_Zg)"
  },
  {
    title: "Vídeo: Troca do Kit de Manutenção (Fusor) MX722/MS826",
    category: "Vídeos",
    tags: ["vídeo", "fusor", "fuser", "kit manutenção", "mx722"],
    content: "# Substituição do Fusor de Alta Performance\n\nPasso a passo para a troca do fusor e reset do contador de manutenção nos modelos novos.\n\n[Assista aqui: Troca de Fusor MX722 (YouTube)](https://www.youtube.com/watch?v=9LhO1k3P7mY)"
  }
];

const DEFAULT_MANUALS = [
  { title: 'Guia de Serviço Lexmark MX722', model: 'MX722 / MS826', size: '12.4 MB', url: '#' },
  { title: 'Guia de Serviço Lexmark MX711', model: 'MX711 / MS812', size: '10.8 MB', url: '#' },
  { title: 'Catálogo de Peças CS720', model: 'CS720 / CX725', size: '5.2 MB', url: '#' },
  { title: 'Manual de Manutenção MX622', model: 'MX622 / MS622', size: '8.1 MB', url: '#' },
  { title: 'Guia de Bolso: Códigos de Erro', model: 'Multifuncionais', size: '2.1 MB', url: '#' },
  { title: 'Arquivos de Digitalização BB', model: 'MX722 (HD)', size: 'Google Drive', url: 'https://drive.google.com/drive/folders/1Kz7Zo2LyFfqhYRtgljXoR5Y67VlgVVTv' },
];

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 text-sm font-medium ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
  </button>
);

const Badge = ({ children, color = 'blue' }: any) => {
  const colors: any = {
    blue: 'bg-blue-100 text-blue-700 border border-blue-200',
    green: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    yellow: 'bg-amber-100 text-amber-700 border border-amber-200',
    red: 'bg-rose-100 text-rose-700 border border-rose-200',
    gray: 'bg-slate-100 text-slate-700 border border-slate-200',
    orange: 'bg-orange-100 text-orange-700 border border-orange-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors[color]}`}>
      {children}
    </span>
  );
};

const FlashPlayer = ({ url }: { url: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadFlash = () => {
      if (containerRef.current) {
        // @ts-ignore
        if (window.RufflePlayer) {
          // @ts-ignore
          const ruffle = window.RufflePlayer.newest();
          const player = ruffle.createPlayer();
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(player);
          player.style.width = "100%";
          player.style.height = "100%";
          player.load(url);
        } else {
          containerRef.current.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-slate-400 gap-2"><p class="font-bold">Adobe Flash Emulator (Ruffle) não carregado</p><p class="text-xs">Verifique sua conexão</p></div>';
        }
      }
    };

    const timeout = setTimeout(loadFlash, 100);
    return () => clearTimeout(timeout);
  }, [url]);

  return <div ref={containerRef} className="w-full h-full bg-slate-900 overflow-hidden" />;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.email === 'josedejesusjunior@live.com';
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kb' | 'tickets' | 'chat' | 'manuals' | 'video_manuals' | 'users'>('dashboard');
  
  // Knowledge Base State
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [kbSearch, setKbSearch] = useState('');
  const [selectedKbTags, setSelectedKbTags] = useState<string[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [isResettingKb, setIsResettingKb] = useState(false);

  // Manuals State
  const [manuals, setManuals] = useState<TechnicalManual[]>([]);
  const [isNewManualOpen, setIsNewManualOpen] = useState(false);
  const [editingManual, setEditingManual] = useState<TechnicalManual | null>(null);
  
  // Technician Registration State
  const [techEmail, setTechEmail] = useState('');
  const [techPassword, setTechPassword] = useState('');
  const [isRegisteringTech, setIsRegisteringTech] = useState(false);
  const [techMessage, setTechMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleCreateTech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techEmail || !techPassword) return;
    
    setIsRegisteringTech(true);
    setTechMessage(null);
    
    try {
      // Use secondary app to create user without logging out the current admin
      const secondaryApp = getApps().length > 1 
        ? getApp('Secondary') 
        : initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      await createUserWithEmailAndPassword(secondaryAuth, techEmail, techPassword);
      
      setTechMessage({ type: 'success', text: 'Técnico cadastrado com sucesso! Ele já pode acessar o sistema.' });
      setTechEmail('');
      setTechPassword('');
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Falha ao cadastrar técnico.';
      if (err.code === 'auth/operation-not-allowed') {
        errorMsg = '⚠️ ERRO DE CONFIGURAÇÃO: Para cadastrar novos técnicos, você deve primeiro ativar o provedor "E-mail/Senha" no Console do Firebase (Menu Autenticação > Sign-in Method).';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'Este e-mail já está em uso por outro técnico.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'A senha informada é muito curta (mínimo 6 caracteres).';
      }
      setTechMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsRegisteringTech(false);
    }
  };
  const [newManual, setNewManual] = useState({ title: '', model: '', url: '', size: 'Local' });
  const [isNewVideoManualOpen, setIsNewVideoManualOpen] = useState(false);
  const [newVideoManual, setNewVideoManual] = useState({ title: '', category: 'Vídeos', url: '', tags: '' });
  const [editingVideoManual, setEditingVideoManual] = useState<KnowledgeArticle | null>(null);
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [playingVideo, setPlayingVideo] = useState<{ title: string, url: string } | null>(null);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginTab, setLoginTab] = useState<'admin' | 'user'>('user');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInEmail(loginEmail, loginPassword);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setLoginError('⚠️ CONFIGURAÇÃO PENDENTE: O login por E-mail/Senha está desativado no Firebase. Por favor, acesse o Console do Firebase > Autenticação > Sign-in Method e ATIVE o provedor "E-mail/Senha".');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setLoginError(loginTab === 'admin' ? 'Credenciais administrativas incorretas.' : 'ID Técnico ou senha inválidos.');
      } else {
        setLoginError('Erro ao conectar com o serviço de autenticação.');
      }
    }
  };

  useEffect(() => {
    if (editingVideoManual) {
      const match = editingVideoManual.content.match(/\((https?:\/\/[^\)]+)\)/);
      if (match) {
        setEditVideoUrl(match[1]);
      } else {
        setEditVideoUrl('');
      }
    }
  }, [editingVideoManual]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = useState<TechnicalManual | null>(null);

  useEffect(() => {
    if (copiedId) {
      const timer = setTimeout(() => setCopiedId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedId]);

  const handleCopyLink = (url: string, id: string) => {
    if (!url || url === '#') return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
  };

  const handleDownloadArticle = (article: KnowledgeArticle) => {
    const blob = new Blob([article.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadVideo = (video: KnowledgeArticle) => {
    const urlMatch = video.content.match(/\((https?:\/\/[^\)]+)\)/);
    const videoUrl = urlMatch ? urlMatch[1] : '';
    
    if (!videoUrl) {
      alert('URL do vídeo não encontrada.');
      return;
    }

    const isDirectVideo = videoUrl.match(/\.(mp4|webm|ogg|mov|swf)$/i);
    
    if (isDirectVideo) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = video.title;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // For YouTube/Drive, we can't easily trigger a direct browser download via simple link
      // but we can open the link in a new tab for "offline" access (if the service supports it)
      // or inform the user.
      window.open(videoUrl, '_blank');
      alert('Para acessar este vídeo offline, utilize a função de download do serviço de hospedagem (YouTube/Drive).');
    }
  };

  // Tickets State
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 'medium' as any });
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'escalated' | 'resolved'>('all');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  const [escalationAlert, setEscalationAlert] = useState<{ ticketId: string; subject: string; reason: string } | null>(null);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed KB if empty
  const seedKb = React.useCallback(async (force = false) => {
    const snap = await getDocs(query(collection(db, 'knowledge_base'), limit(1)));
    if (snap.empty || force) {
      if (force) {
        setIsResettingKb(true);
        setSelectedArticle(null);
        const allDocs = await getDocs(query(collection(db, 'knowledge_base'), limit(100)));
        for (const d of allDocs.docs) {
          try { await deleteDoc(doc(db, 'knowledge_base', d.id)); } catch(e) {}
        }
      }
      
      for (const a of INITIAL_KB_ARTICLES) {
        await addDoc(collection(db, 'knowledge_base'), { ...a, createdAt: serverTimestamp() });
      }
      
      if (force) setIsResettingKb(false);
    }
  }, []);

  const seedManuals = React.useCallback(async (force = false) => {
    const snap = await getDocs(query(collection(db, 'manuals'), limit(1)));
    if (snap.empty || force) {
      if (force) {
        const allDocs = await getDocs(query(collection(db, 'manuals'), limit(100)));
        for (const d of allDocs.docs) {
          try { await deleteDoc(doc(db, 'manuals', d.id)); } catch(e) {}
        }
      }
      
      for (const m of DEFAULT_MANUALS) {
        await addDoc(collection(db, 'manuals'), { ...m, createdAt: serverTimestamp() });
      }
    }
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Listeners
  useEffect(() => {
    if (!user) return;

    seedKb();
    seedManuals();

    // Load KB
    const kbQuery = query(collection(db, 'knowledge_base'), limit(50));
    const unsubKb = onSnapshot(kbQuery, (snap) => {
      setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeArticle)));
    });

    // Load Tickets
    const ticketQuery = query(collection(db, 'tickets'), orderBy('updatedAt', 'desc'));
    const unsubTickets = onSnapshot(ticketQuery, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() } as TicketData)));
    });

    // Load Manuals
    const manualsQuery = query(collection(db, 'manuals'), orderBy('createdAt', 'desc'));
    const unsubManuals = onSnapshot(manualsQuery, (snap) => {
      const dbManuals = snap.docs.map(d => ({ id: d.id, ...d.data() } as TechnicalManual));
      setManuals(dbManuals);
    });

    return () => { unsubKb(); unsubTickets(); unsubManuals(); };
  }, [user, seedKb, seedManuals]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotTyping]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const ticketPayload = {
        ...newTicket,
        status: 'open' as const,
        technicianId: user.uid,
        technicianEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'tickets'), ticketPayload);
      
      // Auto-Escalation Check if description mentions critical failure
      const analysis = await analyzeEscalation(newTicket.description);
      
      if (analysis.shouldEscalate) {
        await updateDoc(doc(db, 'tickets', docRef.id), {
          status: 'escalated',
          priority: analysis.priority || 'high',
          updatedAt: serverTimestamp()
        });
        
        await addDoc(collection(db, `tickets/${docRef.id}/messages`), {
          senderId: 'bot',
          senderName: 'Análise de Segurança',
          content: `🚨 **ALERTA DE ESCALONAMENTO AUTOMÁTICO** \n\n ${analysis.reason}`,
          timestamp: serverTimestamp(),
          isBot: true
        });

        // Set alert to be shown prominently
        setEscalationAlert({ 
          ticketId: docRef.id,
          subject: newTicket.subject, 
          reason: analysis.reason 
        });
      }

      setIsNewTicketOpen(false);
      setNewTicket({ subject: '', description: '', priority: 'medium' });
      
      // Select the new ticket automatically
      const newTicketData: TicketData = {
        id: docRef.id,
        ...ticketPayload,
        status: analysis.shouldEscalate ? 'escalated' : 'open',
        priority: analysis.shouldEscalate ? (analysis.priority || 'high') : newTicket.priority,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      setSelectedTicket(newTicketData);
      setActiveTab('dashboard'); // Ensure we are on dashboard to see the details if it's there
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!chatInput.trim() && selectedImages.length === 0) || !user) return;

    let imageUrls: string[] = [];
    let imagesData: { data: string; mimeType: string }[] = [];

    if (selectedImages.length > 0) {
      imageUrls = [...imagePreviews];
      
      const fileToData = async (file: File) => {
        return new Promise<{ data: string; mimeType: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ data: base64, mimeType: file.type });
          };
          reader.readAsDataURL(file);
        });
      };

      imagesData = await Promise.all(selectedImages.map(fileToData));
    }

    const userMsg = {
      senderId: user.uid,
      senderName: user.displayName || user.email || 'Eu',
      content: chatInput,
      imageUrls: imageUrls,
      timestamp: Timestamp.now(),
      isBot: false
    };

    setMessages(prev => [...prev, userMsg as any]);
    setChatInput('');
    setSelectedImages([]);
    setImagePreviews([]);
    setIsBotTyping(true);

    // Context from KB for the bot - Get all relevant articles or top 5
    const context = articles
      .slice(0, 8)
      .map(a => `Título: ${a.title}\nConteúdo: ${a.content}`).join('\n\n');

    // Filter and format history for Gemini (last 10 messages to keep context)
    const history = messages.slice(-10).map(m => ({
      role: (m.isBot ? 'model' : 'user') as 'model' | 'user',
      parts: [{ text: m.content }]
    }));

    const generateValidationCode = () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      let code = '';
      for (let i = 0; i < 2; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
      for (let i = 0; i < 4; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
      return code;
    };

    const isValidationIntent = chatInput.toLowerCase().includes('evidencia') || 
                               chatInput.toLowerCase().includes('foto') || 
                               chatInput.toLowerCase().includes('validar') ||
                               chatInput.toLowerCase().includes('conclui');

    let { text: botResponse, functionCall } = await askSupportBot(
      chatInput || (imagesData.length > 0 ? "Analise estas imagens fornecidas." : ""), 
      history,
      context, 
      imagesData
    );

    let generatedImageUrl = '';
    if (functionCall && functionCall.name === 'generate_image') {
      try {
        generatedImageUrl = await generateSupportImage(functionCall.args.prompt, functionCall.args.aspectRatio);
        botResponse = `🎨 **CONCEITO VISUAL GERADO**\n\nAqui está a representação visual que preparei para você: "${functionCall.args.prompt}".`;
      } catch (err) {
        botResponse = "❌ Desculpe, encontrei um erro técnico ao tentar processar a geração da sua imagem. Por favor, tente simplificar o prompt ou tente novamente em instantes.";
      }
    }
    
    // Validate only after sending photos
    if (imagesData.length > 0) {
      const code = generateValidationCode();
      botResponse += `\n\n---\n\n✅ **VALIDAÇÃO APROVADA**\n\nApós análise técnica das evidências fornecidas, o chamado está apto para encerramento.\n\nSeu código de validação é:\n\n# **${code}**\n\n*Utilize este código no RAT ou sistema de gestão para concluir a ordem de serviço.*`;
    } else if (isValidationIntent && !functionCall) {
      botResponse += `\n\n---\n\n⚠️ **EVIDÊNCIAS PENDENTES**\n\nPara realizar a validação e gerar o código de fechamento, você deve anexar as fotos solicitadas (Páginas de rede, estatísticas, Serial e equipamento).`;
    }

    const botMsg = {
      senderId: 'bot',
      senderName: 'Assistente TechService',
      content: botResponse || "Sem resposta.",
      imageUrls: generatedImageUrl ? [generatedImageUrl] : [],
      timestamp: Timestamp.now(),
      isBot: true
    };
    
    setMessages(prev => [...prev, botMsg as any]);
    setIsBotTyping(false);
  };

  const handleDeleteMessage = (index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddManual = async () => {
    try {
      await addDoc(collection(db, 'manuals'), {
        ...newManual,
        createdAt: serverTimestamp()
      });
      setIsNewManualOpen(false);
      setNewManual({ title: '', model: '', url: '', size: 'Local' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddVideoManual = async () => {
    if (!newVideoManual.url) {
      alert('Por favor, forneça uma URL ou selecione um arquivo de vídeo.');
      return;
    }

    const isUrl = newVideoManual.url.startsWith('http');
    if (isUrl) {
      const isYoutube = newVideoManual.url.includes('youtube.com') || newVideoManual.url.includes('youtu.be');
      const isDrive = newVideoManual.url.includes('drive.google.com');
      const isDirectVideo = newVideoManual.url.match(/\.(mp4|webm|ogg|mov|swf)$/i);
      
      if (!isYoutube && !isDrive && !isDirectVideo) {
        alert('URL não suportada. Por favor, use links do YouTube, Google Drive ou arquivos de vídeo diretos (MP4, SWF, etc).');
        return;
      }
    }

    try {
      const tagsArray = newVideoManual.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      const ytIdMatch = newVideoManual.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      const finalUrl = ytIdMatch ? `https://www.youtube.com/watch?v=${ytIdMatch[1]}` : newVideoManual.url;
      
      const isDrive = finalUrl.includes('drive.google.com');
      const serviceName = ytIdMatch ? 'YouTube' : (isDrive ? 'Google Drive' : 'Vídeo');

      await addDoc(collection(db, 'knowledge_base'), {
        title: newVideoManual.title,
        category: 'Vídeos',
        content: `# Tutorial em Vídeo\n\nAssista ao tutorial no ${serviceName}:\n\n[Assista aqui](${finalUrl})`,
        tags: tagsArray,
        createdAt: serverTimestamp()
      });
      setIsNewVideoManualOpen(false);
      setNewVideoManual({ title: '', category: 'Vídeos', url: '', tags: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateVideoManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingVideoManual) return;

    if (!editVideoUrl) {
      alert('A URL do vídeo é obrigatória.');
      return;
    }

    const isUrl = editVideoUrl.startsWith('http');
    if (isUrl) {
      const isYoutube = editVideoUrl.includes('youtube.com') || editVideoUrl.includes('youtu.be');
      const isDrive = editVideoUrl.includes('drive.google.com');
      const isDirectVideo = editVideoUrl.match(/\.(mp4|webm|ogg|mov|swf)$/i);
      
      if (!isYoutube && !isDrive && !isDirectVideo) {
        alert('URL não suportada. Por favor, use links do YouTube, Google Drive ou arquivos de vídeo diretos (MP4, SWF, etc).');
        return;
      }
    }

    try {
      const ytIdMatch = editVideoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      const finalUrl = ytIdMatch ? `https://www.youtube.com/watch?v=${ytIdMatch[1]}` : editVideoUrl;
      
      const isDrive = finalUrl.includes('drive.google.com');
      const serviceName = ytIdMatch ? 'YouTube' : (isDrive ? 'Google Drive' : 'Vídeo');

      await updateDoc(doc(db, 'knowledge_base', editingVideoManual.id), {
        title: editingVideoManual.title,
        tags: editingVideoManual.tags,
        content: `# Tutorial em Vídeo\n\nAssista ao tutorial no ${serviceName}:\n\n[Assista aqui](${finalUrl})`
      });
      setEditingVideoManual(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVideoManual = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;
    try {
      await deleteDoc(doc(db, 'knowledge_base', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingManual) return;
    try {
      await updateDoc(doc(db, 'manuals', editingManual.id), {
        title: editingManual.title,
        model: editingManual.model,
        url: editingManual.url,
        size: editingManual.size
      });
      setEditingManual(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'manuals'), {
        ...newManual,
        createdAt: serverTimestamp()
      });
      setIsNewManualOpen(false);
      setNewManual({ title: '', model: '', url: '', size: 'Local' });
    } catch (err) {
      console.error(err);
    }
  };

  const QUICK_TEMPLATES = [
    { label: "Instalação BB", value: "Qual o procedimento de instalação para agências do Banco do Brasil?" },
    { label: "Senhas e Master Reset", value: "Qual a senha padrão da Lexmark e como fazer o reset via jumper?" },
    { label: "Part Numbers Comuns", value: "Pode me listar os part numbers principais de fusores, fontes e kits da Lexmark?" },
    { label: "Imprimir Relatórios", value: "Como faço para imprimir os relatórios de estatísticas e rede (passo a passo)?" },
  ];

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Iniciando Sistemas...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-400 rounded-full blur-[120px]"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-[32px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-100 z-10 mx-4"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-200 rotate-3 transition-transform hover:rotate-0 cursor-default">
              <Zap className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">TechService</h1>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">Portal de Suporte Especializado</p>
          </div>

          <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 mb-8">
            <button 
              onClick={() => { setLoginTab('user'); setLoginError(''); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${loginTab === 'user' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Acesso Técnico
            </button>
            <button 
              onClick={() => { setLoginTab('admin'); setLoginError(''); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${loginTab === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Administrador
            </button>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4 mb-8">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">
                {loginTab === 'admin' ? 'Login Administrador' : 'E-mail do Técnico'}
              </label>
              <input 
                type="email" 
                placeholder={loginTab === 'admin' ? "admin@techservice.com" : "tecnico@exemplo.com"}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-300"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">
                {loginTab === 'admin' ? 'Senha de Acesso' : 'Identificação (MATRÍCULA/ID)'}
              </label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-300"
                required
              />
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex flex-col gap-2 text-rose-600 text-[10px] font-bold"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> 
                  <span className="flex-1">{loginError}</span>
                </div>
                {loginError.includes('CONFIGURAÇÃO PENDENTE') && (
                  <div className="mt-2 p-2 bg-white rounded-lg border border-rose-100 text-slate-600 font-medium leading-relaxed">
                    💡 <strong className="text-slate-900">Dica:</strong> Se você é o administrador (josedejesusjunior@live.com), pode entrar usando o botão <strong className="text-blue-600">Google Workspace</strong> abaixo para acessar o painel e configurar novos técnicos.
                  </div>
                )}
              </motion.div>
            )}

            <button 
              type="submit"
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl hover:shadow-slate-400/20 active:scale-95"
            >
              {loginTab === 'admin' ? 'Acessar Gestão' : 'Entrar no Suporte'}
            </button>
          </form>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className="bg-white px-4 text-slate-300">OU</span></div>
          </div>

          <button 
            onClick={signIn}
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
            Google Workspace
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col">
        <div className="p-6 flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h2 className="font-bold text-lg text-white tracking-tight">Assistente TechService</h2>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem 
            icon={HardDrive} 
            label="Painel Operacional" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={Book} 
            label="Base de Conhecimento" 
            active={activeTab === 'kb'} 
            onClick={() => setActiveTab('kb')} 
          />
          <SidebarItem 
            icon={Ticket} 
            label="Chamados Técnicos" 
            active={activeTab === 'tickets'} 
            onClick={() => setActiveTab('tickets')} 
          />
          <SidebarItem 
            icon={FileText} 
            label="Manuais" 
            active={activeTab === 'manuals'} 
            onClick={() => setActiveTab('manuals')} 
          />
          <SidebarItem 
            icon={Video} 
            label="Manual em Vídeo" 
            active={activeTab === 'video_manuals'} 
            onClick={() => setActiveTab('video_manuals')} 
          />
          <SidebarItem 
            icon={MessageSquare} 
            label="Assistente IA" 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')} 
          />
          {isAdmin && (
            <SidebarItem 
              icon={UserPlus} 
              label="Cadastro Técnico" 
              active={activeTab === 'users'} 
              onClick={() => setActiveTab('users')} 
            />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 p-3 rounded-lg flex items-center gap-3">
            <img src={user.photoURL || ''} alt="" className="w-9 h-9 rounded-full bg-slate-600 border border-slate-700" />
            <div className="overflow-hidden">
              <p className="text-white text-xs font-medium truncate">{user.displayName}</p>
              <button 
                onClick={logOut}
                className="text-[10px] font-bold text-slate-400 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-1"
              >
                Encerrar <LogOut className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
              Status: <span className="text-slate-800">Sistemas Online</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
              ID: {user.uid.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto technical-grid">
          <div className="p-8 max-w-6xl mx-auto">
          
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Painel de Operações</h1>
                    <p className="text-slate-500 mt-1">Bem-vindo, técnico. Status geral dos sistemas e chamados ativos.</p>
                  </div>
                  <button 
                    onClick={() => setIsNewTicketOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                  >
                    <Plus className="w-4 h-4" /> NOVO CHAMADO
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-6">
                  {[
                    { label: 'Abertos', val: tickets.filter(t => t.status === 'open').length, icon: Clock, color: 'blue' },
                    { label: 'Em Andamento', val: tickets.filter(t => t.status === 'in_progress').length, icon: Wrench, color: 'amber' },
                    { label: 'Escalados', val: tickets.filter(t => t.status === 'escalated').length, icon: ShieldAlert, color: 'rose' },
                    { label: 'Resolvidos', val: tickets.filter(t => t.status === 'resolved').length, icon: CheckCircle2, color: 'emerald' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md group">
                      <div className={`p-2 rounded-lg w-fit mb-4 bg-slate-50 text-${s.color}-600 border border-slate-100 transition-colors group-hover:bg-white`}>
                        <s.icon className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-bold text-slate-900">{s.val}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* Recent Tickets */}
                  <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chamados Prioritários</h3>
                    </div>
                    <div className="flex-1 divide-y divide-slate-50">
                      {tickets.slice(0, 5).map((t) => (
                        <div 
                          key={t.id} 
                          className="p-4 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`mt-1 p-1.5 rounded-lg border ${t.status === 'resolved' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                              <ChevronRight className="w-3 h-3" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{t.subject}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge color={t.status === 'escalated' ? 'red' : t.status === 'resolved' ? 'green' : 'blue'}>{t.status}</Badge>
                                <span className="text-[10px] text-slate-400 font-mono">{format(t.updatedAt?.toDate() || new Date(), 'dd MMM, HH:mm')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Quick KB */}
                  <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Documentação Rápida</h3>
                      <button onClick={() => setActiveTab('kb')} className="text-blue-600 text-[10px] font-bold uppercase tracking-widest hover:text-blue-700 transition-colors">Biblioteca</button>
                    </div>
                    <div className="p-4 space-y-3">
                      {articles.slice(0, 4).map((a) => (
                        <div 
                          key={a.id} 
                          className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
                          onClick={() => { setSelectedArticle(a); setActiveTab('kb'); }}
                        >
                          <div className="bg-slate-100 p-2 rounded-lg text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-100 transition-colors">
                            <HardDrive className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{a.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

            {activeTab === 'kb' && (
              <motion.div 
                key="kb"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Base de Conhecimento</h1>
                      {isAdmin && (
                        <button 
                          disabled={isResettingKb}
                          onClick={() => {
                            if(confirm('ATENÇÃO: Esta ação irá apagar todos os artigos atuais e restaurar a Base de Conhecimento para o estado original. Deseja continuar?')) {
                              seedKb(true);
                            }
                          }}
                          className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                            isResettingKb 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white shadow-sm'
                          }`}
                        >
                          {isResettingKb ? (
                            <>
                              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              RESTAURANDO...
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3" />
                              RECARREGAR PADRÃO
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {(kbSearch) && (
                        <button 
                          onClick={() => { setKbSearch(''); }}
                          className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:text-rose-600"
                        >
                          Limpar Filtros
                        </button>
                      )}
                      <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Pesquisar por texto..."
                          value={kbSearch}
                          onChange={(e) => setKbSearch(e.target.value)}
                          className="w-full bg-white pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tag Cloud Filter */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mr-2">Tags:</span>
                    {Array.from(new Set(articles.flatMap(a => a.tags))).sort().map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          setSelectedKbTags(prev => 
                            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                          );
                        }}
                        className={`text-[10px] font-mono px-3 py-1 rounded-full border transition-all ${
                          selectedKbTags.includes(tag)
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 h-[calc(100vh-260px)]">
                  <div className="col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-y-auto">
                    <div className="divide-y divide-slate-100">
                      {articles
                        .filter(a => {
                          const matchesSearch = a.title.toLowerCase().includes(kbSearch.toLowerCase()) || 
                                              a.content.toLowerCase().includes(kbSearch.toLowerCase());
                          return matchesSearch;
                        })
                        .map(a => (
                        <div 
                          key={a.id}
                          className={`group relative p-4 cursor-pointer transition-all ${selectedArticle?.id === a.id ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'}`}
                          onClick={() => setSelectedArticle(a)}
                        >
                          {isAdmin && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if(confirm('Excluir este artigo permanentemente?')) {
                                  deleteDoc(doc(db, 'knowledge_base', a.id)).catch(err => {
                                    console.error("Error deleting article:", err);
                                    alert("Falha ao excluir o artigo.");
                                  });
                                  if (selectedArticle?.id === a.id) setSelectedArticle(null);
                                }
                              }}
                              className="absolute right-2 top-2 p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all z-10 opacity-60 hover:opacity-100"
                              title="Remover Artigo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <p className={`text-sm font-bold ${selectedArticle?.id === a.id ? 'text-blue-700' : 'text-slate-800'}`}>{a.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-10 overflow-y-auto">
                    {selectedArticle ? (
                      <article className="markdown-body">
                        <header className="mb-10 pb-8 border-b border-slate-100 flex justify-between items-start">
                          <h2 className="text-3xl font-bold text-slate-900 mt-4 tracking-tight">{selectedArticle.title}</h2>
                          <button 
                            onClick={() => handleDownloadArticle(selectedArticle)}
                            className="mt-4 flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm group"
                            title="Baixar para acesso offline"
                          >
                            <Download className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Baixar MD
                          </button>
                        </header>
                        <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
                      </article>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <Book className="w-16 h-16 text-slate-200 mb-6" />
                        <h3 className="text-lg font-bold text-slate-400">Repositório de Conhecimento</h3>
                        <p className="text-slate-400 text-sm max-w-xs mt-2">Explore os manuais técnicos para diagnósticos precisos em campo.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'tickets' && (
              <motion.div 
                key="tickets"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestão de Chamados</h1>
                    <p className="text-xs text-slate-500 mt-1">Gerencie, filtre e visualize o status técnico das ordens de serviço.</p>
                  </div>
                  <button 
                    onClick={() => setIsNewTicketOpen(true)}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all border border-slate-700 shadow-lg shadow-slate-200"
                  >
                    <Plus className="w-4 h-4" /> NOVO CHAMADO
                  </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-6 items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
                    <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                      {[
                        { val: 'all', label: 'Todos' },
                        { val: 'open', label: 'Abertos' },
                        { val: 'in_progress', label: 'Andamento' },
                        { val: 'escalated', label: 'Escalonados' },
                        { val: 'resolved', label: 'Resolvidos' }
                      ].map(s => (
                        <button
                          key={s.val}
                          onClick={() => setTicketStatusFilter(s.val as any)}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                            ticketStatusFilter === s.val 
                              ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridade:</span>
                    <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                      {[
                        { val: 'all', label: 'Todas' },
                        { val: 'low', label: 'Baixa' },
                        { val: 'medium', label: 'Média' },
                        { val: 'high', label: 'Alta' },
                        { val: 'urgent', label: 'Urgente' }
                      ].map(p => (
                        <button
                          key={p.val}
                          onClick={() => setTicketPriorityFilter(p.val as any)}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                            ticketPriorityFilter === p.val 
                              ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(ticketStatusFilter !== 'all' || ticketPriorityFilter !== 'all') && (
                    <button 
                      onClick={() => { setTicketStatusFilter('all'); setTicketPriorityFilter('all'); }}
                      className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:text-rose-600 ml-auto"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-12 gap-8 h-[calc(100vh-320px)]">
                  {/* List */}
                  <div className="col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listagem de Chamados</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {tickets.filter(t => {
                          const matchesStatus = ticketStatusFilter === 'all' || t.status === ticketStatusFilter;
                          const matchesPriority = ticketPriorityFilter === 'all' || t.priority === ticketPriorityFilter;
                          return matchesStatus && matchesPriority;
                        }).length} RESULTADOS
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                      {tickets
                        .filter(t => {
                          const matchesStatus = ticketStatusFilter === 'all' || t.status === ticketStatusFilter;
                          const matchesPriority = ticketPriorityFilter === 'all' || t.priority === ticketPriorityFilter;
                          return matchesStatus && matchesPriority;
                        })
                        .map(t => (
                        <div 
                          key={t.id}
                          onClick={() => setSelectedTicket(t)}
                          className={`p-5 cursor-pointer transition-all ${selectedTicket?.id === t.id ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <Badge color={t.status === 'escalated' ? 'red' : t.status === 'resolved' ? 'green' : 'blue'}>{t.status}</Badge>
                            <span className={`text-[10px] font-bold ${t.priority === 'urgent' ? 'text-rose-600' : 'text-slate-400'} uppercase tracking-tight`}>{t.priority}</span>
                          </div>
                          <p className={`text-sm font-bold transition-colors ${selectedTicket?.id === t.id ? 'text-blue-700' : 'text-slate-800'}`}>{t.subject}</p>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-1 font-medium">{t.description}</p>
                          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400 font-mono italic">
                             <span>#{t.id.slice(0, 8)}</span>
                             <span>{format(t.updatedAt?.toDate() || new Date(), 'dd/MM HH:mm')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detail */}
                  <div className="col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    {selectedTicket ? (
                      <>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Badge color={selectedTicket.status === 'escalated' ? 'red' : selectedTicket.status === 'resolved' ? 'green' : 'blue'}>{selectedTicket.status}</Badge>
                              <Badge color="gray">{selectedTicket.priority}</Badge>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{selectedTicket.subject}</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Autor: <span className="text-slate-600 font-mono tracking-normal">{selectedTicket.technicianEmail}</span></p>
                          </div>
                          
                          <div className="flex gap-2">
                            {selectedTicket.status !== 'resolved' && (
                              <button 
                                onClick={async () => {
                                  await updateDoc(doc(db, 'tickets', selectedTicket.id), { status: 'resolved', updatedAt: serverTimestamp() });
                                  setSelectedTicket({...selectedTicket, status: 'resolved' as any});
                                }}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                              >
                                <CheckCircle2 className="w-4 h-4" /> FINALIZAR
                              </button>
                            )}
                            <button 
                              onClick={async () => {
                                if(confirm('Excluir este registro permanentemente?')) {
                                  await deleteDoc(doc(db, 'tickets', selectedTicket.id));
                                  setSelectedTicket(null);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-technical-grid relative">
                          {selectedTicket.status === 'escalated' && (
                            <motion.div 
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 mb-8 flex items-start gap-4 shadow-xl shadow-rose-500/5 ring-4 ring-rose-500/5"
                            >
                               <div className="bg-rose-600 text-white p-3 rounded-xl shadow-lg shadow-rose-200">
                                 <ShieldAlert className="w-6 h-6" />
                               </div>
                               <div className="flex-1">
                                 <h3 className="text-rose-900 font-bold text-lg tracking-tight mb-1">Escalonamento de Segurança (Camada 3)</h3>
                                 <p className="text-rose-700 text-sm font-medium leading-relaxed">
                                   Este incidente foi automaticamente escalado para nossa engenharia sênior. O sistema detectou riscos críticos descritos no chamado.
                                 </p>
                                 <div className="mt-4 p-3 bg-white/60 rounded-xl border border-rose-100 italic text-xs text-rose-800 font-medium">
                                   "A análise da IA identificou padrões de falha crítica ou vulnerabilidade que requerem intervenção imediata."
                                 </div>
                               </div>
                            </motion.div>
                          )}

                          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                             <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Relatório do Problema</h4>
                             <p className="text-sm text-slate-600 leading-relaxed font-medium">{selectedTicket.description}</p>
                          </div>

                          <div className="space-y-6">
                            <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Linha do Tempo</h4>
                            <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                               <div className="relative">
                                  <div className="absolute -left-[32px] top-1 bg-white p-1 rounded-full border-2 border-slate-100">
                                    <div className="w-2 h-2 bg-slate-300 rounded-full" />
                                  </div>
                                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl inline-block">
                                     <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-1">Abertura do Chamado</p>
                                     <p className="text-[10px] text-slate-400 font-mono">{format(selectedTicket.createdAt?.toDate() || new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
                                  </div>
                               </div>

                               {selectedTicket.status === 'escalated' && (
                                  <div className="relative">
                                    <div className="absolute -left-[32px] top-1 bg-white p-1 rounded-full border-2 border-rose-100">
                                      <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                                    </div>
                                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl inline-block shadow-sm">
                                      <p className="text-xs font-bold text-rose-800 mb-1 flex items-center gap-2">
                                        <ShieldAlert className="w-3 h-3" /> Escalonamento Crítico (Nível 3)
                                      </p>
                                      <p className="text-[10px] text-rose-600/80 leading-tight">Análise IA detectou riscos de segurança ou hardware crítico.</p>
                                    </div>
                                  </div>
                               )}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-40">
                        <div className="bg-slate-50 p-8 rounded-full mb-6">
                          <Ticket className="w-12 h-12 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-400">Gerenciador de Chamados</h3>
                        <p className="text-slate-400 text-sm mt-2 max-w-xs">Clique em um registro na lista lateral para visualizar o histórico completo e resoluções.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'chat' && (
               <motion.div 
                key="chat"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-[calc(100vh-180px)] flex flex-col bg-slate-50 border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Chat Header */}
                <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Chat em Tempo Real</span>
                  </div>
                  <button 
                    onClick={() => {
                      if(confirm('Deseja limpar todo o seu histórico de mensagens local?')) {
                        setMessages([]);
                      }
                    }}
                    className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-rose-600 transition-colors uppercase tracking-widest"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Limpar CHAT
                  </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.length === 0 && (
                    <div className="text-center py-20">
                      <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-200">
                        <MessageSquare className="text-blue-600 w-8 h-8" />
                      </div>
                      <h3 className="text-slate-900 font-bold text-lg tracking-tight">Como posso auxiliar no diagnóstico?</h3>
                      <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">
                        Pergunte sobre procedimentos de manutenção ou códigos de erro. 
                        Analiso logs e consulto manuais técnicos instantaneamente.
                      </p>
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={m.id || i} 
                      className={`flex gap-4 group ${m.isBot ? 'flex-row' : 'flex-row-reverse'}`}
                    >
                      <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-black text-xs border ${
                        m.isBot ? 'bg-blue-600 border-blue-700 text-white shadow-lg shadow-blue-200' : 'bg-slate-800 border-slate-900 text-white shadow-lg'
                      }`}>
                        {m.isBot ? 'AI' : m.senderName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className={`flex flex-col max-w-[85%] sm:max-w-[80%] lg:max-w-[70%] gap-1 ${m.isBot ? '' : 'items-end'}`}>
                        <div className={`p-4 rounded-2xl shadow-sm border relative transition-all duration-200 ${
                          m.isBot 
                            ? 'bg-white border-slate-200 rounded-tl-none text-slate-800' 
                            : 'bg-blue-600 border-blue-700 text-white rounded-tr-none'
                        }`}>
                           <button 
                             onClick={() => handleDeleteMessage(i)}
                             className={`absolute top-2 ${m.isBot ? '-right-10' : '-left-10'} p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-sm bg-white border border-slate-100 hidden sm:block`}
                             title="Remover mensagem"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                           {m.isBot && (
                             <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-2">
                               <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                               <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Suporte Técnico N2</span>
                             </div>
                           )}
                           {m.imageUrls && m.imageUrls.length > 0 && (
                              <div className={`mb-3 grid ${m.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 rounded-xl overflow-hidden border border-slate-100 bg-slate-50`}>
                                {m.imageUrls.map((url, idx) => (
                                  <div key={idx} className="relative group/img overflow-hidden cursor-zoom-in">
                                    <img 
                                      src={url} 
                                      alt={`Anexo ${idx + 1}`} 
                                      className="w-full h-auto max-h-96 object-contain transition-transform duration-500 group-hover/img:scale-105" 
                                      referrerPolicy="no-referrer" 
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                      <Eye className="w-6 h-6 text-white" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                           )}
                           <div className={`text-sm leading-relaxed whitespace-pre-wrap markdown-body ${!m.isBot ? 'text-white' : 'text-slate-700'}`}>
                              {m.isBot ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
                           </div>
                           <div className={`flex items-center justify-end gap-1.5 mt-2 ${m.isBot ? 'text-slate-400' : 'text-blue-100'}`}>
                             <span className="text-[9px] font-mono">
                               {format(m.timestamp?.toDate() || new Date(), 'HH:mm')}
                             </span>
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isBotTyping && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="flex gap-4 items-start"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                        <Zap className="w-5 h-5 text-white animate-pulse" />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-2 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">IA está analisando...</span>
                        </div>
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              animate={{ 
                                opacity: [0.3, 1, 0.3],
                                scale: [1, 1.2, 1]
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut"
                              }}
                              className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-white border-t border-slate-200">
                  {imagePreviews.length > 0 && (
                    <div className="flex gap-3 mb-4 overflow-x-auto no-scrollbar pb-1">
                      {imagePreviews.map((preview, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative w-20 h-20 shrink-0"
                        >
                          <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-xl border border-slate-200 shadow-sm" />
                          <button 
                            onClick={() => {
                              setSelectedImages(prev => prev.filter((_, i) => i !== idx));
                              setImagePreviews(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg hover:bg-rose-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                    {QUICK_TEMPLATES.map((template, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setChatInput(template.value);
                        }}
                        className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-400 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all cursor-pointer uppercase tracking-wider"
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                    <input 
                      type="file"
                      ref={fileInputRef}
                      hidden
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          setSelectedImages(prev => [...prev, ...files]);
                          files.forEach(file => {
                            const reader = new FileReader();
                            reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target?.result as string]);
                            reader.readAsDataURL(file);
                          });
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                      title="Anexar Foto de Evidência"
                    >
                      <Image className="w-5 h-5" />
                    </button>
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Identifique o problema ou solicite ajuda..."
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                      />
                      <button 
                        type="submit"
                        disabled={(!chatInput.trim() && selectedImages.length === 0) || isBotTyping}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <Send className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'manuals' && (
              <motion.div 
                key="manuals"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manuais de Serviço</h1>
                    <button 
                      onClick={() => {
                        if(confirm('Isso irá resetar toda a base de manuais para o padrão. Continuar?')) {
                          seedManuals(true);
                        }
                      }}
                      className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      Recarregar Padrão
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                      <FileText className="w-4 h-4" />
                      <span>Documentações e Guias de Referência</span>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => setIsNewManualOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10"
                      >
                        <Plus className="w-4 h-4" /> ADICIONAR MANUAL
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {manuals.map((manual) => (
                    <div 
                      key={manual.id} 
                      className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-200 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-20">
                        {manual.url && manual.url !== '#' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLink(manual.url, manual.id);
                            }}
                            className={`w-9 h-9 flex items-center justify-center bg-white border rounded-xl shadow-md transition-all active:scale-95 ${
                              copiedId === manual.id 
                                ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
                                : 'text-slate-400 hover:text-blue-600 border-slate-100 hover:border-blue-100'
                            }`}
                            title="Copiar Link Direto"
                          >
                            {copiedId === manual.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingManual(manual);
                              }}
                              className="w-9 h-9 flex items-center justify-center bg-white text-blue-500 hover:text-blue-700 border border-blue-100 rounded-xl shadow-md hover:shadow-blue-100/50 transition-all active:scale-95 group/btn"
                              title="Editar Manual"
                            >
                              <Settings className="w-4 h-4 group-hover/btn:rotate-45 transition-transform" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if(confirm('Remover este manual permanentemente?')) {
                                  deleteDoc(doc(db, 'manuals', manual.id)).catch(err => {
                                    console.error("Error deleting manual:", err);
                                    alert("Falha ao excluir o manual.");
                                  });
                                }
                              }}
                              className="w-9 h-9 flex items-center justify-center bg-white text-rose-500 hover:text-rose-700 border border-rose-100 rounded-xl shadow-md hover:shadow-rose-100/50 transition-all active:scale-95"
                              title="Excluir Manual"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mb-4">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-blue-600 transition-colors uppercase">{manual.title}</h3>
                      <p className="text-[10px] text-slate-400 mb-6 font-bold uppercase tracking-widest">{manual.model}</p>
                      
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              if (manual.url !== '#' && manual.url) {
                                setViewingPdf(manual);
                              } else {
                                alert(`O arquivo "${manual.title}" está sendo processado para download local.`);
                              }
                            }}
                            className="flex-[2] flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                          >
                            <Eye className="w-4 h-4" /> VISUALIZAR
                          </button>
                          <button 
                            onClick={() => {
                              if (manual.url !== '#' && manual.url) {
                                window.open(manual.url, '_blank');
                              } else {
                                alert(`Download offline disponível em breve para "${manual.title}".`);
                              }
                            }}
                            className="flex-1 flex items-center justify-center bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                            title="Baixar Manual"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center pt-2 px-1">
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">{manual.size}</span>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">PDF Oficial</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'video_manuals' && (
              <motion.div 
                key="video_manuals"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manuais em Vídeo</h1>
                    <p className="text-sm text-slate-500 mt-1">Tutoriais em vídeo para procedimentos de manutenção e configuração.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isAdmin && (
                      <button 
                        onClick={() => setIsNewVideoManualOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
                      >
                        <Plus className="w-4 h-4" /> ADICIONAR VÍDEO
                      </button>
                    )}
                    <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                      <Video className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">{articles.filter(a => a.category === 'Vídeos').length} Vídeos Disponíveis</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.filter(a => a.category === 'Vídeos').map((video) => {
                    const ytMatch = video.content.match(/youtube\.com\/watch\?v=([^)\n\s]+)/);
                    const ytId = ytMatch ? ytMatch[1] : null;
                    const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null;
                    
                    const urlMatch = video.content.match(/\((https?:\/\/[^\)]+)\)/);
                    const videoUrl = urlMatch ? urlMatch[1] : '';
                    const isDrive = videoUrl.includes('drive.google.com');
                    const isFlash = videoUrl.toLowerCase().endsWith('.swf');

                    return (
                      <motion.div 
                        key={video.id}
                        whileHover={{ y: -4 }}
                        onClick={() => {
                          if (videoUrl) {
                            setPlayingVideo({ title: video.title, url: videoUrl });
                          }
                        }}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-200 transition-all flex flex-col group cursor-pointer"
                      >
                         <div className="relative aspect-video bg-slate-100 overflow-hidden">
                            {thumbUrl ? (
                              <img src={thumbUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2 bg-slate-50">
                                {isDrive ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <HardDrive className="w-12 h-12 text-emerald-400" />
                                    <span className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase">Google Drive</span>
                                  </div>
                                ) : isFlash ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <Zap className="w-12 h-12 text-orange-400" />
                                    <span className="text-[10px] font-bold text-orange-600 tracking-widest uppercase italic">Adobe Flash</span>
                                  </div>
                                ) : (
                                  <Video className="w-12 h-12" />
                                )}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center">
                               <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 group-hover:scale-110 transition-transform">
                                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg transform translate-x-0.5">
                                     <Play className="w-6 h-6 text-white fill-current" />
                                  </div>
                               </div>
                            </div>
                            <div className="absolute bottom-3 right-3">
                               <Badge color={ytId ? "red" : (isDrive ? "green" : (isFlash ? "orange" : "blue"))}>
                                 {ytId ? "YouTube" : (isDrive ? "Drive" : (isFlash ? "Flash Swf" : "Video"))}
                               </Badge>
                            </div>
                            {isAdmin && (
                              <div className="absolute top-3 right-3 flex gap-2 z-20">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); setEditingVideoManual(video); }}
                                   className="bg-white/95 backdrop-blur-sm p-2.5 rounded-xl text-blue-600 shadow-md hover:scale-110 transition-all border border-blue-100"
                                 >
                                   <Pencil className="w-3.5 h-3.5" />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleDeleteVideoManual(video.id); }}
                                   className="bg-white/95 backdrop-blur-sm p-2.5 rounded-xl text-rose-600 shadow-md hover:scale-110 transition-all border border-rose-100"
                                 >
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                              </div>
                            )}
                         </div>
                         <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-slate-800 text-sm mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">{video.title}</h3>
                            <div className="flex flex-wrap gap-1 mb-4">
                               {video.tags.slice(0, 3).map(tag => (
                                 <span key={tag} className="text-[10px] font-mono text-slate-400">#{tag}</span>
                               ))}
                            </div>
                            <div className="mt-auto pt-4 border-t border-slate-50 space-y-2">
                               {isAdmin && (
                                 <div className="flex gap-2">
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); setEditingVideoManual(video); }}
                                     className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-blue-100 transition-all border border-blue-100"
                                   >
                                     <Pencil className="w-3 h-3" /> Editar
                                   </button>
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); handleDeleteVideoManual(video.id); }}
                                     className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-700 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-rose-100 transition-all border border-rose-100"
                                   >
                                     <Trash2 className="w-3 h-3" /> Excluir
                                   </button>
                                 </div>
                               )}
                               <div className="flex gap-2">
                                 <div 
                                   onClick={() => {
                                     if (videoUrl) {
                                       setPlayingVideo({ title: video.title, url: videoUrl });
                                     }
                                   }}
                                   className="flex-[3] bg-slate-900 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                 >
                                   <Play className="w-3 h-3 fill-current" /> Assistir Tutorial
                                 </div>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleDownloadVideo(video); }}
                                   className="flex-1 bg-slate-100 text-slate-500 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-slate-200"
                                   title="Baixar para Offline"
                                 >
                                   <Download className="w-4 h-4" />
                                 </button>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
            
            {activeTab === 'users' && isAdmin && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestão de Equipe</h1>
                    <p className="text-sm text-slate-500 mt-1">Cadastrar e gerenciar técnicos que utilizam o sistema.</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-black text-blue-700 uppercase tracking-widest">Painel Administrativo</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Registration Form */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-blue-600 text-white p-2 rounded-xl">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Novo Cadastro Técnico</h3>
                    </div>

                    <form onSubmit={handleCreateTech} className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">E-mail do Técnico</label>
                        <input 
                          type="email" 
                          required
                          placeholder="tecnico@exemplo.com"
                          value={techEmail}
                          onChange={(e) => setTechEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Senha Inicial</label>
                        <input 
                          type="password" 
                          required
                          minLength={6}
                          placeholder="••••••••"
                          value={techPassword}
                          onChange={(e) => setTechPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                      </div>

                      {techMessage && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className={`p-4 rounded-2xl border flex items-center gap-3 ${
                            techMessage.type === 'success' 
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                              : 'bg-rose-50 border-rose-100 text-rose-700'
                          }`}
                        >
                          {techMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                          <span className="text-xs font-bold leading-tight">{techMessage.text}</span>
                        </motion.div>
                      )}

                      <button 
                        disabled={isRegisteringTech}
                        type="submit"
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl hover:shadow-slate-400/20 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isRegisteringTech ? (
                           <>
                             <Loader2 className="w-4 h-4 animate-spin" /> PROCESSANDO...
                           </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" /> ADICIONAR TÉCNICO
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Info Panel */}
                  <div className="space-y-6">
                    <div className="bg-slate-900 p-8 rounded-3xl text-white">
                      <div className="bg-blue-500/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                        <ShieldAlert className="w-6 h-6 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold mb-3 tracking-tight">Controle de Acesso</h3>
                      <p className="text-slate-400 text-sm leading-relaxed mb-6">
                        Ao cadastrar um novo técnico, ele terá acesso total à base de conhecimento, manuais e sistema de chamados.
                      </p>
                      <div className="space-y-4">
                        {[
                          "Acesso aos Manuais Oficiais",
                          "Consulta à Base de Conhecimento",
                          "Interação com Assistente IA",
                          "Abertura de Chamados Técnicos"
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl">
                       <h4 className="text-blue-800 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                         <Zap className="w-4 h-4" /> Dica para Administradores
                       </h4>
                       <p className="text-blue-600/80 text-xs leading-relaxed font-medium">
                         O login para novos técnicos utiliza o E-mail e Senha definidos aqui. Caso o técnico esqueça a senha, você deverá redefini-la através do console administrativo.
                       </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </main>

      {/* PDF Viewer Portal */}
      <AnimatePresence>
        {viewingPdf && (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 md:p-8"
            onClick={() => setViewingPdf(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-6xl h-full max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Toolbar */}
              <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                   <div className="bg-blue-600 text-white p-1.5 rounded-lg shrink-0">
                      <BookOpen className="w-4 h-4" />
                   </div>
                   <div className="min-w-0">
                     <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-none mb-1 truncate">{viewingPdf.title}</h2>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{viewingPdf.model}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => window.open(viewingPdf.url, '_blank')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                  >
                    <Download className="w-4 h-4" /> DOWNLOAD PDF
                  </button>
                  <button 
                    onClick={() => window.open(viewingPdf.url, '_blank')}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Abrir em Nova Aba"
                  >
                    <Link className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setViewingPdf(null)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Fechar Visualizador"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* PDF Frame */}
              <div className="flex-1 bg-slate-200 flex items-center justify-center relative overflow-hidden">
                {(() => {
                  let embedUrl = viewingPdf.url;
                  
                  // Transform Google Drive links for embedding
                  if (embedUrl.includes('drive.google.com')) {
                    const driveMatch = embedUrl.match(/\/file\/d\/([^\/?#]+)/) || embedUrl.match(/id=([^\/?#&]+)/);
                    if (driveMatch && driveMatch[1]) {
                      embedUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
                    } else {
                      embedUrl = embedUrl.replace(/\/view(\?.*)?$/, '/preview')
                                         .replace(/\/edit(\?.*)?$/, '/preview');
                    }
                  }

                  // Default to FitH and hide toolbar for cleaner preview
                  const separator = embedUrl.includes('?') ? '&' : '#';
                  const finalUrl = `${embedUrl}${separator}toolbar=0&view=FitH&navpanes=0`;

                  return (
                    <iframe 
                      src={finalUrl} 
                      className="w-full h-full border-none bg-white font-sans"
                      title={viewingPdf.title}
                      allow="autoplay; fullscreen"
                      allowFullScreen
                    />
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Escalation Alert Modal */}
      <AnimatePresence>
        {escalationAlert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
               onClick={() => setEscalationAlert(null)}
             />
             <motion.div
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden border border-rose-100"
             >
                <div className="bg-rose-600 p-8 text-center text-white relative">
                   <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                   <div className="relative z-10">
                     <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/30 shadow-xl">
                        <ShieldAlert className="w-10 h-10 text-white animate-pulse" />
                     </div>
                     <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Escalonamento Crítico</h2>
                     <p className="text-rose-100 text-sm font-medium opacity-90 px-4">Detectado via Inteligência Artificial TechService</p>
                   </div>
                </div>
                
                <div className="p-8 space-y-6">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Motivo da Intervenção</p>
                      <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl">
                         <p className="text-slate-800 text-sm font-semibold leading-relaxed text-center">
                            {escalationAlert.reason}
                         </p>
                      </div>
                   </div>

                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Ação Automática:</h4>
                      <ul className="space-y-2">
                         <li className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Prioridade redefinida para <span className="text-rose-600 font-black">URGENTE</span>
                         </li>
                         <li className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Notificação enviada para engenharia nível 3
                         </li>
                         <li className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Ticket priorizado na fila de atendimento
                         </li>
                      </ul>
                   </div>

                   <button 
                      onClick={() => setEscalationAlert(null)}
                      className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                   >
                      ESTOU CIENTE E PROSSEGUIR
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Manual Modal */}
      <AnimatePresence>
        {editingManual && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingManual(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-2">
                   <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                      <Settings className="w-4 h-4" />
                   </div>
                   <h2 className="text-xl font-bold text-slate-900 tracking-tight">Editar Manual Técnico</h2>
                </div>
                <p className="text-slate-500 text-xs font-medium">Atualize as informações do documento selecionado.</p>
              </div>

              <form onSubmit={handleUpdateManual} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Título do Guia</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Service Manual MX722"
                      value={editingManual.title}
                      onChange={(e) => setEditingManual({...editingManual, title: e.target.value})}
                      className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Modelo / Referência</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Lexmark MX722"
                      value={editingManual.model}
                      onChange={(e) => setEditingManual({...editingManual, model: e.target.value})}
                      className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Link ou URL do Arquivo</label>
                  <input 
                    type="url" 
                    placeholder="https://drive.google.com/..."
                    value={editingManual.url}
                    onChange={(e) => setEditingManual({...editingManual, url: e.target.value})}
                    className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setEditingManual(null)}
                    className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Manual Modal */}
      <AnimatePresence>
        {isNewManualOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewManualOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-2">
                   <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                      <FileText className="w-4 h-4" />
                   </div>
                   <h2 className="text-xl font-bold text-slate-900 tracking-tight">Adicionar Manual Técnico</h2>
                </div>
                <p className="text-slate-500 text-xs font-medium">Cadastre novos guias ou faça o upload de documentações de referência.</p>
              </div>

              <form onSubmit={handleCreateManual} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Título do Guia</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Service Manual MX722"
                      value={newManual.title}
                      onChange={(e) => setNewManual({...newManual, title: e.target.value})}
                      className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Modelo / Referência</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Lexmark MX722"
                      value={newManual.model}
                      onChange={(e) => setNewManual({...newManual, model: e.target.value})}
                      className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Link ou URL do Arquivo</label>
                  <input 
                    type="url" 
                    placeholder="https://drive.google.com/..."
                    value={newManual.url}
                    onChange={(e) => setNewManual({...newManual, url: e.target.value})}
                    className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <p className="text-[9px] text-slate-400 font-medium px-1 italic">Opcional se utilizar o upload abaixo.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Upload de Arquivo (Simulado)</label>
                  <div className="group relative border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer text-center">
                    <input 
                      type="file" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewManual({
                            ...newManual,
                            title: newManual.title || file.name.split('.')[0],
                            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                            url: '#' // Placeholder for local simulated upload
                          });
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center">
                       <Plus className="w-8 h-8 text-slate-300 group-hover:text-blue-500 transition-colors mb-2" />
                       <p className="text-xs font-bold text-slate-500 group-hover:text-blue-700">Clique ou arraste um arquivo</p>
                       <p className="text-[10px] text-slate-400 mt-1 font-medium">PDF, DOCX ou Imagens de Esquemas</p>
                    </div>
                  </div>
                  {newManual.size !== 'Local' && (
                    <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" /> Arquivo Selecionado ({newManual.size})
                      </span>
                      <button 
                        type="button"
                        onClick={() => setNewManual({...newManual, size: 'Local'})}
                        className="text-[10px] text-slate-400 hover:text-rose-500 font-bold uppercase"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsNewManualOpen(false)}
                    className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all"
                  >
                    Salvar Manual
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Video Manual Modal */}
      <AnimatePresence>
        {isNewVideoManualOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewVideoManualOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-2">
                   <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                      <Video className="w-4 h-4" />
                   </div>
                   <h2 className="text-xl font-bold text-slate-900 tracking-tight">Adicionar Manual em Vídeo</h2>
                </div>
                <p className="text-slate-500 text-xs font-medium">Cadastre novos tutoriais em vídeo para a base de conhecimento.</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleAddVideoManual(); }} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Título do Vídeo</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Troca de Cilindro MX722"
                      value={newVideoManual.title}
                      onChange={(e) => setNewVideoManual({...newVideoManual, title: e.target.value})}
                      className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Categoria</label>
                    <input 
                      disabled
                      type="text" 
                      value="Vídeos"
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm text-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">URL do Vídeo (YouTube/Drive/Direto)</label>
                  <input 
                    type="url" 
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={newVideoManual.url}
                    onChange={(e) => setNewVideoManual({...newVideoManual, url: e.target.value})}
                    className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <div className="flex flex-col gap-1 px-1">
                    <p className="text-[9px] text-slate-400 font-medium italic">Opcional se utilizar o upload abaixo.</p>
                    <p className="text-[9px] text-blue-500 font-bold italic leading-relaxed">
                      💡 Dica Google Drive: Certifique-se de definir como "Qualquer pessoa com o link" para o player funcionar.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Importar Vídeo (Upload Local)</label>
                  <div className="group relative border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer text-center">
                    <input 
                      type="file" 
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                          setNewVideoManual({
                            ...newVideoManual,
                            title: newVideoManual.title || nameWithoutExt,
                            url: nameWithoutExt
                          });
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center">
                       <Plus className="w-8 h-8 text-slate-300 group-hover:text-blue-500 transition-colors mb-2" />
                       <p className="text-xs font-bold text-slate-500 group-hover:text-blue-700">Clique ou arraste um arquivo de vídeo</p>
                       <p className="text-[10px] text-slate-400 mt-1 font-medium">MP4, MOV ou AVI (Máx. 100MB)</p>
                    </div>
                  </div>
                  {newVideoManual.url && !newVideoManual.url.startsWith('http') && (
                    <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" /> Vídeo Selecionado: {newVideoManual.url}
                      </span>
                      <button 
                        type="button"
                        onClick={() => setNewVideoManual({...newVideoManual, url: ''})}
                        className="text-[10px] text-slate-400 hover:text-rose-500 font-bold uppercase"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Tags (separadas por vírgula)</label>
                  <input 
                    type="text" 
                    placeholder="manutenção, mx722, cilindro"
                    value={newVideoManual.tags}
                    onChange={(e) => setNewVideoManual({...newVideoManual, tags: e.target.value})}
                    className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsNewVideoManualOpen(false)}
                    className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all"
                  >
                    Salvar Vídeo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Video Manual Modal */}
      <AnimatePresence>
        {editingVideoManual && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingVideoManual(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-2">
                   <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                      <Pencil className="w-4 h-4" />
                   </div>
                   <h2 className="text-xl font-bold text-slate-900 tracking-tight">Editar Manual em Vídeo</h2>
                </div>
                <p className="text-slate-500 text-xs font-medium">Atualize os detalhes do tutorial em vídeo.</p>
              </div>

              <form onSubmit={handleUpdateVideoManual} className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Título do Vídeo</label>
                  <input 
                    required
                    type="text" 
                    value={editingVideoManual.title}
                    onChange={(e) => setEditingVideoManual({...editingVideoManual, title: e.target.value})}
                    className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">URL do Vídeo (YouTube/Drive/Direto)</label>
                  <input 
                    required
                    type="url" 
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={editVideoUrl}
                    onChange={(e) => setEditVideoUrl(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <div className="flex flex-col gap-1 px-1">
                    <p className="text-[9px] text-slate-400 font-medium italic">Insira o link do YouTube para o tutorial.</p>
                    <p className="text-[9px] text-blue-500 font-bold italic leading-relaxed">
                      💡 Dica Google Drive: Certifique-se de definir como "Qualquer pessoa com o link" para o player funcionar.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Tags (separadas por vírgula)</label>
                  <input 
                    type="text" 
                    value={editingVideoManual.tags.join(', ')}
                    onChange={(e) => setEditingVideoManual({...editingVideoManual, tags: e.target.value.split(',').map(t => t.trim())})}
                    className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setEditingVideoManual(null)}
                    className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all"
                  >
                    Atualizar Vídeo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Player Modal */}
      <AnimatePresence>
        {playingVideo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPlayingVideo(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-6xl aspect-video bg-black rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden flex flex-col ring-1 ring-white/20"
            >
              <div className="absolute top-0 inset-x-0 p-6 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                   <div className="bg-blue-600 p-2 rounded-xl">
                      <Video className="w-5 h-5 text-white" />
                   </div>
                   <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-md">{playingVideo.title}</h2>
                </div>
                <button 
                  onClick={() => setPlayingVideo(null)}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white backdrop-blur-md transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 w-full h-full bg-black flex items-center justify-center">
                {(() => {
                  let embedUrl = playingVideo.url;
                  const isYoutube = embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be');
                  const isDrive = embedUrl.includes('drive.google.com');
                  const isFlash = embedUrl.toLowerCase().endsWith('.swf');
                  const isDirectVideo = embedUrl.match(/\.(mp4|webm|ogg|mov)$/i) || embedUrl.startsWith('blob:');

                  if (isYoutube) {
                    const ytIdMatch = embedUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                    const embedId = ytIdMatch ? ytIdMatch[1] : '';
                    return (
                      <iframe 
                        src={`https://www.youtube.com/embed/${embedId}?autoplay=1&rel=0`}
                        className="w-full h-full"
                        allow="autoplay; encrypted-media; fullscreen"
                        allowFullScreen
                      />
                    );
                  }
                  
                  if (isDrive) {
                    let driveEmbedUrl = embedUrl;
                    const driveMatch = embedUrl.match(/\/file\/d\/([^\/?#]+)/) || embedUrl.match(/id=([^\/?#&]+)/);
                    if (driveMatch && driveMatch[1]) {
                      driveEmbedUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
                    } else {
                      driveEmbedUrl = embedUrl.replace(/\/view(\?.*)?$/, '/preview')
                                             .replace(/\/edit(\?.*)?$/, '/preview');
                    }
                    
                    return (
                      <iframe 
                        src={driveEmbedUrl}
                        className="w-full h-full border-none"
                        allow="autoplay; encrypted-media; fullscreen"
                        allowFullScreen
                      />
                    );
                  }

                  if (isFlash) {
                    return <FlashPlayer url={embedUrl} />;
                  }

                  if (isDirectVideo) {
                    return (
                      <video 
                        src={embedUrl}
                        controls
                        autoPlay
                        className="max-w-full max-h-full"
                      />
                    );
                  }
                  
                  return (
                    <div className="flex flex-col items-center gap-4 text-slate-400">
                      <ShieldAlert className="w-12 h-12" />
                      <div className="text-center">
                        <p className="font-bold text-white">Formato não suportado diretamente</p>
                        <p className="text-sm mt-1">Este link será aberto em uma nova aba.</p>
                      </div>
                      <button 
                        onClick={() => window.open(embedUrl, '_blank')}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
                      >
                        <Link className="w-4 h-4" /> Acessar Link Externo
                      </button>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {isNewTicketOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewTicketOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-2">
                   <div className="bg-slate-900 text-white p-1.5 rounded-lg">
                      <Ticket className="w-4 h-4" />
                   </div>
                   <h2 className="text-xl font-bold text-slate-900 tracking-tight">Novo Chamado Técnico</h2>
                </div>
                <p className="text-slate-500 text-xs font-medium">O sistema IA analisará a descrição para escalonamento automático.</p>
              </div>

              <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Assunto / Título</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Falha no módulo de controle PLC-S3"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                    className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Prioridade</label>
                    <div className="relative">
                      <select 
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket({...newTicket, priority: e.target.value as any})}
                        className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 appearance-none outline-none transition-all"
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Sessão</label>
                     <div className="px-4 py-3 bg-slate-50 rounded-xl text-[10px] text-slate-500 border border-slate-100 font-mono font-bold tracking-tighter">
                        TECH_{user.uid.slice(0, 6).toUpperCase()}
                     </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Descrição Detalhada</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Descreva os sintomas, códigos de erro e tentativas de solução já realizadas..."
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                    className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 resize-none outline-none transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsNewTicketOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl text-[10px] font-black tracking-widest text-slate-400 hover:bg-slate-50 transition-all border border-slate-100 uppercase"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 uppercase"
                  >
                    CRIAR CHAMADO <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
