import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/layout/Logo';
// Adicionados novos ícones do Lucide
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PasswordStrengthIndicator, isPasswordStrong } from '@/components/auth/PasswordStrengthIndicator';

export default function Auth() {
  const { isAuthenticated, isLoading, signIn } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false); // Olhinho Login

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState(''); // Nova confirmação
  const [companyName, setCompanyName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  // Controles de visibilidade de senha no cadastro
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Função para validar o WhatsApp visualmente
  const getPhoneValidation = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 0) return null; // Não começou a digitar
    // Aceita de 10 a 11 dígitos (DDD + Número) ou até 13 dígitos (com 55 na frente)
    if (digits.length >= 10 && digits.length <= 13) return true;
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Preencha email e senha.");
      return;
    }
    setIsSubmitting(true);
    try {
      await signIn(email, password);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async () => {
    // 1. Verifica campos vazios
    if (!signupName || !signupEmail || !signupPassword || !signupConfirmPassword || !companyName || !whatsappNumber) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    // 2. Verifica se as senhas batem
    if (signupPassword !== signupConfirmPassword) {
      toast.error("As senhas não coincidem. Verifique o que foi digitado.");
      return;
    }

    // 3. Verifica força da senha
    if (!isPasswordStrong(signupPassword)) {
      toast.error('A senha não atende aos requisitos mínimos de segurança.');
      return;
    }

    // 4. Verifica se o WhatsApp é válido
    if (getPhoneValidation(whatsappNumber) === false) {
      toast.error("Número de WhatsApp inválido. Verifique se incluiu o DDD.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: { 
            full_name: signupName, 
            role: 'owner',
            company_name: companyName,
            whatsapp_number: whatsappNumber
          },
        },
      });

      if (authError) throw authError;

      // Dispara o WhatsApp
      supabase.functions.invoke('notify-new-signup', {
        body: { userName: signupName, userPhone: whatsappNumber, companyName: companyName },
      }).then(() => console.log("WhatsApp enviado!"))
        .catch((err) => console.error('Erro notificação:', err));

      if (authData.session) {
        toast.success('Conta e Empresa criadas com sucesso! Bem-vindo.');
      } else {
        toast.success('Conta criada! Verifique seu email para confirmar. A sua Empresa já está pronta!');
      }
      
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md mx-4 shadow-xl border-border">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center"><Logo /></div>
          <div>
            <CardTitle className="text-xl md:text-2xl">VirtusControl</CardTitle>
            <CardDescription className="text-sm">Sistema de gestão financeira multi-entidade</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            {/* TAB DE LOGIN */}
            <TabsContent value="login">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input 
                    id="login-email"
                    name="email"
                    type="email" 
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="h-11" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Input 
                      id="login-password"
                      name="password"
                      type={showLoginPassword ? "text" : "password"} 
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="h-11 pr-10" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <Button type="button" onClick={handleLogin} className="w-full h-11 gradient-primary font-semibold" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Entrar no Sistema
                </Button>
                <div className="text-center mt-4">
                  <Link to="/esqueci-senha" className="text-sm text-primary hover:underline font-medium">Esqueceu a senha?</Link>
                </div>
              </div>
            </TabsContent>

            {/* TAB DE CADASTRO */}
            <TabsContent value="signup">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <Input 
                    id="signup-name"
                    name="name"
                    type="text" 
                    autoComplete="name"
                    placeholder="Ex: João da Silva"
                    value={signupName} 
                    onChange={(e) => setSignupName(e.target.value)} 
                    className="h-11" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email profissional</Label>
                  <Input 
                    id="signup-email"
                    name="email"
                    type="email" 
                    autoComplete="email"
                    placeholder="joao@empresa.com.br"
                    value={signupEmail} 
                    onChange={(e) => setSignupEmail(e.target.value)} 
                    className="h-11" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha de acesso</Label>
                  <div className="relative">
                    <Input 
                      id="signup-password"
                      name="new-password"
                      type={showSignupPassword ? "text" : "password"} 
                      autoComplete="new-password"
                      placeholder="Mínimo de 8 caracteres"
                      value={signupPassword} 
                      onChange={(e) => setSignupPassword(e.target.value)} 
                      className="h-11 pr-10" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSignupPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={signupPassword} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirmar Senha</Label>
                  <div className="relative">
                    <Input 
                      id="signup-confirm-password"
                      name="confirm-password"
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="Digite a senha novamente"
                      value={signupConfirmPassword} 
                      onChange={(e) => setSignupConfirmPassword(e.target.value)} 
                      className={`h-11 pr-10 ${signupConfirmPassword && signupPassword !== signupConfirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {signupConfirmPassword && signupPassword !== signupConfirmPassword && (
                    <p className="text-xs text-destructive font-medium mt-1">As senhas não coincidem.</p>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="company-name">Nome da sua Empresa</Label>
                  <Input 
                    id="company-name"
                    name="organization"
                    type="text" 
                    placeholder="Ex: Padaria do João LTDA"
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)} 
                    className="h-11" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">Número do WhatsApp</Label>
                  <div className="relative">
                    <Input 
                      id="whatsapp"
                      name="tel"
                      type="tel" 
                      autoComplete="tel"
                      placeholder="Ex: (85) 99999-9999"
                      value={whatsappNumber} 
                      onChange={(e) => setWhatsappNumber(e.target.value)} 
                      className={`h-11 pr-10 ${getPhoneValidation(whatsappNumber) === false ? 'border-destructive focus-visible:ring-destructive' : ''}`} 
                    />
                    {whatsappNumber && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {getPhoneValidation(whatsappNumber) ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                  {getPhoneValidation(whatsappNumber) === false && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      Digite um número válido com DDD.
                    </p>
                  )}
                </div>

                <Button type="button" onClick={handleSignup} className="w-full h-11 gradient-primary font-semibold mt-4" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Criar Minha Conta
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}