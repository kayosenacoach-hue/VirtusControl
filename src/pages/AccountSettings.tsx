import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Mail, Building2, Phone, CreditCard, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountSettings() {
  const { user, profile, updateProfile } = useAuthContext();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [entityName, setEntityName] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<{ plan_name: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    const fetchDetails = async () => {
      const { data: access } = await supabase
        .from('user_entity_access')
        .select('entity_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (access) {
        const [entityRes, subRes] = await Promise.all([
          supabase.from('entities').select('name').eq('id', access.entity_id).maybeSingle(),
          supabase.from('subscriptions').select('plan_name, status').eq('entity_id', access.entity_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (entityRes.data) setEntityName(entityRes.data.name);
        if (subRes.data) setSubscription(subRes.data);
      }
      setLoading(false);
    };

    fetchDetails();
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName.trim(), phone: phone.trim() || null });
    } catch {
      // toast handled in updateProfile
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active':
      case 'authorized':
        return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minha Conta</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações pessoais</CardTitle>
            <CardDescription>Atualize seu nome e dados de contato</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Nome completo
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </Label>
              <Input id="email" value={profile?.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> WhatsApp
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar alterações
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Empresa e Assinatura</CardTitle>
            <CardDescription>Informações da sua empresa e plano</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Empresa</p>
                    <p className="font-semibold">{entityName || 'Nenhuma empresa'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Plano</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold capitalize">{subscription?.plan_name || 'Sem plano'}</p>
                      {subscription && statusLabel(subscription.status)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
