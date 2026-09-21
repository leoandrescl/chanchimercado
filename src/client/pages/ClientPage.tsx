import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatClp, formatShortDate, monthLabel } from '../lib/format';
import { AbonoModal } from '../components/AbonoModal';
import { ClientFormModal } from '../components/ClientFormModal';
import { ConfirmDialog } from '../components/Modal';
import { useToast } from '../lib/toast';
import { buildAccountMessage, whatsappLink } from '../lib/whatsapp';
import type { Client, ClientDetail, Movement } from '@shared/types';

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ClientPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [showAbono, setShowAbono] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [movementToDelete, setMovementToDelete] = useState<Movement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => api.get<{ client: Client; movements: Movement[]; totals: ClientDetail['totals'] }>(`/api/clients/${id}`),
    enabled: !!id,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['client', id] });
    qc.invalidateQueries({ queryKey: ['clients'] });
  };

  if (isLoading || !data) {
    return <p className="py-20 text-center text-slate-400">Cargando...</p>;
  }

  const { client, movements } = data;

  const groups = movements.reduce<Record<string, Movement[]>>((acc, m) => {
    const key = monthLabel(m.occurred_at);
    (acc[key] ??= []).push(m);
    return acc;
  }, {});

  const sendWhatsapp = () => {
    const msg = buildAccountMessage({ name: client.name, phone: client.phone, balance: client.balance, movements });
    const link = whatsappLink(client.phone, msg);
    if (link) window.open(link, '_blank');
  };

  const deleteMovement = async () => {
    if (!movementToDelete) return;
    try {
      await api.del(`/api/movements/${movementToDelete.id}`);
      toast.show('Movimiento eliminado', 'success');
      refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo eliminar', 'error');
    }
  };

  const deleteClient = async () => {
    try {
      await api.del(`/api/clients/${client.id}`);
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.show('Cliente eliminado', 'success');
      navigate('/libreta');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo eliminar', 'error');
    }
  };

  return (
    <div className="px-4 pt-4">
      <header className="mb-3 flex items-center justify-between">
        <button className="rounded-lg p-1 text-slate-500" onClick={() => navigate(-1)} aria-label="Volver">
          <BackIcon />
        </button>
        <div className="flex gap-1">
          <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600" onClick={() => setShowEdit(true)}>
            Editar
          </button>
          <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600" onClick={() => setConfirmDelete(true)}>
            Eliminar
          </button>
        </div>
      </header>

      <div className="card mb-4 p-5 text-center">
        <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
        {client.phone && <p className="text-sm text-slate-400">{client.phone}</p>}
        <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Deuda pendiente</p>
        <p className={`text-4xl font-extrabold ${client.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
          {formatClp(client.balance)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="btn-primary py-3" onClick={() => setShowAbono(true)} disabled={client.balance <= 0}>
            Abonar
          </button>
          <Link className="btn-ghost py-3" to={`/pos/${client.id}`}>
            Agregar fiado
          </Link>
        </div>
        <button className="btn-ghost mt-3 w-full" onClick={sendWhatsapp}>
          Enviar estado por WhatsApp
        </button>
      </div>

      <h2 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">Historial</h2>
      {movements.length === 0 ? (
        <p className="py-8 text-center text-slate-400">Sin movimientos aún</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([month, items]) => (
            <div key={month}>
              <p className="mb-1 px-1 text-xs font-semibold text-slate-400">{month}</p>
              <ul className="card divide-y divide-slate-100 overflow-hidden">
                {items.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-700">{m.description || 'Movimiento'}</p>
                      <p className="text-xs text-slate-400">{formatShortDate(m.occurred_at)}</p>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-3">
                      <span className={`text-sm font-bold ${m.amount < 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {m.amount < 0 ? '-' : '+'}
                        {formatClp(Math.abs(m.amount))}
                      </span>
                      <button
                        className="rounded p-1 text-slate-300 hover:text-rose-500"
                        onClick={() => setMovementToDelete(m)}
                        aria-label="Eliminar movimiento"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2m-1 0v14H9V6" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <AbonoModal
        open={showAbono}
        clientId={client.id}
        clientName={client.name}
        balance={client.balance}
        onClose={() => setShowAbono(false)}
        onSaved={refresh}
      />
      <ClientFormModal
        open={showEdit}
        client={client as Client}
        onClose={() => setShowEdit(false)}
        onSaved={refresh}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar cliente"
        message={`¿Eliminar a ${client.name}? Se borrará todo su historial. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={deleteClient}
        onClose={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={!!movementToDelete}
        title="Eliminar movimiento"
        message={`¿Eliminar "${movementToDelete?.description ?? ''}"? El saldo se recalculará automáticamente.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={deleteMovement}
        onClose={() => setMovementToDelete(null)}
      />
    </div>
  );
}
