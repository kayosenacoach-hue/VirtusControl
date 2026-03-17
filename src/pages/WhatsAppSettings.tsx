import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  Phone,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  History,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Json } from '@/integrations/supabase/types';

interface ProcessingHistoryItem {
  id: string;
  phone: string;
  extracted_data: Record<string, any>;
  file_url: string | null;
  processed_at: string;
  created_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
}

export default function WhatsAppSettings() {
  const { user, profile } = useAuthContext();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<ProcessingHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const webhookUrl = `https://srjzljruukiurghvfmwj.supabase.co/functions/v1/uazapi-webhook`;

  useEffect(() => {
    if (profile?.phone) {
      setPhone(profile.phone);
    }
  }, [profile]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('pending_whatsapp_expenses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const parsed: ProcessingHistoryItem[] = (data || []).map(item => ({
        ...item,
        extracted_data: (typeof item.extracted_data === 'object' && item.extracted_data !== null && !Array.isArray(item.extracted_data))
          ? item.extracted_data as Record<string, any>
          : {},
      }));

      setHistory(parsed);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const savePhone = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const { error } = await supabase
        .from('profiles')
        .update({ phone: cleanPhone })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Salvo!',
        description: 'Número do WhatsApp atualizado com sucesso.',
      });
    } catch (error) {
      console.error('Error saving phone:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o número.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: 'Copiado!',
      description: 'URL do webhook copiada para a área de transferência.',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <MessageSquare className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Integração WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Configure a integração com Uazapi para receber despesas pelo WhatsApp
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Phone Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="h-5 w-5" />
                Seu Número do WhatsApp
              </CardTitle>
              <CardDescription>
                Cadastre seu número para vincular as despesas recebidas ao seu perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Número com DDD (apenas números)</Label>
                <Input
                  id="phone"
                  placeholder="5511999999999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                />
                <p className="text-xs text-muted-foreground">
                  Inclua o código do país (55 para Brasil) + DDD + número
                </p>
              </div>
              <Button onClick={savePhone} disabled={saving || !phone}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Número
              </Button>
            </CardContent>
          </Card>

          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ExternalLink className="h-5 w-5" />
                Configuração do Webhook
              </CardTitle>
              <CardDescription>
                Configure esta URL no painel do Uazapi para receber mensagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Como configurar
                </p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Acesse o painel do Uazapi</li>
                  <li>Vá em Configurações → Webhook</li>
                  <li>Cole a URL acima no campo de webhook</li>
                  <li>Ative o webhook para receber mensagens</li>
                  <li>Envie uma mensagem de teste pelo WhatsApp</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label>Como usar</Label>
                <div className="text-xs text-muted-foreground space-y-1.5">
                  <p>📸 <strong>Envie uma foto</strong> de comprovante ou nota fiscal</p>
                  <p>✏️ <strong>Digite</strong> no formato: <code className="bg-muted px-1 rounded">Descrição Valor</code></p>
                  <p className="pl-5">Ex: <em>Uber 23.50</em> ou <em>Almoço R$ 45,90</em></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Processing History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5" />
                  Histórico de Processamento
                </CardTitle>
                <CardDescription>
                  Últimas despesas recebidas e processadas pelo WhatsApp
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loadingHistory}>
                <Loader2 className={`mr-2 h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma despesa processada ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.file_url ? (
                        <div className="h-10 w-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                          <img src={item.file_url} alt="" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.extracted_data?.description || 'Despesa'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.phone.replace(/^55/, '+55 ').replace(/(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')}
                          {' · '}
                          {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {item.extracted_data?.amount && (
                        <span className="text-sm font-medium">
                          {formatCurrency(Number(item.extracted_data.amount))}
                        </span>
                      )}
                      {item.claimed_by ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Aprovado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Pendente
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
