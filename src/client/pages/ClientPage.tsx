import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatClp, formatShortDate, monthLabel } from '../lib/format';
import { Avatar } from '../components/Avatar';
import { AbonoModal } from '../components/AbonoModal';
import { ClientFormModal } from '../components/ClientFormModal';
import { ClientPickerModal } from '../components/ClientPickerModal';
import { ConfirmDialog } from '../components/Modal';
import { useToast } from '../lib/toast';
import { buildAccountMessage, buildSummaryMessage, whatsappLink } from '../lib/whatsapp';
import {
  BackIcon,
  CartIcon,
  EditIcon,
  MoneyIcon,
  ReceiptIcon,
  SparkleIcon,
  SwapIcon,
  TrashIcon,
  WhatsappIcon,
} from '../components/icons';
import type { Client, ClientDetail, Movement } from '@shared/types';

function MovementIcon({ type, amount }: { type: Movement['type']; amount: number }) {
  if (type === 'adjustment') {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
        <SparkleIcon size={17} />
      </span>
    );
  }
  if (amount < 0) {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
        <MoneyIcon size={17} />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
      <ReceiptIcon size={17} />
    </span>
  );
}

export function ClientPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [showAbono, setShowAbono] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
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
    return (
      <div className="space-y-3 px-4 pt-5">
        <div className="card h-52 animate-pulse bg-white/60" />
        <div className="card h-24 animate-pulse bg-white/60" />
      </div>
    );
  }

  const { client, movements } = data;

  const groups = movements.reduce<Record<string, Movement[]>>((acc, m) => {
    const key = monthLabel(m.occurred_at);
    (acc[key] ??= []).push(m);
    return acc;
  }, {});

  const sendMessage = (kind: 'summary' | 'full') => {
    const msg =
      kind === 'summary'
        ? buildSummaryMessage({ name: client.name, phone: client.phone, balance: client.balance, movements })
        : buildAccountMessage({ name: client.name, phone: client.phone, balance: client.balance, movements });
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

  const clearHistory = async () => {
    try {
      await api.del(`/api/clients/${client.id}/movements`);
      toast.show('Historial borrado', 'success');
      refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo borrar el historial', 'error');
    }
  };

  return (
    <div className="px-4 pt-3">
      <header className="mb-3 flex items-center justify-between">
        <button className="icon-btn" onClick={() => navigate('/libreta')} aria-label="Volver">
          <BackIcon />
        </button>
        <div className="flex items-center gap-1">
          <button className="btn-ghost px-3 py-2 text-xs" onClick={() => setShowPicker(true)}>
            <SwapIcon size={16} /> Cambiar
          </button>
          <button className="icon-btn" onClick={() => setShowEdit(true)} aria-label="Editar">
            <EditIcon size={19} />
          </button>
          <button className="icon-btn text-rose-500" onClick={() => setConfirmDelete(true)} aria-label="Eliminar">
            <TrashIcon size={19} />
          </button>
        </div>
      </header>

      <section className="animate-slide-up card mb-4 p-5 text-center">
        <div className="flex flex-col items-center">
          <Avatar name={client.name} size={64} />
          <h1 className="mt-3 text-xl font-bold text-slate-900">{client.name}</h1>
          {client.phone && <p className="text-sm text-slate-400">{client.phone}</p>}
          {client.note && <p className="mt-1 text-xs text-slate-400">{client.note}</p>}
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Deuda pendiente</p>
        <p className={`text-4xl font-extrabold tracking-tight ${client.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
          {formatClp(client.balance)}
        </p>
        {client.balance === 0 && <span className="chip mt-2 bg-emerald-100 text-emerald-700">Al día 🎉</span>}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="btn-primary py-3.5" onClick={() => setShowAbono(true)} disabled={client.balance <= 0}>
            <MoneyIcon size={18} /> Abonar
          </button>
          <button className="btn-soft py-3.5" onClick={() => navigate(`/pos/${client.id}`)}>
            <CartIcon size={18} /> Agregar fiado
          </button>
        </div>

        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Enviar por WhatsApp</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="btn py-3 text-white shadow-sm"
              style={{ backgroundColor: '#25D366' }}
              onClick={() => sendMessage('summary')}
            >
              <WhatsappIcon size={18} /> Resumido
            </button>
            <button className="btn-ghost py-3" onClick={() => sendMessage('full')}>
              <WhatsappIcon size={18} /> Completo
            </button>
          </div>
        </div>

        <button className="btn-ghost mt-3 w-full py-3" onClick={() => setShowPicker(true)}>
          <SwapIcon size={18} /> Cambiar cliente
        </button>
      </section>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Historial</h2>
        {movements.length > 0 && (
          <button
            className="btn-ghost px-2 py-1 text-xs text-slate-400 hover:text-rose-500"
            onClick={() => setConfirmClearHistory(true)}
          >
            <TrashIcon size={13} /> Borrar todo
          </button>
        )}
      </div>
      {movements.length === 0 ? (
        <div className="card flex flex-col items-center gap-1 py-10 text-slate-400">
          <ReceiptIcon size={32} />
          <p>Sin movimientos aún</p>
        </div>
      ) : (
        <div className="space-y-5 pb-4">
          {Object.entries(groups).map(([month, items]) => (
            <div key={month}>
              <p className="mb-1.5 px-1 text-xs font-semibold text-slate-400">{month}</p>
              <ul className="card divide-y divide-slate-100 overflow-hidden">
                {items.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-3.5 py-3">
                    <MovementIcon type={m.type} amount={m.amount} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {(m.description || 'Movimiento').replace(/^Compra:\s*/, '').replace(/^Abono:\s*/, '')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatShortDate(m.occurred_at)}
                        {m.type === 'adjustment' ? ' · saldo inicial' : m.amount < 0 ? ' · abono' : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-bold ${m.amount < 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {m.amount < 0 ? '−' : '+'}
                      {formatClp(Math.abs(m.amount))}
                    </span>
                    <button
                      className="icon-btn h-8 w-8 text-slate-300 hover:text-rose-500"
                      onClick={() => setMovementToDelete(m)}
                      aria-label="Eliminar"
                    >
                      <TrashIcon size={15} />
                    </button>
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
      <ClientFormModal open={showEdit} client={client as Client} onClose={() => setShowEdit(false)} onSaved={refresh} />
      <ClientPickerModal
        open={showPicker}
        currentId={client.id}
        onClose={() => setShowPicker(false)}
        onSelect={(c) => navigate(`/clientes/${c.id}`)}
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
        open={confirmClearHistory}
        title="Borrar historial"
        message={
          client.balance > 0
            ? `¿Borrar todo el historial de ${client.name}? Se eliminarán ${movements.length} movimientos y su deuda de ${formatClp(client.balance)} quedará en $0. Esta acción no se puede deshacer.`
            : `¿Borrar todo el historial de ${client.name}? Se eliminarán ${movements.length} movimientos. Esta acción no se puede deshacer.`
        }
        confirmLabel="Borrar historial"
        destructive
        onConfirm={clearHistory}
        onClose={() => setConfirmClearHistory(false)}
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
