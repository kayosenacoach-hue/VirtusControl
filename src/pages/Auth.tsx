import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/layout/Logo';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PasswordStrengthIndicator, isPasswordStrong } from '@/components/auth/PasswordStrengthIndicator';

export default function Auth() {
  const { isAuthenticated, isLoading, signIn } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

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
    if (!signupName || !signupEmail || !signupPassword || !companyName || !whatsappNumber) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    if (!isPasswordStrong(signupPassword)) {
      toast.error('A senha não atende aos requisitos mínimos de segurança.');
      return;
    }

    setIsSubmitting(true);
    try {
      // A MÁGICA ACONTECE AQUI: Enviamos o nome da empresa e o whatsapp no pacote de "data".
      // A Base de Dados vai intercetar isto e criar a empresa automaticamente!
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

      // Dispara o WhatsApp (Esta parte continua a funcionar lindamente)
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
                  <Input 
                    id="login-password"
                    name="password"
                    type="password" 
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="h-11" 
                  />
                </div>
                <Button type="button" onClick={handleLogin} className="w-full h-11 gradient-primary font-semibold" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Entrar no Sistema
                </Button>
                <div className="text-center mt-4">
                  <Link to="/esqueci-senha" className="text-sm text-primary hover:underline font-medium">Esqueceu a senha?</Link>
                </div>
              </div>
            </TabsContent>

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
                  <Input 
                    id="signup-password"
                    name="new-password"
                    type="password" 
                    autoComplete="new-password"
                    placeholder="Mínimo de 8 caracteres"
                    value={signupPassword} 
                    onChange={(e) => setSignupPassword(e.target.value)} 
                    className="h-11" 
                  />
                  <PasswordStrengthIndicator password={signupPassword} />
                </div>
                <div className="space-y-2">
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
                  <Input 
                    id="whatsapp"
                    name="tel"
                    type="tel" 
                    autoComplete="tel"
                    placeholder="Ex: 5511999999999"
                    value={whatsappNumber} 
                    onChange={(e) => setWhatsappNumber(e.target.value)} 
                    className="h-11" 
                  />
                </div>
                <Button type="button" onClick={handleSignup} className="w-full h-11 gradient-primary font-semibold mt-2" disabled={isSubmitting}>
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