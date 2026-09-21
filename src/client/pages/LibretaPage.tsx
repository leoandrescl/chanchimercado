import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatClp } from '../lib/format';
import { Avatar } from '../components/Avatar';
import { ClientFormModal } from '../components/ClientFormModal';
import { ChevronRightIcon, EyeIcon, EyeOffIcon, SearchIcon, UserPlusIcon, WhatsappIcon } from '../components/icons';
import type { Client } from '@shared/types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function LibretaPage() {
  const [query, setQuery] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showTotal, setShowTotal] = useState(() => localStorage.getItem('cm_show_total') === '1');

  const toggleTotal = () => {
    setShowTotal((prev) => {
      const next = !prev;
      localStorage.setItem('cm_show_total', next ? '1' : '0');
      return next;
    });
  };

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

  const total = clients.reduce((sum, c) => sum + c.balance, 0);
  const debtors = clients.filter((c) => c.balance > 0);
  const alDia = clients.length - debtors.length;

  return (
    <div className="px-4 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{greeting()} 👋</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Libreta</h1>
        </div>
        <button className="btn-primary px-3.5 py-2.5" onClick={() => setShowNew(true)}>
          <UserPlusIcon size={18} /> Nuevo
        </button>
      </header>

      <section className="animate-slide-up relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-900/10">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-white/5" />
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-emerald-50/90">Total por cobrar</p>
          <button
            onClick={toggleTotal}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition active:scale-90"
            aria-label={showTotal ? 'Ocultar total' : 'Mostrar total'}
          >
            {showTotal ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
          </button>
        </div>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">
          {showTotal ? formatClp(total) : '$ ******'}
        </p>
        <div className="mt-4 flex gap-2 text-xs font-semibold">
          <span className="chip bg-white/15 text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> {debtors.length} con deuda
          </span>
          <span className="chip bg-white/15 text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> {alDia} al día
          </span>
        </div>
      </section>

      <div className="relative mb-3">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          className="input pl-10"
          placeholder="Buscar por nombre o teléfono..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-[72px] animate-pulse bg-white/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-slate-400">
          <div className="text-4xl">🐷</div>
          <p>{query ? 'Sin resultados' : 'Aún no hay clientes'}</p>
          {!query && (
            <button className="btn-soft mt-1" onClick={() => setShowNew(true)}>
              Crear el primero
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((client) => (
            <li key={client.id} className="animate-fade-in">
              <Link
                to={`/clientes/${client.id}`}
                className="card flex items-center gap-3 p-3 transition active:scale-[0.99]"
              >
                <Avatar name={client.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{client.name}</p>
                  {client.phone ? (
                    <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                      <WhatsappIcon size={12} /> {client.phone}
                    </p>
                  ) : (
                    <p className="truncate text-xs text-slate-400">Sin teléfono</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${
                    client.balance > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {client.balance > 0 ? formatClp(client.balance) : 'Al día'}
                </span>
                <ChevronRightIcon className="shrink-0 text-slate-300" size={18} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ClientFormModal open={showNew} onClose={() => setShowNew(false)} onSaved={() => refetch()} />
    </div>
  );
}
