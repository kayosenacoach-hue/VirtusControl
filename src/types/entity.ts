export type EntityType = 'pj' | 'pf';

export interface Entity {
  id: string;
  name: string;
  document: string; // CNPJ ou CPF
  type: EntityType;
  color: string; // Cor personalizada em HSL
  createdAt: string;
}

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  pj: 'Pessoa Jurídica',
  pf: 'Pessoa Física',
};

export const ENTITY_COLORS = [
  { name: 'Azul Petróleo', value: '175 65% 35%' },
  { name: 'Esmeralda', value: '160 60% 45%' },
  { name: 'Coral', value: '15 80% 55%' },
  { name: 'Roxo', value: '270 60% 55%' },
  { name: 'Ouro', value: '45 85% 50%' },
  { name: 'Rosa', value: '340 75% 55%' },
  { name: 'Índigo', value: '230 70% 55%' },
  { name: 'Ciano', value: '190 85% 45%' },
];

export function formatDocument(doc: string, type: EntityType): string {
  const cleaned = doc.replace(/\D/g, '');
  if (type === 'pj') {
    // CNPJ: XX.XXX.XXX/XXXX-XX
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  } else {
    // CPF: XXX.XXX.XXX-XX
    return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
}

export function validateDocument(doc: string, type: EntityType): boolean {
  const cleaned = doc.replace(/\D/g, '');
  if (type === 'pj') {
    return cleaned.length === 14;
  } else {
    return cleaned.length === 11;
  }
}
