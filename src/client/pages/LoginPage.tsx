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

  const attempt = async (value: string) => {
    setBusy(true);
    setError('');
    try {
      await login(value);
      navigate('/libreta', { replace: true });
    } catch {
      setError('PIN incorrecto');
      setPin('');
      toast.show('PIN incorrecto', 'error');
    } finally {
      setBusy(false);
    }
  };

  const press = (digit: string) => {
    if (busy || pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError('');
    if (next.length === 4) setTimeout(() => attempt(next), 90);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-xs">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-4xl shadow-lg shadow-emerald-900/20">
            🐷
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">ChanchiMercado</h1>
          <p className="mt-1 text-sm text-slate-500">Ingresa el PIN para continuar</p>
        </div>

        <div className="card p-5">
          <div className={`mb-5 flex justify-center gap-3 ${error ? 'animate-pulse' : ''}`}>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-4 w-4 rounded-full transition-colors ${
                  error ? 'bg-rose-300' : pin.length > i ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {keys.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => press(k)}
                className="rounded-2xl bg-slate-50 py-4 text-xl font-bold text-slate-800 ring-1 ring-slate-100 transition active:scale-95 active:bg-slate-100"
              >
                {k}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPin('');
                setError('');
              }}
              className="rounded-2xl bg-slate-100 py-4 text-xs font-semibold text-slate-500 active:scale-95"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => press('0')}
              className="rounded-2xl bg-slate-50 py-4 text-xl font-bold text-slate-800 ring-1 ring-slate-100 active:scale-95 active:bg-slate-100"
            >
              0
            </button>
            <button
              type="button"
              disabled={busy || pin.length === 0}
              onClick={() => attempt(pin)}
              className="rounded-2xl bg-emerald-600 py-4 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
            >
              {busy ? '...' : 'Entrar'}
            </button>
          </div>

          {error && <p className="mt-4 text-center text-sm font-semibold text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
