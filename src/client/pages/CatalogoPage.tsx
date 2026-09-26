import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatClp } from '../lib/format';
import { buildOrderMessage, orderWhatsappLink } from '../lib/whatsapp';
import { SearchIcon, WhatsappIcon } from '../components/icons';
import { CartPanel } from '../components/CartPanel';
import type { Product } from '@shared/types';

interface Line {
  name: string;
  price: number;
  quantity: number;
}

export function CatalogoPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [cart, setCart] = useState<Line[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['public-products'],
    queryFn: () => api.get<{ products: Product[] }>('/api/public/products'),
  });
  const products = data?.products ?? [];

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter((c): c is string => !!c))],
    [products]
  );

  // Barra de categorias: scroll horizontal con flechas (en escritorio no hay swipe).
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [canScrollFilters, setCanScrollFilters] = useState({ left: false, right: false });
  const updateFilterScroll = useCallback(() => {
    const el = filterBarRef.current;
    if (!el) return;
    setCanScrollFilters({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);
  useEffect(updateFilterScroll, [updateFilterScroll, categories]);
  const scrollFilters = (dir: -1 | 1) => {
    filterBarRef.current?.scrollBy({ left: dir * 260, behavior: 'smooth' });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) => (!category || p.category === category) && (!q || p.name.toLowerCase().includes(q))
    );
  }, [products, search, category]);

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
    window.open(orderWhatsappLink(buildOrderMessage(cart, total)), '_blank');
    setCart([]);
  };

  return (
    <div className="mx-auto min-h-full max-w-2xl pb-32">
      <header className="sticky top-0 z-10 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 px-4 pb-5 pt-6 text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-2xl" />
        <div className="flex items-center gap-3">
          <span className="text-3xl">🐷</span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">ChanchiMercado</h1>
            <p className="text-xs text-slate-300">Haz tu pedido y retíralo en el local</p>
          </div>
        </div>
        <div className="relative mt-4">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="input border-0 pl-10 ring-0 shadow-inner"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {categories.length > 0 && (
        <div className="relative flex items-center">
          <div
            ref={filterBarRef}
            onScroll={updateFilterScroll}
            className="no-scrollbar flex w-full gap-2 overflow-x-auto px-4 py-3"
          >
            <button
              className={`chip shrink-0 ${!category ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
              onClick={() => setCategory('')}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`chip shrink-0 ${category === c ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          {/* Desvanecidos que indican que hay mas categorias fuera de vista */}
          <div
            className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-100 to-transparent transition-opacity ${canScrollFilters.left ? 'opacity-100' : 'opacity-0'}`}
          />
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-slate-100 to-transparent transition-opacity ${canScrollFilters.right ? 'opacity-100' : 'opacity-0'}`}
          />
          <button
            type="button"
            aria-label="Categorías anteriores"
            onClick={() => scrollFilters(-1)}
            className={`absolute left-1 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-600 shadow-md ring-1 ring-slate-200 transition active:scale-95 ${canScrollFilters.left ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Más categorías"
            onClick={() => scrollFilters(1)}
            className={`absolute right-1 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-600 shadow-md ring-1 ring-slate-200 transition active:scale-95 ${canScrollFilters.right ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            ›
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card h-44 animate-pulse bg-white/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
          <span className="text-4xl">🛒</span>
          <p>No hay productos disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => add(p)} className="card overflow-hidden text-left transition active:scale-[0.97]">
              <div className="flex aspect-square w-full items-center justify-center bg-slate-50">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-4xl opacity-40">🛒</span>
                )}
              </div>
              <div className="p-2.5">
                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight text-slate-800">{p.name}</p>
                <p className="mt-0.5 font-bold text-emerald-700">{formatClp(p.price)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20">
          <CartPanel
            wrapperClassName="mx-auto max-w-2xl"
            items={cart.map((i) => ({ key: i.name, name: i.name, price: i.price, quantity: i.quantity }))}
            onQty={(name, qty) => setQty(name, qty)}
            onRemove={(name) => setQty(name, 0)}
          >
            <button className="btn w-full py-3.5 text-base text-white shadow-sm" style={{ backgroundColor: '#25D366' }} onClick={order}>
              <WhatsappIcon size={20} /> Pedir por WhatsApp · {formatClp(total)}
            </button>
          </CartPanel>
        </div>
      )}
    </div>
  );
}
