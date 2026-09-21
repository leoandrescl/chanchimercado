import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatClp } from '../lib/format';
import { Modal } from '../components/Modal';
import { useToast } from '../lib/toast';
import type { CartItem, Client, Product } from '@shared/types';

export function PosPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [selectedId, setSelectedId] = useState(clientId ?? '');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(!clientId);
  const [freeOpen, setFreeOpen] = useState(false);
  const [freeAmount, setFreeAmount] = useState('');
  const [freeName, setFreeName] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ clients: Client[] }>('/api/clients'),
  });
  const clients = clientsData?.clients ?? [];

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<{ products: Product[] }>('/api/products'),
  });
  const products = (productsData?.products ?? []).filter((p) => p.is_visible);

  const client = clients.find((c) => c.id === selectedId);

  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);

  const addProduct = (p: Product) => {
    if (p.is_free_amount) {
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === p.id);
        if (existing) return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
        return [...prev, { productId: p.id, name: p.name, price: 0, quantity: 1 }];
      });
      toast.show('Edita el monto en el carrito', 'info');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { productId: p.id, name: p.name, price: p.price, quantity: 1 }];
    });
  };

  const setQty = (productId: string, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i))
    );
  };

  const setPrice = (productId: string, price: number) => {
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, price } : i)));
  };

  const addFreeAmount = () => {
    const amount = Number(freeAmount.replace(/\D/g, '')) || 0;
    if (amount <= 0) {
      toast.show('Ingresa un monto', 'error');
      return;
    }
    const name = freeName.trim() || 'Monto libre';
    setCart((prev) => [...prev, { productId: `free-${Date.now()}`, name, price: amount, quantity: 1 }]);
    setFreeAmount('');
    setFreeName('');
    setFreeOpen(false);
  };

  const checkout = async () => {
    if (!selectedId) {
      toast.show('Selecciona un cliente', 'error');
      setPickerOpen(true);
      return;
    }
    if (cart.length === 0 || total <= 0) {
      toast.show('El carrito está vacío', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/clients/${selectedId}/purchases`, {
        items: cart.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      });
      toast.show(`Fiado registrado: ${formatClp(total)}`, 'success');
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client', selectedId] });
      setCart([]);
      navigate(`/clientes/${selectedId}`);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo registrar', 'error');
    } finally {
      setBusy(false);
    }
  };

  const filteredClients = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">Fiado para</p>
          <button className="truncate text-left font-semibold text-slate-900" onClick={() => setPickerOpen(true)}>
            {client ? client.name : 'Seleccionar cliente'} ▾
          </button>
        </div>
        <button className="btn-ghost text-sm" onClick={() => setFreeOpen(true)}>
          Monto libre
        </button>
      </header>

      <div className="flex-1 px-4 py-3">
        {products.length === 0 ? (
          <p className="py-10 text-center text-slate-400">No hay productos. Agrégalos en Productos.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="card flex flex-col overflow-hidden text-left transition active:scale-[0.98]"
              >
                <div className="flex h-20 items-center justify-center bg-slate-50">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl">🛒</span>
                  )}
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 text-sm font-medium text-slate-800">{p.name}</p>
                  <p className="text-sm font-bold text-emerald-700">
                    {p.is_free_amount ? 'Monto libre' : formatClp(p.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="safe-bottom sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3">
          <div className="mb-2 max-h-40 space-y-2 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-2">
                <span className="flex-1 truncate text-sm text-slate-700">{item.name}</span>
                {item.price === 0 ? (
                  <input
                    className="w-24 rounded-lg bg-slate-100 px-2 py-1 text-right text-sm"
                    placeholder="Monto"
                    inputMode="numeric"
                    onChange={(e) => setPrice(item.productId, Number(e.target.value.replace(/\D/g, '')) || 0)}
                  />
                ) : (
                  <span className="text-sm text-slate-500">{formatClp(item.price)}</span>
                )}
                <div className="flex items-center gap-1">
                  <button className="h-7 w-7 rounded-lg bg-slate-100 font-bold" onClick={() => setQty(item.productId, item.quantity - 1)}>
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button className="h-7 w-7 rounded-lg bg-slate-100 font-bold" onClick={() => setQty(item.productId, item.quantity + 1)}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-primary w-full py-3 text-base" onClick={checkout} disabled={busy}>
            {busy ? 'Registrando...' : `Registrar fiado · ${formatClp(total)}`}
          </button>
        </div>
      )}

      <Modal open={pickerOpen} title="Seleccionar cliente" onClose={() => setPickerOpen(false)}>
        <input
          className="input mb-3"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <ul className="space-y-2">
          {filteredClients.map((c) => (
            <li key={c.id}>
              <button
                className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left"
                onClick={() => {
                  setSelectedId(c.id);
                  setPickerOpen(false);
                  setSearch('');
                }}
              >
                <span className="font-medium text-slate-800">{c.name}</span>
                <span className="text-sm text-slate-500">{formatClp(c.balance)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={freeOpen}
        title="Monto libre"
        onClose={() => setFreeOpen(false)}
        footer={
          <button className="btn-primary w-full" onClick={addFreeAmount}>
            Agregar
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Descripción</label>
            <input className="input" value={freeName} onChange={(e) => setFreeName(e.target.value)} placeholder="Ej: Queso, ajuste..." />
          </div>
          <div>
            <label className="label">Monto</label>
            <input
              className="input text-center text-2xl font-bold"
              value={freeAmount}
              onChange={(e) => setFreeAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              inputMode="numeric"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
