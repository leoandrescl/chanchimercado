import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../lib/api';
import { formatClp, todayInput } from '../lib/format';
import { useToast } from '../lib/toast';

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
      title={`Abonar a ${clientName}`}
      onClose={onClose}
      footer={
        <button className="btn-primary w-full" onClick={save} disabled={busy}>
          {busy ? 'Guardando...' : `Abonar ${numeric > 0 ? formatClp(numeric) : ''}`}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-center">
          <p className="text-xs text-amber-700">Deuda actual</p>
          <p className="text-xl font-bold text-amber-800">{formatClp(balance)}</p>
        </div>

        <div>
          <label className="label">Monto del abono</label>
          <input
            className="input text-center text-2xl font-bold"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="0"
            inputMode="numeric"
            autoFocus
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[1000, 2000, 5000, 10000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String((Number(amount) || 0) + v))}
                className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600"
              >
                +{formatClp(v)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(String(balance))}
              className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600"
            >
              Todo
            </button>
          </div>
        </div>

        <div>
          <label className="label">Fecha</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div>
          <label className="label">Nota (opcional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: pagó en efectivo" />
        </div>
      </div>
    </Modal>
  );
}
