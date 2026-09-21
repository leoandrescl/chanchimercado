import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';

export function LoginPage() {
  const { authed, login, loading } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  if (!loading && authed) return <Navigate to="/libreta" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setBusy(true);
    setError('');
    try {
      await login(pin);
      navigate('/libreta', { replace: true });
    } catch {
      setError('PIN incorrecto');
      setPin('');
      toast.show('PIN incorrecto', 'error');
    } finally {
      setBusy(false);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const press = (digit: string) => {
    if (pin.length >= 6) return;
    const next = pin + digit;
    setPin(next);
    setError('');
    if (next.length === 4) {
      setTimeout(() => {
        login(next)
          .then(() => navigate('/libreta', { replace: true }))
          .catch(() => {
            setError('PIN incorrecto');
            setPin('');
          });
      }, 60);
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mb-3 text-5xl">🐷</div>
        <h1 className="text-2xl font-bold text-slate-900">ChanchiMercado</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresa el PIN para continuar</p>
      </div>

      <form onSubmit={submit} className="w-full max-w-xs">
        <div className={`mb-4 flex justify-center gap-3 ${error ? 'animate-pulse' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full ${pin.length > i ? 'bg-emerald-600' : 'bg-slate-300'}`}
            />
          ))}
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className="rounded-2xl bg-white py-4 text-xl font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            className="rounded-2xl bg-slate-200 py-4 text-sm font-semibold text-slate-600 active:scale-95"
          >
            Borrar
          </button>
          <button
            type="button"
            onClick={() => press('0')}
            className="rounded-2xl bg-white py-4 text-xl font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 active:scale-95"
          >
            0
          </button>
          <button
            type="submit"
            disabled={busy || pin.length === 0}
            className="rounded-2xl bg-emerald-600 py-4 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
          >
            {busy ? '...' : 'Entrar'}
          </button>
        </div>

        {error && <p className="text-center text-sm font-medium text-rose-600">{error}</p>}
      </form>

      <a href="/catalogo" className="mt-10 text-sm font-medium text-emerald-700">
        Ver catálogo público
      </a>
    </div>
  );
}
