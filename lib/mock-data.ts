import { Entry, NewClientProjectInput, NewSnippetInput, NewTaskInput } from './types';

const now = new Date();
const iso = (d: Date) => d.toISOString();
const day = (offset: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return iso(d);
};

export const initialTasks: NewTaskInput[] = [
  {
    title: 'Atualizar banner promocional do evento e checar links de ingressos',
    client: 'XK Eventos',
    status: 'in_progress',
    priority: 'alta',
    type: 'manutencao',
    dueDate: day(3).slice(0, 10),
    description: 'Trocar o banner da hero section com a nova arte do próximo festival e testar fluxo do WhatsApp.',
    hoursEstimate: 1.5,
  },
  {
    title: 'Configurar botão flutuante de agendamento de orçamento',
    client: 'Said Climatização',
    status: 'todo',
    priority: 'media',
    type: 'ajuste',
    dueDate: day(6).slice(0, 10),
    description: 'Inserir componente de WhatsApp com mensagem personalizada para solicitação de visita técnica.',
    hoursEstimate: 1,
  },
  {
    title: 'Checar métricas de conversão e formulário de contato',
    client: 'Odonto Braga',
    status: 'done',
    priority: 'baixa',
    type: 'manutencao',
    dueDate: day(-2).slice(0, 10),
    description: 'Verificação mensal de performance da landing page na Vercel e envio de leads.',
    hoursEstimate: 0.5,
  },
];

export const initialPortfolioProjects: NewClientProjectInput[] = [
  {
    name: 'Said Climatização',
    category: 'portfolio',
    siteUrl: 'https://www.saidclima.com.br/',
    githubUrl: 'https://github.com/EduBraga7/said-clima',
    notes: 'Landing page institucional profissional desenvolvida para empresa de climatização, manutenção e instalação de ar condicionado.',
    techStack: ['React', 'Next.js', 'Tailwind CSS', 'TypeScript'],
  },
  {
    name: 'Odonto Braga',
    category: 'portfolio',
    siteUrl: 'https://odonto-braga.vercel.app/',
    githubUrl: 'https://github.com/EduBraga7/odonto-braga-landingpage',
    notes: 'Landing page odontológica de alta conversão publicada na Vercel com foco em apresentação de serviços e agendamentos.',
    techStack: ['React', 'Next.js', 'Tailwind CSS', 'Vercel'],
  },
  {
    name: 'XK Eventos',
    category: 'comercial',
    siteUrl: 'https://xkeventos.com.br/',
    githubUrl: 'https://github.com/EduBraga7/xk-eventos',
    notes: 'Contrato mensal de manutenção, hospedagem e suporte do site fechado em 1 ano (R$ 70,00/mês).',
    techStack: ['React', 'Next.js', 'Tailwind CSS', 'TypeScript'],
  },
];

