import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import type { Product } from '@shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  product?: Product;
  onSaved: () => void;
}

export function ProductFormModal({ open, onClose, product, onSaved }: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? '');
    setPrice(product ? String(product.price) : '');
    setCategory(product?.category ?? '');
    setIsFree(Boolean(product?.is_free_amount));
    setIsVisible(product ? Boolean(product.is_visible) : true);
    setFile(null);
    setPreview(product?.image_url ?? null);
  }, [open, product]);

  const onFile = (f: File | null) => {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.show('El nombre es obligatorio', 'error');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set('name', name.trim());
      form.set('price', isFree ? '0' : String(Number(price.replace(/\D/g, '')) || 0));
      form.set('category', category.trim());
      form.set('is_free_amount', isFree ? '1' : '0');
      form.set('is_visible', isVisible ? '1' : '0');
      if (file) form.set('image', file);

      if (product) {
        await api.patchForm(`/api/products/${product.id}`, form);
      } else {
        await api.postForm('/api/products', form);
      }
      toast.show(product ? 'Producto actualizado' : 'Producto creado', 'success');
      onSaved();
      onClose();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'No se pudo guardar', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={product ? 'Editar producto' : 'Nuevo producto'}
      onClose={onClose}
      footer={
        <button className="btn-primary w-full" onClick={submit} disabled={busy}>
          {busy ? 'Guardando...' : 'Guardar'}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
            {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <span className="text-2xl">🖼️</span>}
          </div>
          <label className="btn-ghost cursor-pointer text-sm">
            Elegir foto
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <div>
          <label className="label">Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Sopaipilla" />
        </div>

        <div>
          <label className="label">Categoría</label>
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej: Panadería" />
        </div>

        {!isFree && (
          <div>
            <label className="label">Precio</label>
            <input
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              inputMode="numeric"
            />
          </div>
        )}

        <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="h-5 w-5" />
          <span className="text-sm text-slate-700">Se vende con monto libre (ej: Queso)</span>
        </label>

        <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} className="h-5 w-5" />
          <span className="text-sm text-slate-700">Visible en el catálogo público</span>
        </label>
      </div>
    </Modal>
  );
}
