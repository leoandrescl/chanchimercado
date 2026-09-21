import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../lib/api';
import { formatClp, todayInput } from '../lib/format';
import { useToast } from '../lib/toast';
import { MoneyIcon } from './icons';

interface Props {
  open: boolean;
  clientId: string;
  clientName: string;
  balance: number;
  onClose: () => void;
  onSaved: () => void;
}

export function AbonoModal({ open, clientId, clientName, balance, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayInput());
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setAmount('');
      setNote('');
      setDate(todayInput());
    }
  }, [open]);

  const numeric = Number(amount.replace(/[^\d]/g, '')) || 0;
  const remaining = Math.max(0, balance - numeric);

  const save = async () => {
    if (numeric <= 0) {
      toast.show('Ingresa un monto mayor a cero', 'error');
      return;
    }
    if (numeric > balance) {
      toast.show('El abono no puede ser mayor que la deuda', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/clients/${clientId}/payments`, {
        amount: numeric,
        note: note.trim() || undefined,
        occurred_at: date,
      });
      toast.show('Abono registrado', 'success');
      onSaved();
      onClose();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo registrar', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Registrar abono"
      onClose={onClose}
      footer={
        <button className="btn-primary w-full py-3.5" onClick={save} disabled={busy}>
          <MoneyIcon size={19} />
          {busy ? 'Guardando...' : `Abonar ${numeric > 0 ? formatClp(numeric) : ''}`}
        </button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-center ring-1 ring-amber-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700/80">{clientName} debe</p>
          <p className="text-3xl font-extrabold text-amber-800">{formatClp(balance)}</p>
        </div>

        <div>
          <label className="label">Monto del abono</label>
          <input
            className="input text-center text-3xl font-extrabold tracking-tight"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="$0"
            inputMode="numeric"
            autoFocus
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            {[1000, 2000, 5000, 10000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String((Number(amount) || 0) + v))}
                className="chip bg-slate-100 text-slate-600 active:bg-slate-200"
              >
                +{formatClp(v)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(String(balance))}
              className="chip bg-emerald-100 text-emerald-700 active:bg-emerald-200"
            >
              Todo
            </button>
          </div>
        </div>

        {numeric > 0 && numeric <= balance && (
          <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
            <span className="text-sm font-medium text-emerald-800">Quedará debiendo</span>
            <span className="text-lg font-bold text-emerald-700">{formatClp(remaining)}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Nota (opcional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: efectivo" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
