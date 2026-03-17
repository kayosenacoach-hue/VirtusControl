import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

function normalizePhoneNumber(raw: string): string {
  // Remove all non-digit characters
  let digits = raw.replace(/\D/g, '');
  
  // If starts with 0, remove it
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  
  // If doesn't start with country code (55 for Brazil), add it
  if (!digits.startsWith('55') && digits.length <= 11) {
    digits = '55' + digits;
  }
  
  return digits;
}

export default function WhatsAppNumberSettings() {
  const { user } = useAuthContext();
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [currentNumber, setCurrentNumber] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchNumber = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('whatsapp_number')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data?.whatsapp_number) {
        setCurrentNumber(data.whatsapp_number);
        setWhatsappNumber(data.whatsapp_number);
      }
      setLoading(false);
    };
    
    fetchNumber();
  }, [user]);

  const handleSave = async () => {
    if (!whatsappNumber.trim()) {
      toast.error('Informe o número de WhatsApp');
      return;
    }

    const normalized = normalizePhoneNumber(whatsappNumber);
    
    if (normalized.length < 12 || normalized.length > 13) {
      toast.error('Número inválido. Use o formato: (11) 99999-9999');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ whatsapp_number: normalized })
        .eq('id', user!.id);

      if (error) throw error;
      
      setCurrentNumber(normalized);
      setWhatsappNumber(normalized);
      toast.success('Número salvo com sucesso!');
    } catch (err) {
      console.error('Error saving WhatsApp number:', err);
      toast.error('Erro ao salvar número');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuração WhatsApp</h1>
          <p className="text-muted-foreground">
            Cadastre seu número para enviar despesas pelo WhatsApp
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Número de WhatsApp
            </CardTitle>
            <CardDescription>
              Informe o número que você usará para enviar comprovantes e despesas via WhatsApp.
              O sistema identificará automaticamente suas mensagens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : (
              <>
                {currentNumber && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Número atual</p>
                      <p className="font-semibold font-mono">{currentNumber}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 ml-auto">Ativo</Badge>
                  </div>
                )}

                {!currentNumber && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                      Nenhum número cadastrado. Cadastre para enviar despesas via WhatsApp.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">Número de WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite no formato que preferir. O sistema irá normalizar automaticamente para o formato internacional (ex: 5511999999999).
                  </p>
                </div>

                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar número
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Como funciona?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>Cadastre seu número de WhatsApp acima</li>
              <li>Envie uma mensagem para o WhatsApp do sistema com o comprovante ou valor</li>
              <li>O sistema identifica você automaticamente pelo número</li>
              <li>A despesa é registrada na sua empresa automaticamente</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
