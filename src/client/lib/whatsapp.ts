import type { Movement } from '@shared/types';
import { formatClp, formatShortDate, monthLabel, normalizePhone } from './format';

export interface AccountStatement {
  name: string;
  phone: string | null;
  balance: number;
  movements: Movement[];
}

export function buildAccountMessage({ name, balance, movements }: AccountStatement): string {
  const lines: string[] = [];
  lines.push(`Hola ${name}, te dejo el estado de tu cuenta en ChanchiMercado:`);
  lines.push('');

  const byMonth = new Map<string, Movement[]>();
  for (const m of [...movements].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))) {
    const label = monthLabel(m.occurred_at);
    if (!byMonth.has(label)) byMonth.set(label, []);
    byMonth.get(label)!.push(m);
  }

  for (const [label, items] of byMonth) {
    lines.push(`*${label}*`);
    for (const m of items) {
      const sign = m.amount < 0 ? '-' : '';
      const icon = m.amount < 0 ? 'Pago' : 'Compra';
      const desc = (m.description || icon).replace(/^Compra:\s*/, '').replace(/^Abono:\s*/, '');
      lines.push(`- [${formatShortDate(m.occurred_at)}] ${icon}: ${desc} ${sign}${formatClp(Math.abs(m.amount))}`);
    }
    lines.push('');
  }

  lines.push('--------------------------');
  lines.push(`*TOTAL PENDIENTE: ${formatClp(balance)}*`);
  lines.push('--------------------------');
  lines.push('');
  lines.push('¡Muchas gracias por su preferencia!');

  return lines.join('\n');
}

export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const normalized = normalizePhone(phone);
  const text = encodeURIComponent(message);
  if (normalized) return `https://wa.me/${normalized}?text=${text}`;
  return `https://wa.me/?text=${text}`;
}

export interface OrderLine {
  name: string;
  quantity: number;
  price: number;
}

export const STORE_PHONE = '56968067937';

export function buildOrderMessage(items: OrderLine[], total: number): string {
  const lines: string[] = [];
  lines.push('*¡Hola! Quisiera hacer un pedido:*');
  lines.push('');
  for (const item of items) {
    lines.push(`* ${item.name} (x${item.quantity}) - ${formatClp(item.price * item.quantity)}`);
  }
  lines.push('--------------------------');
  lines.push(`*TOTAL A PAGAR: ${formatClp(total)}*`);
  lines.push('--------------------------');
  lines.push(`Fecha: ${new Date().toLocaleDateString('es-CL')}`);
  lines.push('');
  lines.push('Muchas gracias.');
  return lines.join('\n');
}

export function orderWhatsappLink(message: string): string {
  return `https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(message)}`;
}
