import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Letra maiúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Número', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Símbolo especial', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export function isPasswordStrong(password: string): boolean {
  return PASSWORD_RULES.every(rule => rule.test(password));
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  return (
    <div className="space-y-1.5 mt-2">
      {PASSWORD_RULES.map((rule, i) => {
        const passed = rule.test(password);
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            {passed ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <X className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className={passed ? 'text-green-600' : 'text-muted-foreground'}>
              {rule.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
