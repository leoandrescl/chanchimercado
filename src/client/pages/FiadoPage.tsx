import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatClp } from '../lib/format';
import { Avatar } from '../components/Avatar';
import { ClientFormModal } from '../components/ClientFormModal';
import { BackIcon, ChevronRightIcon, SearchIcon, UserPlusIcon } from '../components/icons';
import type { Client } from '@shared/types';

export function FiadoPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ clients: Client[] }>('/api/clients'),
  });
  const clients = data?.clients ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q));
  }, [clients, query]);

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col bg-slate-100">
      <header className="border-b border-slate-200/80 bg-white/90 px-3 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button className="icon-btn" onClick={() => navigate('/libreta')} aria-label="Volver">
            <BackIcon />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Nuevo fiado</h1>
            <p className="text-xs text-slate-500">Elige el cliente</p>
          </div>
          <button className="btn-primary px-3.5 py-2.5" onClick={() => setShowNew(true)}>
            <UserPlusIcon size={18} /> Nuevo
          </button>
        </div>
        <div className="relative mt-3">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="input pl-10"
            placeholder="Buscar cliente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="card h-[68px] animate-pulse bg-white/60" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-slate-400">
            <div className="text-4xl">🐷</div>
            <p>{query ? 'Sin resultados' : 'Aún no hay clientes'}</p>
            <button className="btn-soft mt-1" onClick={() => setShowNew(true)}>
              Crear cliente
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => navigate(`/pos/${c.id}`)}
                  className="card flex w-full items-center gap-3 p-3 text-left transition active:scale-[0.99]"
                >
                  <Avatar name={c.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">{c.name}</p>
                    <p className={`text-xs font-semibold ${c.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {c.balance > 0 ? `Debe ${formatClp(c.balance)}` : 'Al día'}
                    </p>
                  </div>
                  <ChevronRightIcon className="shrink-0 text-slate-300" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ClientFormModal open={showNew} onClose={() => setShowNew(false)} onSaved={() => refetch()} />
    </div>
  );
}
