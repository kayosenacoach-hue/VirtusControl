import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  DollarSign, 
  Upload, 
  MessageSquare, 
  Receipt,
  Rocket,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useExpenseContext } from '@/contexts/ExpenseContext';
import { useEntityContext } from '@/contexts/EntityContext';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  route?: string;
  checkFn: () => boolean;
}

interface OnboardingChecklistProps {
  onDismiss: () => void;
}

export function OnboardingChecklist({ onDismiss }: OnboardingChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();
  const { expenses } = useExpenseContext();
  const { entities } = useEntityContext();

  const items: ChecklistItem[] = useMemo(() => [
    {
      id: 'entity',
      label: 'Cadastrar empresa',
      description: 'Adicione sua primeira empresa ou pessoa física',
      icon: Building2,
      route: '/configuracoes',
      checkFn: () => entities.length > 0,
    },
    {
      id: 'expense',
      label: 'Lançar primeira despesa',
      description: 'Registre uma despesa manualmente',
      icon: DollarSign,
      route: '/lancar',
      checkFn: () => expenses.length > 0,
    },
    {
      id: 'upload',
      label: 'Enviar comprovante por IA',
      description: 'Faça upload de uma nota fiscal ou comprovante',
      icon: Upload,
      route: '/upload',
      checkFn: () => {
        const done = localStorage.getItem('onboarding_upload_done');
        return done === 'true' || expenses.some(e => e.notes?.includes('IA'));
      },
    },
    {
      id: 'whatsapp',
      label: 'Enviar pelo WhatsApp',
      description: 'Envie um comprovante pelo WhatsApp',
      icon: MessageSquare,
      route: '/whatsapp',
      checkFn: () => {
        const done = localStorage.getItem('onboarding_whatsapp_done');
        return done === 'true';
      },
    },
    {
      id: 'bills',
      label: 'Cadastrar conta recorrente',
      description: 'Adicione uma conta a pagar mensal',
      icon: Receipt,
      route: '/contas',
      checkFn: () => {
        const done = localStorage.getItem('onboarding_bills_done');
        return done === 'true';
      },
    },
  ], [entities.length, expenses]);

  const completedCount = items.filter((item) => item.checkFn()).length;
  const progress = (completedCount / items.length) * 100;
  const allDone = completedCount === items.length;

  // Auto-dismiss when all done
  useEffect(() => {
    if (allDone) {
      const timeout = setTimeout(() => {
        localStorage.setItem('onboarding_checklist_dismissed', 'true');
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [allDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Rocket className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm">Primeiros Passos</h3>
            <span className="text-xs text-muted-foreground">
              {completedCount}/{items.length}
            </span>
          </div>
          <Progress value={progress} className="h-1.5 mt-1" />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            title="Fechar checklist"
          >
            <X className="w-4 h-4" />
          </button>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1">
              {allDone && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-3 text-sm text-primary font-medium"
                >
                  🎉 Parabéns! Você completou todos os passos!
                </motion.div>
              )}
              {items.map((item) => {
                const done = item.checkFn();
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => !done && item.route && navigate(item.route)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      done
                        ? 'opacity-60'
                        : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                    whileHover={!done ? { x: 4 } : undefined}
                  >
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <Icon className={`w-4 h-4 shrink-0 ${done ? 'text-muted-foreground' : 'text-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
