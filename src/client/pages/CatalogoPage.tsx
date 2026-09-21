import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatClp } from '../lib/format';
import { buildOrderMessage, orderWhatsappLink } from '../lib/whatsapp';
import type { Product } from '@shared/types';

interface Line {
  name: string;
  price: number;
  quantity: number;
}

export function CatalogoPage() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Line[]>([]);

  const { data } = useQuery({
    queryKey: ['public-products'],
    queryFn: () => api.get<{ products: Product[] }>('/api/public/products'),
  });
  const products = data?.products ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q));
  }, [products, search]);

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const add = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.name === p.name);
      if (existing) return prev.map((i) => (i.name === p.name ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { name: p.name, price: p.price, quantity: 1 }];
    });
  };

  const setQty = (name: string, qty: number) => {
    setCart((prev) => (qty <= 0 ? prev.filter((i) => i.name !== name) : prev.map((i) => (i.name === name ? { ...i, quantity: qty } : i))));
  };

  const order = async () => {
    if (cart.length === 0) return;
    try {
      await api.post('/api/public/orders', { items: cart, total });
    } catch {
      /* el pedido por WhatsApp es lo importante */
    }
    const link = orderWhatsappLink(buildOrderMessage(cart, total));
    window.open(link, '_blank');
    setCart([]);
  };

  return (
    <div className="mx-auto min-h-full max-w-2xl pb-28">
      <header className="sticky top-0 z-10 bg-slate-900 px-4 py-4 text-white">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐷</span>
          <div>
            <h1 className="text-lg font-bold">ChanchiMercado</h1>
            <p className="text-xs text-slate-300">Haz tu pedido y retira en el local</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-3">
        <input className="input" placeholder="Buscar productos..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-slate-400">No hay productos disponibles</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => add(p)} className="card overflow-hidden text-left transition active:scale-[0.98]">
              <div className="flex h-24 items-center justify-center bg-slate-50">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <span className="text-3xl">🛒</span>}
              </div>
              <div className="p-2.5">
                <p className="line-clamp-2 text-sm font-medium text-slate-800">{p.name}</p>
                <p className="text-sm font-bold text-emerald-700">{formatClp(p.price)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-4 py-3">
          <div className="mx-auto max-w-2xl">
            <div className="mb-2 max-h-40 space-y-2 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm text-slate-700">{item.name}</span>
                  <span className="text-sm text-slate-500">{formatClp(item.price)}</span>
                  <div className="flex items-center gap-1">
                    <button className="h-7 w-7 rounded-lg bg-slate-100 font-bold" onClick={() => setQty(item.name, item.quantity - 1)}>
                      −
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button className="h-7 w-7 rounded-lg bg-slate-100 font-bold" onClick={() => setQty(item.name, item.quantity + 1)}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-primary w-full py-3 text-base" onClick={order}>
              Pedir por WhatsApp · {formatClp(total)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
