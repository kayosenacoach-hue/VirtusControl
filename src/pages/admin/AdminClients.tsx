import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';

interface ClientRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
  entityName?: string;
  subscriptionStatus?: string;
}

export default function AdminClients() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!profiles) return;

        // Fetch entity access and subscriptions for each user
        const { data: accessList } = await supabase
          .from('user_entity_access')
          .select('user_id, entity_id');

        const { data: entities } = await supabase
          .from('entities')
          .select('id, name');

        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('entity_id, status')
          .order('created_at', { ascending: false });

        const entityMap = new Map(entities?.map((e) => [e.id, e.name]) || []);
        const accessMap = new Map(accessList?.map((a) => [a.user_id, a.entity_id]) || []);
        const subMap = new Map<string, string>();
        subscriptions?.forEach((s) => {
          if (!subMap.has(s.entity_id)) subMap.set(s.entity_id, s.status);
        });

        const enriched: ClientRow[] = profiles.map((p) => {
          const entityId = accessMap.get(p.id);
          return {
            ...p,
            entityName: entityId ? entityMap.get(entityId) || '—' : '—',
            subscriptionStatus: entityId ? subMap.get(entityId) || 'sem assinatura' : 'sem empresa',
          };
        });

        setClients(enriched);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.entityName || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Todos os usuários cadastrados no sistema</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Assinatura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.full_name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.entityName}</TableCell>
                    <TableCell>{client.phone || '—'}</TableCell>
                    <TableCell>
                      {format(new Date(client.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(client.subscriptionStatus || '')}>
                        {client.subscriptionStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
