import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatClp } from '../lib/format';
import { ProductFormModal } from '../components/ProductFormModal';
import { ConfirmDialog } from '../components/Modal';
import { useToast } from '../lib/toast';
import { ArrowDownIcon, ArrowUpIcon, BoxIcon, EditIcon, EyeIcon, EyeOffIcon, PlusIcon, TrashIcon } from '../components/icons';
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

  const visibles = products.filter((p) => p.is_visible).length;

  return (
    <div className="px-4 pt-5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500">
            {products.length} en total · {visibles} visibles
          </p>
        </div>
        <button
          className="btn-primary px-3.5 py-2.5"
          onClick={() => {
            setEditing(undefined);
            setShowForm(true);
          }}
        >
          <PlusIcon size={18} /> Nuevo
        </button>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-[68px] animate-pulse bg-white/60" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-slate-400">
          <BoxIcon size={40} />
          <p>Aún no hay productos</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {products.map((p, i) => (
            <li key={p.id} className="card flex items-center gap-3 p-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <span className="text-xl opacity-40">🛒</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">{p.name}</p>
                <p className="text-sm text-slate-500">{p.is_free_amount ? 'Monto libre' : formatClp(p.price)}</p>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <button className="icon-btn h-9 w-9" onClick={() => move(i, -1)} aria-label="Subir">
                  <ArrowUpIcon size={16} />
                </button>
                <button className="icon-btn h-9 w-9" onClick={() => move(i, 1)} aria-label="Bajar">
                  <ArrowDownIcon size={16} />
                </button>
                <button
                  className={`icon-btn h-9 w-9 ${p.is_visible ? 'text-emerald-600' : 'text-slate-300'}`}
                  onClick={() => toggleVisible(p)}
                  aria-label="Visibilidad"
                >
                  {p.is_visible ? <EyeIcon size={17} /> : <EyeOffIcon size={17} />}
                </button>
                <button
                  className="icon-btn h-9 w-9"
                  onClick={() => {
                    setEditing(p);
                    setShowForm(true);
                  }}
                  aria-label="Editar"
                >
                  <EditIcon size={17} />
                </button>
                <button className="icon-btn h-9 w-9 text-rose-500" onClick={() => setToDelete(p)} aria-label="Eliminar">
                  <TrashIcon size={17} />
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
