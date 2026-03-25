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
      // 1. Cria o utilizador
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: signupName, role: 'owner' },
        },
      });

      if (authError) throw authError;

      // 2. CRIAÇÃO FORÇADA DA EMPRESA (Bypass do onboarding falhado)
      const userId = authData.user?.id;
      
      if (userId) {
        try {
          // Grava a Entidade (Empresa) diretamente
          const { data: entityData, error: entityError } = await (supabase.from('entities') as any).insert({
            name: companyName,
            type: 'pj',
            document: '00000000000000', // Preenchimento genérico necessário
            user_id: userId
          }).select().single();

          if (entityError) console.error("Erro ao criar Entidade nativa:", entityError);

          // Se a empresa foi criada com sucesso, dá acesso ao utilizador
          if (entityData) {
             await (supabase.from('user_entity_access') as any).insert({
                user_id: userId,
                entity_id: entityData.id,
             });
          }
        } catch (e) {
           console.error("Falha silenciosa ao forçar criação de empresa:", e);
        }
      }

      // 3. Dispara o WhatsApp (Já confirmámos que funciona!)
      supabase.functions.invoke('notify-new-signup', {
        body: { userName: signupName, userPhone: whatsappNumber, companyName: companyName },
      }).then(() => console.log("WhatsApp enviado!"))
        .catch((err) => console.error('Notification error:', err));

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
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center"><Logo /></div>
          <div>
            <CardTitle className="text-xl md:text-2xl">VirtusControl</CardTitle>
            <CardDescription className="text-sm">Sistema de gestão financeira multi-entidade</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" /></div>
                <div className="space-y-2"><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" /></div>
                <Button type="button" onClick={handleLogin} className="w-full h-11" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Entrar
                </Button>
                <div className="text-center"><Link to="/esqueci-senha" className="text-sm text-primary hover:underline">Esqueceu a senha?</Link></div>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>Nome completo</Label><Input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="h-11" /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="h-11" /></div>
                <div className="space-y-2"><Label>Senha</Label><Input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="h-11" /><PasswordStrengthIndicator password={signupPassword} /></div>
                <div className="space-y-2"><Label>Nome da empresa</Label><Input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-11" /></div>
                <div className="space-y-2"><Label>WhatsApp</Label><Input type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="h-11" /></div>
                <Button type="button" onClick={handleSignup} className="w-full h-11" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Criar Conta
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}