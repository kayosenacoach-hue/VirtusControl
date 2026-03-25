import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsIcon } from 'lucide-react';

// === PAINEL DE DIAGNÓSTICO (BYPASS TOTAL) ===
function PainelDiagnostico() {
  const { user } = useAuthContext();
  const [log, setLog] = useState('Pronto para testar a ligação direta ao Supabase...\n');

  const rodarTeste = async () => {
    setLog('A iniciar teste...\n');
    if (!user) { 
      setLog(p => p + 'ERRO: Sem utilizador logado no momento.\n'); 
      return; 
    }
    
    // Pacote forçado e perfeito
    const payload = {
      user_id: user.id,
      name: 'CONTA TESTE DIAGNÓSTICO ' + new Date().getSeconds(),
      category: 'operacional',
      recurrence: 'mensal',
      is_active: true
    };

    setLog(p => p + 'A gravar: ' + JSON.stringify(payload) + '\n');

    try {
      const { data, error } = await supabase
        .from('recurring_accounts')
        .insert(payload)
        .select();

      if (error) {
        setLog(p => p + '\n🔴 ERRO DO SUPABASE:\n' + JSON.stringify(error, null, 2) + '\n');
      } else {
        setLog(p => p + '\n🟢 GRAVOU COM SUCESSO! Dados que entraram na tabela:\n' + JSON.stringify(data, null, 2) + '\n');
      }
    } catch (e: any) {
      setLog(p => p + '\n🔴 EXCEÇÃO CRÍTICA:\n' + e.message + '\n');
    }
  };

  return (
    <div className="bg-black text-green-400 p-4 rounded-xl font-mono text-sm mb-8 whitespace-pre-wrap overflow-auto shadow-xl border border-green-900">
      <h3 className="font-bold text-white mb-4 text-lg">Painel de Diagnóstico Direto</h3>
      <p className="text-gray-400 mb-4">Este botão ignora todos os formulários e tenta injetar uma conta fixa diretamente na sua base de dados.</p>
      <button onClick={rodarTeste} className="bg-green-600 hover:bg-green-500 text-black px-6 py-3 font-bold rounded-lg mb-4 transition-colors">
        EXECUTAR INJEÇÃO DE DADOS
      </button>
      <div className="bg-gray-900 p-4 rounded border border-gray-800 min-h-[200px]">{log}</div>
    </div>
  );
}

// === PÁGINA DE CONFIGURAÇÕES ===
export default function Settings() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
            <SettingsIcon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground mt-1">Modo de Diagnóstico Ativado</p>
          </div>
        </div>

        {/* INJETAMOS O PAINEL AQUI */}
        <PainelDiagnostico />

      </div>
    </MainLayout>
  );
}