import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { LibretaPage } from './pages/LibretaPage';
import { ClientPage } from './pages/ClientPage';
import { PosPage } from './pages/PosPage';
import { InventarioPage } from './pages/InventarioPage';
import { ConfigPage } from './pages/ConfigPage';
import { CatalogoPage } from './pages/CatalogoPage';

function Splash() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { authed, loading } = useAuth();
  if (loading) return <Splash />;
  if (!authed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/catalogo" element={<CatalogoPage />} />

      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/" element={<Navigate to="/libreta" replace />} />
        <Route path="/libreta" element={<LibretaPage />} />
        <Route path="/clientes/:id" element={<ClientPage />} />
        <Route path="/inventario" element={<InventarioPage />} />
        <Route path="/config" element={<ConfigPage />} />
      </Route>

      {/* POS a pantalla completa (sin nav inferior) para no tapar el carrito */}
      <Route
        path="/pos"
        element={
          <Protected>
            <PosPage />
          </Protected>
        }
      />
      <Route
        path="/pos/:clientId"
        element={
          <Protected>
            <PosPage />
          </Protected>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
