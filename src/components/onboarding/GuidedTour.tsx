import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

interface TourStep {
  selector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    selector: '[data-tour="entity-selector"]',
    title: 'Seletor de Empresa',
    description: 'Aqui você alterna entre suas empresas e pessoas físicas para ver os dados de cada uma.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="metric-cards"]',
    title: 'Métricas Rápidas',
    description: 'Veja o total de despesas, maior gasto, categoria principal e média por despesa do mês.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="charts"]',
    title: 'Gráficos e Análises',
    description: 'Acompanhe seus gastos por categoria e a evolução mensal em gráficos visuais.',
    position: 'top',
  },
  {
    selector: '[data-tour="sidebar-lancar"]',
    title: 'Lançar Despesas',
    description: 'Clique aqui para registrar uma nova despesa manualmente com todos os detalhes.',
    position: 'right',
  },
  {
    selector: '[data-tour="sidebar-upload"]',
    title: 'Upload com IA',
    description: 'Envie fotos de comprovantes e nossa IA extrai os dados automaticamente.',
    position: 'right',
  },
  {
    selector: '[data-tour="sidebar-contas"]',
    title: 'Contas a Pagar',
    description: 'Gerencie suas contas recorrentes e acompanhe os vencimentos.',
    position: 'right',
  },
  {
    selector: '[data-tour="user-menu"]',
    title: 'Menu do Usuário',
    description: 'Acesse configurações da conta, assinatura e faça logout por aqui.',
    position: 'bottom',
  },
];

interface GuidedTourProps {
  onComplete: () => void;
}

export function GuidedTour({ onComplete }: GuidedTourProps) {
  const [current, setCurrent] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const findElement = useCallback(() => {
    const step = tourSteps[current];
    const el = document.querySelector(step.selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        setIsVisible(true);
      }, 400);
    } else {
      // Skip to next if element not found
      if (current < tourSteps.length - 1) {
        setCurrent((prev) => prev + 1);
      } else {
        onComplete();
      }
    }
  }, [current, onComplete]);

  useEffect(() => {
    setIsVisible(false);
    const timeout = setTimeout(findElement, 200);
    return () => clearTimeout(timeout);
  }, [current, findElement]);

  useEffect(() => {
    const handleResize = () => findElement();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [findElement]);

  const step = tourSteps[current];

  const getTooltipPosition = () => {
    if (!targetRect) return {};
    const padding = 12;
    const tooltipWidth = 320;

    switch (step.position) {
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16)),
        };
      case 'top':
        return {
          bottom: window.innerHeight - targetRect.top + padding,
          left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16)),
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2 - 60,
          left: targetRect.right + padding,
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2 - 60,
          right: window.innerWidth - targetRect.left + padding,
        };
    }
  };

  if (!targetRect || !isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - 6}
              y={targetRect.top - 6}
              width={targetRect.width + 12}
              height={targetRect.height + 12}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {/* Highlight border */}
      <div
        className="absolute border-2 border-primary rounded-lg transition-all duration-300 pointer-events-none"
        style={{
          left: targetRect.left - 6,
          top: targetRect.top - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
        }}
      >
        <div className="absolute inset-0 rounded-lg animate-pulse border-2 border-primary/50" />
      </div>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute z-10 w-80 bg-card rounded-xl shadow-2xl border border-border p-4"
          style={getTooltipPosition()}
        >
          {/* Close button */}
          <button
            onClick={onComplete}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-xs text-muted-foreground mb-1">
            Passo {current + 1} de {tourSteps.length}
          </div>
          <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

          <div className="flex items-center gap-2">
            {current > 0 && (
              <Button variant="outline" size="sm" onClick={() => setCurrent(current - 1)}>
                <ChevronLeft className="w-3 h-3 mr-1" /> Anterior
              </Button>
            )}
            <div className="flex-1" />
            {current < tourSteps.length - 1 ? (
              <Button size="sm" onClick={() => setCurrent(current + 1)}>
                Próximo <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={onComplete}>
                Concluir ✓
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
