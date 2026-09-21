import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import type { Client } from '@shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  client?: Client;
  onSaved: (client?: Client) => void;
}

export function ClientFormModal({ open, onClose, client, onSaved }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setName(client?.name ?? '');
      setPhone(client?.phone ?? '');
      setNote(client?.note ?? '');
    }
  }, [open, client]);

  const submit = async () => {
    if (!name.trim()) {
      toast.show('El nombre es obligatorio', 'error');
      return;
    }
    setBusy(true);
    try {
      if (client) {
        await api.patch(`/api/clients/${client.id}`, { name: name.trim(), phone: phone.trim(), note: note.trim() });
        toast.show('Cliente actualizado', 'success');
      } else {
        await api.post('/api/clients', { name: name.trim(), phone: phone.trim(), note: note.trim() });
        toast.show('Cliente creado', 'success');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo guardar', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={client ? 'Editar cliente' : 'Nuevo cliente'}
      onClose={onClose}
      footer={
        <button className="btn-primary w-full" onClick={submit} disabled={busy}>
          {busy ? 'Guardando...' : 'Guardar'}
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: María López" autoFocus />
        </div>
        <div>
          <label className="label">WhatsApp (opcional)</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+56912345678"
            inputMode="tel"
          />
        </div>
        <div>
          <label className="label">Nota (opcional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: vecina del 2" />
        </div>
      </div>
    </Modal>
  );
}
