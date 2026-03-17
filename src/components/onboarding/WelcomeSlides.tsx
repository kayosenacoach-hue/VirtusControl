import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Upload, 
  MessageSquare, 
  Receipt, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  DollarSign,
  FileText
} from 'lucide-react';

interface WelcomeSlidesProps {
  userName: string;
  onComplete: (skipAll: boolean) => void;
}

const slides = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao VirtusControl! 🎉',
    description: 'Seu assistente financeiro inteligente. Vamos te mostrar como organizar suas finanças de forma simples e eficiente.',
    color: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Inteligente',
    description: 'Visualize todas as suas despesas em tempo real com gráficos interativos, métricas e análises por categoria e período.',
    color: 'from-blue-500/20 to-blue-500/5',
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/10',
  },
  {
    icon: DollarSign,
    title: 'Lançar Despesas',
    description: 'Registre suas despesas manualmente de forma rápida, com categorias, entidades e comprovantes organizados.',
    color: 'from-green-500/20 to-green-500/5',
    iconColor: 'text-green-500',
    iconBg: 'bg-green-500/10',
  },
  {
    icon: Upload,
    title: 'Upload com IA',
    description: 'Envie fotos de notas fiscais e comprovantes. Nossa IA extrai automaticamente valor, data e descrição para você.',
    color: 'from-purple-500/20 to-purple-500/5',
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-500/10',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Integrado',
    description: 'Envie comprovantes pelo WhatsApp e eles aparecem automaticamente no sistema. Praticidade total!',
    color: 'from-emerald-500/20 to-emerald-500/5',
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-500/10',
  },
  {
    icon: FileText,
    title: 'Contas a Pagar',
    description: 'Controle suas contas recorrentes, acompanhe vencimentos e nunca mais perca um prazo de pagamento.',
    color: 'from-orange-500/20 to-orange-500/5',
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-500/10',
  },
  {
    icon: Settings,
    title: 'Configurações',
    description: 'Gerencie empresas, usuários, permissões e personalize o sistema do seu jeito.',
    color: 'from-slate-500/20 to-slate-500/5',
    iconColor: 'text-slate-500',
    iconBg: 'bg-slate-500/10',
  },
];

export function WelcomeSlides({ userName, onComplete }: WelcomeSlidesProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const goNext = () => {
    if (current === slides.length - 1) {
      onComplete(false); // completed naturally → go to tour
      return;
    }
    setDirection(1);
    setCurrent((prev) => prev + 1);
  };

  const goPrev = () => {
    if (current === 0) return;
    setDirection(-1);
    setCurrent((prev) => prev - 1);
  };

  const slide = slides[current];
  const Icon = slide.icon;

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${((current + 1) / slides.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content */}
        <div className="pt-8 px-6 pb-6 min-h-[380px] flex flex-col">
          {/* Slide counter */}
          <div className="text-xs text-muted-foreground text-center mb-4">
            {current + 1} de {slides.length}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', damping: 15 }}
                className={`w-20 h-20 rounded-2xl ${slide.iconBg} flex items-center justify-center mb-6`}
              >
                <Icon className={`w-10 h-10 ${slide.iconColor}`} />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-xl md:text-2xl font-bold text-foreground mb-3"
              >
                {current === 0 ? `${slide.title.replace('!', `, ${userName}!`)}` : slide.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-sm"
              >
                {slide.description}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6 mb-4">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === current ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {current > 0 ? (
                <Button variant="outline" onClick={goPrev} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => onComplete(false)} className="flex-1 text-muted-foreground">
                  Pular tutorial
                </Button>
              )}
              <Button onClick={goNext} className="flex-1">
                {current === slides.length - 1 ? (
                  'Começar a usar! 🚀'
                ) : (
                  <>Próximo <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </div>
            <button
              onClick={() => onComplete(true)}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
            >
              Não quero ver o tutorial novamente
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
