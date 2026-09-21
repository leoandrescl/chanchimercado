import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatClp } from '../lib/format';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { useToast } from '../lib/toast';
import { BackIcon, CartIcon, CheckIcon, CloseIcon, SearchIcon } from '../components/icons';
import type { CartItem, Client, Product } from '@shared/types';

export function PosPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [selectedId, setSelectedId] = useState(clientId ?? '');
  const [search, setSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
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

  const goBack = () => {
    if (clientId) navigate(`/clientes/${clientId}`);
    else navigate('/libreta');
  };

  const addProduct = (p: Product) => {
    if (p.is_free_amount) {
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === p.id);
        if (existing) return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
        return [...prev, { productId: p.id, name: p.name, price: 0, quantity: 1 }];
      });
      toast.show('Escribe el monto en el carrito', 'info');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { productId: p.id, name: p.name, price: p.price, quantity: 1 }];
    });
  };

  const removeItem = (productId: string) => setCart((prev) => prev.filter((i) => i.productId !== productId));

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

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q));
  }, [products, search]);

  const filteredClients = clients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()));

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col bg-slate-100">
      <header className="z-20 border-b border-slate-200/80 bg-white/90 px-3 py-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button className="icon-btn" onClick={goBack} aria-label="Volver">
            <BackIcon />
          </button>
          <button
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-slate-100 px-3 py-2 text-left active:bg-slate-200"
            onClick={() => setPickerOpen(true)}
          >
            {client ? (
              <>
                <Avatar name={client.name} size={34} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800">{client.name}</span>
                  <span className="block text-xs text-slate-500">Debe {formatClp(client.balance)}</span>
                </span>
              </>
            ) : (
              <span className="px-1 py-1 text-sm font-medium text-slate-500">Seleccionar cliente</span>
            )}
          </button>
          <button className="btn-soft shrink-0 px-3 py-2 text-xs" onClick={() => setFreeOpen(true)}>
            Monto libre
          </button>
        </div>
      </header>

      <div className="px-3 pt-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="input pl-10"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
            <CartIcon size={40} />
            <p>No hay productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="card group overflow-hidden text-left transition active:scale-[0.97]"
              >
                <div className="relative flex h-24 items-center justify-center bg-slate-50">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-3xl opacity-40">🛒</span>
                  )}
                  <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white opacity-0 shadow transition group-active:opacity-100">
                    <PlusGlyph />
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight text-slate-800">{p.name}</p>
                  <p className="mt-0.5 text-sm font-bold text-emerald-700">
                    {p.is_free_amount ? 'Monto libre' : formatClp(p.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="safe-bottom-3 z-30 border-t border-slate-200 bg-white px-3 pt-2 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.25)]">
          <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-slate-200" />
          <div className="max-h-44 space-y-2 overflow-y-auto py-1">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-2">
                <span className="flex-1 truncate text-sm font-medium text-slate-700">{item.name}</span>
                {item.price === 0 ? (
                  <input
                    className="w-24 rounded-xl bg-slate-100 px-2 py-1.5 text-right text-sm"
                    placeholder="Monto"
                    inputMode="numeric"
                    autoFocus
                    onChange={(e) => setPrice(item.productId, Number(e.target.value.replace(/\D/g, '')) || 0)}
                  />
                ) : (
                  <span className="text-sm text-slate-500">{formatClp(item.price)}</span>
                )}
                <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-0.5">
                  <button className="h-7 w-7 rounded-lg font-bold text-slate-600" onClick={() => setQty(item.productId, item.quantity - 1)}>
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button className="h-7 w-7 rounded-lg font-bold text-slate-600" onClick={() => setQty(item.productId, item.quantity + 1)}>
                    +
                  </button>
                </div>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                  onClick={() => removeItem(item.productId)}
                  aria-label="Quitar del carrito"
                >
                  <CloseIcon size={15} />
                </button>
              </div>
            ))}
          </div>
          <button className="btn-primary mt-2 w-full py-3.5 text-base" onClick={checkout} disabled={busy}>
            {busy ? 'Registrando...' : (
              <>
                <CheckIcon size={20} /> Registrar fiado · {formatClp(total)}
              </>
            )}
          </button>
        </div>
      )}

      <Modal open={pickerOpen} title="Seleccionar cliente" onClose={() => setPickerOpen(false)}>
        <div className="relative mb-3">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="input pl-10"
            placeholder="Buscar cliente..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            autoFocus
          />
        </div>
        <ul className="space-y-2">
          {filteredClients.map((c) => (
            <li key={c.id}>
              <button
                className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-left active:bg-slate-100"
                onClick={() => {
                  setSelectedId(c.id);
                  setPickerOpen(false);
                  setClientSearch('');
                }}
              >
                <Avatar name={c.name} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-800">{c.name}</span>
                  <span className={`block text-xs font-semibold ${c.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {c.balance > 0 ? `Debe ${formatClp(c.balance)}` : 'Al día'}
                  </span>
                </span>
                {c.id === selectedId && <CheckIcon className="text-emerald-600" size={20} />}
              </button>
            </li>
          ))}
          {filteredClients.length === 0 && <p className="py-6 text-center text-slate-400">Sin resultados</p>}
        </ul>
      </Modal>

      <Modal
        open={freeOpen}
        title="Monto libre"
        onClose={() => setFreeOpen(false)}
        footer={
          <button className="btn-primary w-full" onClick={addFreeAmount}>
            Agregar al carrito
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
              className="input text-center text-3xl font-extrabold"
              value={freeAmount}
              onChange={(e) => setFreeAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="$0"
              inputMode="numeric"
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PlusGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
