import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import { BookIcon, DownloadIcon, LogoutIcon, SparkleIcon } from '../components/icons';

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

  const cloudBackup = async () => {
    setBusy(true);
    try {
      await api.post('/api/backup/run');
      toast.show('Respaldo guardado en la nube', 'success');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  const doLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="px-4 pt-5">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight text-slate-900">Ajustes</h1>

      <div className="card mb-4 divide-y divide-slate-100 overflow-hidden">
        <button className="flex w-full items-center gap-3 px-4 py-4 text-left transition active:bg-slate-50" onClick={exportBackup} disabled={busy}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <DownloadIcon size={19} />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-slate-800">Descargar respaldo</span>
            <span className="block text-sm text-slate-500">Clientes, movimientos y productos (JSON)</span>
          </span>
        </button>

        <button className="flex w-full items-center gap-3 px-4 py-4 text-left transition active:bg-slate-50" onClick={cloudBackup} disabled={busy}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <SparkleIcon size={19} />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-slate-800">Respaldar en la nube</span>
            <span className="block text-sm text-slate-500">Guarda una copia ahora en Cloudflare</span>
          </span>
        </button>

        <Link to="/catalogo" className="flex w-full items-center gap-3 px-4 py-4 text-left transition active:bg-slate-50">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <BookIcon size={19} />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-slate-800">Ver catálogo público</span>
            <span className="block text-sm text-slate-500">Lo que ven los clientes</span>
          </span>
        </Link>

        <button className="flex w-full items-center gap-3 px-4 py-4 text-left transition active:bg-rose-50" onClick={doLogout}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <LogoutIcon size={19} />
          </span>
          <span className="font-semibold text-rose-600">Cerrar sesión</span>
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">ChanchiMercado v2 · Cloudflare Workers + D1</p>
    </div>
  );
}
