import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, Upload, Receipt, Shield, Zap, Users,
  CheckCircle2, Star, ChevronDown, ArrowRight, Menu, X,
  MessageSquare, Brain, CreditCard, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

// ─── Navbar ──────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 md:px-8 h-16 gap-4">
        <Link to="/" className="flex items-center gap-3 flex-shrink-0">
          <img src="/logo-virtuscontrol.png" alt="VirtusControl" className="h-9 w-9 rounded-xl" />
          <span className="text-lg font-bold tracking-tight whitespace-nowrap">
            Virtus<span className="text-primary">Control</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</a>
          <a href="#precos" className="hover:text-foreground transition-colors">Preços</a>
          <a href="#depoimentos" className="hover:text-foreground transition-colors">Depoimentos</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
          <Link to="/auth">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              Começar grátis <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="lg:hidden p-2">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="lg:hidden border-t border-border bg-background px-4 pb-4"
        >
          <div className="flex flex-col gap-3 pt-3 text-sm">
            <a href="#funcionalidades" onClick={() => setOpen(false)} className="py-2">Funcionalidades</a>
            <a href="#precos" onClick={() => setOpen(false)} className="py-2">Preços</a>
            <a href="#depoimentos" onClick={() => setOpen(false)} className="py-2">Depoimentos</a>
            <a href="#faq" onClick={() => setOpen(false)} className="py-2">FAQ</a>
            <Link to="/auth" onClick={() => setOpen(false)}><Button variant="outline" className="w-full mt-2">Entrar</Button></Link>
            <Link to="/auth" onClick={() => setOpen(false)}><Button className="w-full">Começar grátis</Button></Link>
          </div>
        </motion.div>
      )}
    </nav>
  );
}

// ─── Hero ────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <motion.div
          className="text-center max-w-4xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Zap className="h-4 w-4" />
            7 dias grátis para testar
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]"
          >
            Controle financeiro
            <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              inteligente e simples
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Gerencie despesas, contas a pagar e fluxo de caixa da sua empresa com IA.
            Importe extratos, receba alertas por WhatsApp e tome decisões com dados reais.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="h-13 px-8 text-base bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                Começar grátis por 7 dias
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#funcionalidades">
              <Button size="lg" variant="outline" className="h-13 px-8 text-base">
                Ver funcionalidades
              </Button>
            </a>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-10 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> Setup em 2 min</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> 7 dias grátis</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> Cancele quando quiser</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Video Section ───────────────────────────────────
function VideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-4 md:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="relative rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 border border-border bg-card"
        >
          <video
            ref={videoRef}
            className="w-full aspect-video"
            controls
            preload="metadata"
            playsInline
            muted
            autoPlay
            src="/videos/video-vendas.mov"
          >
            Seu navegador não suporta vídeos.
          </video>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Features ────────────────────────────────────────
const features = [
  {
    icon: BarChart3,
    title: 'Dashboard completo',
    description: 'Visão geral das suas finanças com gráficos interativos e métricas em tempo real.',
  },
  {
    icon: Brain,
    title: 'Upload com IA',
    description: 'Importe extratos bancários e faturas de cartão. A IA categoriza tudo automaticamente.',
  },
  {
    icon: Receipt,
    title: 'Contas a pagar',
    description: 'Gerencie contas recorrentes, acompanhe vencimentos e nunca perca um prazo.',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp integrado',
    description: 'Envie comprovantes por WhatsApp e registre despesas sem abrir o sistema.',
  },
  {
    icon: Users,
    title: 'Multi-empresa',
    description: 'Gerencie múltiplas empresas e pessoas físicas em uma única conta.',
  },
  {
    icon: Shield,
    title: 'Segurança total',
    description: 'Dados criptografados, autenticação segura e controle de acesso por usuário.',
  },
];

