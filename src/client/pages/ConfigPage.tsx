import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';

export function ConfigPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const exportBackup = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/export');
      if (!res.ok) throw new Error('No se pudo exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chanchimercado-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.show('Respaldo descargado', 'success');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  const doLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="px-4 pt-5">
      <h1 className="mb-4 text-xl font-bold text-slate-900">Ajustes</h1>

      <div className="card divide-y divide-slate-100">
        <button className="flex w-full items-center justify-between px-4 py-4 text-left" onClick={exportBackup} disabled={busy}>
          <div>
            <p className="font-medium text-slate-800">Descargar respaldo</p>
            <p className="text-sm text-slate-500">Todos los clientes, movimientos y productos en JSON</p>
          </div>
          <span className="text-slate-400">↓</span>
        </button>

        <Link to="/catalogo" className="flex w-full items-center justify-between px-4 py-4 text-left">
          <div>
            <p className="font-medium text-slate-800">Ver catálogo público</p>
            <p className="text-sm text-slate-500">Lo que ven los clientes</p>
          </div>
          <span className="text-slate-400">→</span>
        </Link>

        <button className="flex w-full items-center justify-between px-4 py-4 text-left" onClick={doLogout}>
          <p className="font-medium text-rose-600">Cerrar sesión</p>
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">ChanchiMercado v2 · en Cloudflare</p>
    </div>
  );
}
