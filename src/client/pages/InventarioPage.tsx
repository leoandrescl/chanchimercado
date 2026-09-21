import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatClp } from '../lib/format';
import { ProductFormModal } from '../components/ProductFormModal';
import { ConfirmDialog } from '../components/Modal';
import { useToast } from '../lib/toast';
import type { Product } from '@shared/types';

export function InventarioPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>();
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<{ products: Product[] }>('/api/products'),
  });
  const products = data?.products ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ['products'] });

  const toggleVisible = async (p: Product) => {
    try {
      await api.patch(`/api/products/${p.id}`, { is_visible: !p.is_visible });
      refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.del(`/api/products/${toDelete.id}`);
      toast.show('Producto eliminado', 'success');
      refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo eliminar', 'error');
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...products];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await api.post('/api/products/reorder', { ids: next.map((p) => p.id) });
      refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  return (
    <div className="px-4 pt-5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500">{products.length} en el catálogo</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(undefined);
            setShowForm(true);
          }}
        >
          + Producto
        </button>
      </header>

      {isLoading ? (
        <p className="py-10 text-center text-slate-400">Cargando...</p>
      ) : products.length === 0 ? (
        <p className="py-10 text-center text-slate-400">Aún no hay productos</p>
      ) : (
        <ul className="space-y-2">
          {products.map((p, i) => (
            <li key={p.id} className="card flex items-center gap-3 p-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <span className="text-xl">🛒</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{p.name}</p>
                <p className="text-sm text-slate-500">{p.is_free_amount ? 'Monto libre' : formatClp(p.price)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button className="rounded-lg px-2 py-1 text-slate-400" onClick={() => move(i, -1)} aria-label="Subir">
                  ↑
                </button>
                <button className="rounded-lg px-2 py-1 text-slate-400" onClick={() => move(i, 1)} aria-label="Bajar">
                  ↓
                </button>
                <button
                  className={`rounded-lg px-2 py-1 text-xs font-semibold ${p.is_visible ? 'text-emerald-600' : 'text-slate-400'}`}
                  onClick={() => toggleVisible(p)}
                >
                  {p.is_visible ? 'Visible' : 'Oculto'}
                </button>
                <button
                  className="rounded-lg px-2 py-1 text-sm text-slate-500"
                  onClick={() => {
                    setEditing(p);
                    setShowForm(true);
                  }}
                >
                  Editar
                </button>
                <button className="rounded-lg px-2 py-1 text-sm text-rose-500" onClick={() => setToDelete(p)}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ProductFormModal open={showForm} product={editing} onClose={() => setShowForm(false)} onSaved={refresh} />
      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar producto"
        message={`¿Eliminar "${toDelete?.name ?? ''}"?`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
