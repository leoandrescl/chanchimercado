import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatClp } from '../lib/format';
import { ClientFormModal } from '../components/ClientFormModal';
import type { Client } from '@shared/types';

export function LibretaPage() {
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
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)
    );
  }, [clients, query]);

  const total = clients.reduce((sum, c) => sum + c.balance, 0);
  const withDebt = clients.filter((c) => c.balance > 0).length;

  return (
    <div className="px-4 pt-5">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Libreta de fiados</h1>
        <p className="text-sm text-slate-500">
          {withDebt} cliente{withDebt === 1 ? '' : 's'} con deuda
        </p>
      </header>

      <div className="card mb-4 flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-slate-500">Total por cobrar</p>
          <p className="text-2xl font-bold text-emerald-700">{formatClp(total)}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          + Cliente
        </button>
      </div>

      <input
        className="input mb-3"
        placeholder="Buscar por nombre o teléfono..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading ? (
        <p className="py-10 text-center text-slate-400">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-slate-400">
          {query ? 'Sin resultados' : 'Aún no hay clientes. Crea el primero.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((client) => (
            <li key={client.id}>
              <Link
                to={`/clientes/${client.id}`}
                className="card flex items-center justify-between p-4 transition active:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{client.name}</p>
                  {client.phone && <p className="truncate text-xs text-slate-400">{client.phone}</p>}
                </div>
                <span
                  className={`ml-3 shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                    client.balance > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {client.balance > 0 ? formatClp(client.balance) : 'Al día'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ClientFormModal open={showNew} onClose={() => setShowNew(false)} onSaved={() => refetch()} />
    </div>
  );
}
