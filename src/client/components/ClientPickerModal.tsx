import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { api } from '../lib/api';
import { formatClp } from '../lib/format';
import { CheckIcon, SearchIcon } from './icons';
import type { Client } from '@shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (client: Client) => void;
  currentId?: string;
}

export function ClientPickerModal({ open, onClose, onSelect, currentId }: Props) {
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ clients: Client[] }>('/api/clients'),
    enabled: open,
  });
  const clients = data?.clients ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q));
  }, [clients, query]);

  return (
    <Modal
      open={open}
      title="Cambiar cliente"
      onClose={onClose}
      footer={
        <p className="text-center text-xs text-slate-400">
          Toca un cliente para abrir su cuenta
        </p>
      }
    >
      <div className="relative mb-3">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          className="input pl-10"
          placeholder="Buscar cliente..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-slate-400">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-slate-400">Sin resultados</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition active:scale-[0.99] ${
                  c.id === currentId ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-slate-50 active:bg-slate-100'
                }`}
                onClick={() => {
                  onSelect(c);
                  onClose();
                  setQuery('');
                }}
              >
                <Avatar name={c.name} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-800">{c.name}</span>
                  <span className={`block text-xs font-semibold ${c.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {c.balance > 0 ? `Debe ${formatClp(c.balance)}` : 'Al día'}
                  </span>
                </span>
                {c.id === currentId && <CheckIcon className="text-emerald-600" size={20} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