function Features() {
  return (
    <section id="funcionalidades" className="py-20 md:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.span variants={fadeUp} className="text-sm font-semibold uppercase tracking-widest text-primary">
            Funcionalidades
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-3xl md:text-4xl font-bold">
            Tudo que você precisa para{' '}
            <span className="text-primary">controlar suas finanças</span>
          </motion.h2>
        </motion.div>

        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={stagger}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="group rounded-2xl bg-card border border-border p-6 md:p-8 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Pricing ─────────────────────────────────────────
function Pricing() {
  return (
    <section id="precos" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.span variants={fadeUp} className="text-sm font-semibold uppercase tracking-widest text-primary">
            Preços
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-3xl md:text-4xl font-bold">
            Simples e transparente
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Comece grátis por 7 dias. Sem compromisso.
          </motion.p>
        </motion.div>

        <motion.div
          className="max-w-md mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <div className="relative rounded-3xl bg-card border-2 border-primary p-8 md:p-10 shadow-xl shadow-primary/10">
            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1 text-sm font-semibold text-primary-foreground">
                <Star className="h-3.5 w-3.5" /> Mais popular
              </span>
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold">Plano Profissional</h3>
              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-extrabold">R$39</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">por empresa</p>
            </div>

            <ul className="mt-8 space-y-3">
              {[
                'Dashboard completo com gráficos',
                'Upload de extratos com IA',
                'Contas a pagar e recorrentes',
                'Integração WhatsApp',
                'Multi-empresa',
                'Usuários ilimitados',
                'Suporte prioritário',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link to="/auth" className="block mt-8">
              <Button className="w-full h-12 text-base bg-primary hover:bg-primary/90 shadow-lg">
                Começar 7 dias grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Cartão necessário para ativar o trial • Cancele quando quiser
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Testimonials ────────────────────────────────────
const testimonials = [
  {
    name: 'Ana Paula',
    role: 'Dona de restaurante',
    text: 'Antes eu controlava tudo em planilha e vivia perdendo prazo. Agora com o VirtusControl, recebo alertas no WhatsApp e importo meu extrato em segundos.',
    stars: 5,
  },
  {
    name: 'Carlos Eduardo',
    role: 'Contador autônomo',
    text: 'Gerencio 3 empresas no mesmo sistema. A IA categoriza as despesas e me economiza horas de trabalho toda semana.',
    stars: 5,
  },
  {
    name: 'Mariana Silva',
    role: 'CEO de startup',
    text: 'O dashboard me dá uma visão clara do fluxo de caixa. Finalmente consigo tomar decisões baseadas em dados reais.',
    stars: 5,
  },
];

function Testimonials() {
  return (
    <section id="depoimentos" className="py-20 md:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.span variants={fadeUp} className="text-sm font-semibold uppercase tracking-widest text-primary">
            Depoimentos
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-3xl md:text-4xl font-bold">
            Quem usa, recomenda
          </motion.h2>
        </motion.div>

        <motion.div
          className="grid gap-6 md:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={stagger}
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              className="rounded-2xl bg-card border border-border p-6 md:p-8"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground italic">"{t.text}"</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────
const faqs = [
  {
    q: 'Preciso colocar cartão de crédito para testar?',
    a: 'Sim, é necessário cadastrar um cartão de crédito para ativar o período de teste. Porém, você só será cobrado após os 7 dias gratuitos. Pode cancelar a qualquer momento antes disso.',
  },
  {
    q: 'Posso gerenciar mais de uma empresa?',
    a: 'Sim! O VirtusControl permite gerenciar múltiplas empresas e pessoas físicas em uma única conta.',
  },
  {
    q: 'Como funciona o upload com IA?',
    a: 'Basta enviar seu extrato bancário ou fatura de cartão de crédito em PDF. Nossa IA extrai e categoriza todas as despesas automaticamente.',
  },
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim! Sem multa, sem burocracia. Cancele quando quiser diretamente pelo sistema.',
  },
  {
    q: 'Meus dados estão seguros?',
    a: 'Sim. Utilizamos criptografia de ponta, autenticação segura e controle de acesso por usuário. Seus dados financeiros estão protegidos.',
  },
];

function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.span variants={fadeUp} className="text-sm font-semibold uppercase tracking-widest text-primary">
            FAQ
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-3xl md:text-4xl font-bold">
            Perguntas frequentes
          </motion.h2>
        </motion.div>

        <motion.div
          className="space-y-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={stagger}
        >
          {faqs.map((faq, idx) => (
            <motion.div key={idx} variants={fadeUp} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="flex w-full items-center justify-between p-5 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", openIdx === idx && "rotate-180")} />
              </button>
              {openIdx === idx && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed"
                >
                  {faq.a}
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────
function CTA() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <motion.div
          className="relative rounded-3xl bg-gradient-to-br from-primary to-accent overflow-hidden p-10 md:p-16 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
              Pronto para organizar suas finanças?
            </h2>
            <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto text-lg">
              Comece agora com 7 dias grátis. Cancele quando quiser.
            </p>
            <Link to="/auth" className="inline-block mt-8">
              <Button size="lg" className="h-13 px-8 text-base bg-white text-primary hover:bg-white/90 shadow-xl">
                Criar minha conta grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 py-12">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo-virtuscontrol.png" alt="VirtusControl" className="h-8 w-8 rounded-lg" />
            <span className="font-bold">
              Virtus<span className="text-primary">Control</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#precos" className="hover:text-foreground transition-colors">Preços</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <Link to="/auth" className="hover:text-foreground transition-colors">Entrar</Link>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} VirtusControl. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing Page ───────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <VideoSection />
      <Features />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
