import type { ReactNode } from 'react';
import { CloseIcon } from './icons';
import { formatClp } from '../lib/format';

export interface CartPanelItem {
  key: string;
  name: string;
  price: number;
  quantity: number;
  /** Si es true, el precio se puede editar en la fila (monto libre). */
  editablePrice?: boolean;
}

interface CartPanelProps {
  items: CartPanelItem[];
  /** Clases extra para posicionar el panel (ej. fixed en el catalogo). */
  wrapperClassName?: string;
  onQty: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  onPrice?: (key: string, price: number) => void;
  /** Boton de accion principal (registrar fiado / pedir por WhatsApp). */
  children: ReactNode;
}

export function CartPanel({ items, wrapperClassName = '', onQty, onRemove, onPrice, children }: CartPanelProps) {
  return (
    <div
      className={`safe-bottom-3 z-30 border-t border-slate-200/80 bg-white/95 px-3 pt-2 pb-3 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.25)] backdrop-blur-xl ${wrapperClassName}`}
    >
      <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-slate-200" />
      <div className="max-h-56 space-y-1.5 overflow-y-auto py-1">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-2 rounded-2xl bg-slate-50 px-2 py-1.5 ring-1 ring-slate-100"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
              {item.editablePrice && onPrice ? (
                <input
                  className="mt-1 w-28 rounded-lg bg-white px-2 py-1 text-sm font-bold text-emerald-700 ring-1 ring-slate-200"
                  placeholder="Monto"
                  inputMode="numeric"
                  autoFocus
                  onChange={(e) => onPrice(item.key, Number(e.target.value.replace(/\D/g, '')) || 0)}
                />
              ) : (
                <p className="text-xs font-semibold text-slate-400">{formatClp(item.price)} c/u</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-white p-0.5 shadow-sm ring-1 ring-slate-200">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-slate-500 transition active:scale-90 active:bg-slate-100"
                onClick={() => onQty(item.key, item.quantity - 1)}
                aria-label="Quitar uno"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-extrabold text-slate-800">{item.quantity}</span>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-emerald-600 transition active:scale-90 active:bg-emerald-50"
                onClick={() => onQty(item.key, item.quantity + 1)}
                aria-label="Agregar uno"
              >
                +
              </button>
            </div>
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 ring-1 ring-transparent transition hover:bg-rose-50 hover:text-rose-500 hover:ring-rose-200 active:scale-90"
              onClick={() => onRemove(item.key)}
              aria-label="Quitar del carrito"
            >
              <CloseIcon size={15} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}