export const initialSnippets: NewSnippetInput[] = [
  {
    title: 'Campanha Publicitária de Alta Conversão',
    category: 'prompt_ia',
    targetTool: 'ChatGPT',
    description: 'Transforma qualquer foto em uma campanha publicitária premium com visual de agência para Instagram, Shopee ou página de vendas.',
    content: `Transforme esta foto em uma campanha publicitária premium de alta conversão. Analise automaticamente o produto e crie um anúncio profissional para o público ideal. Remova o fundo original e crie um cenário sofisticado relacionado ao produto, com iluminação profissional, sombras suaves, reflexos realistas e acabamento de marca premium. Adicione: Título forte e chamativo Subtítulo persuasivo Benefícios curtos e impactantes Selos visuais de qualidade ou promoção quando fizer sentido CTA elegante para incentivar a compra Adapte automaticamente as cores, elementos visuais e comunicação ao nicho do produto. Faça a arte parecer um anúncio criado por uma agência de alto nível para Instagram, Shopee, Mercado Livre ou página de vendas. O produto deve ser o protagonista absoluto da imagem. Objetivo: aumentar a percepção de valor, o desejo de compra e a conversão do produto.`,
    tags: ['Ads', 'Campanha', 'E-commerce', 'Instagram', 'Logos'],
    linkUrl: 'https://chatgpt.com/',
    language: 'markdown',
  },
  {
    title: 'Animar LOGO (Motion Graphics 6s Reveal)',
    category: 'prompt_ia',
    targetTool: 'Google Labs',
    description: 'Prompt para gerar animação 3D de 6 segundos com efeito pop-out, iluminação realista e reveal cinematográfico a partir do logo.',
    content: `A modern and energetic brand reveal using the attached logo as the exact reference. Analyze the logo and identify its visual elements, symbols, shapes, or concepts. Create a premium animated background inspired by those elements, using subtle, oversized, low-opacity design details that reinforce the brand identity without distracting from the main logo.
Maintain the original design, colors, proportions, and placement of the logo exactly as provided. The entire animation should last exactly 6 seconds, with the logo progressively assembling using a dynamic "pop-out" effect. Each letter or logo element should appear one by one with a slight elastic bounce and a soft localized glow that pulses as it lands.
The background should reinterpret elements found within the logo itself. Use enlarged, blurred, or partially visible versions of shapes, icons, or abstract forms from the logo, integrating them subtly into the composition. These elements should move gently, remain low contrast, and never compete with or overlap the primary logo.
As the logo is fully assembled, a soft ambient glow should radiate from behind it, creating a refined halo effect. Let the completed logo hold on screen for the final moment with only subtle glow breathing and minimal background motion.
Do not include any background music. Use only premium sound effects synchronized with the animation, such as soft pops, gentle whooshes, light impacts, glow pulses, and elegant UI-style audio accents.

High-end motion graphics, realistic light bloom, smooth easing, professional quality, ultra-sharp 4K, vertical video (9:16)`,
    tags: ['Motion', 'Logo', 'Animação', 'Vídeo', '3D'],
    linkUrl: 'https://labs.google/',
    language: 'markdown',
  },
  {
    title: 'Botões Flutuantes (WhatsApp Pulsante + Scroll to Top)',
    category: 'componente_ui',
    description: 'Componente React completo com animação de ping no WhatsApp e botão de voltar ao topo suave com Framer Motion.',
    content: `"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function FloatingButtons() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* WhatsApp - bottom right */}
      <a
        href="https://wa.me/5512991450777"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 hover:scale-110 hover:shadow-xl hover:shadow-[#25D366]/50 transition-all duration-200"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
        <WhatsAppIcon className="h-7 w-7 relative" />
      </a>

      {/* Scroll to top - bottom left */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={scrollToTop}
            aria-label="Voltar ao topo"
            className="fixed bottom-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:scale-110 hover:shadow-xl hover:shadow-primary/50 transition-all duration-200"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}`,
    tags: ['React', 'Framer Motion', 'Tailwind', 'WhatsApp', 'Componente'],
    language: 'tsx',
  },
];

export const mockEntries: Entry[] = [
  {
    id: 'e-1',
    description: 'Manutenção Mensal Site Barbearia',
    client: 'Barbearia Navalha',
    value: 70,
    type: 'recorrente',
    status: 'recebido',
    date: day(-3),
    createdAt: day(-3),
  },
  {
    id: 'e-2',
    description: 'Landing Page Ciclano',
    client: 'Ciclano Dev',
    value: 600,
    type: 'avulso',
    status: 'recebido',
    date: day(-12),
    createdAt: day(-12),
  },
  {
    id: 'e-3',
    description: 'Manutenção Site Fulano',
    client: 'Fulano Store',
    value: 70,
    type: 'recorrente',
    status: 'recebido',
    date: day(-20),
    createdAt: day(-20),
  },
  {
    id: 'e-4',
    description: 'Loja Virtual Integrada',
    client: 'Loja do Zé',
    value: 450,
    type: 'avulso',
    status: 'a_receber',
    date: day(5),
    createdAt: day(-1),
  },
  {
    id: 'e-5',
    description: 'Manutenção Blog Pessoal',
    client: 'Blog do Carlos',
    value: 70,
    type: 'recorrente',
    status: 'a_receber',
    date: day(2),
    createdAt: day(-2),
  },
  {
    id: 'e-6',
    description: 'Banner Promocional Redes Sociais',
    client: 'Cafeteria Aurora',
    value: 180,
    type: 'avulso',
    status: 'recebido',
    date: day(-28),
    createdAt: day(-28),
  },
  {
    id: 'e-7',
    description: 'Hospedagem + Suporte Mensal',
    client: 'Studio MKT',
    value: 120,
    type: 'recorrente',
    status: 'recebido',
    date: day(-8),
    createdAt: day(-8),
  },
];
