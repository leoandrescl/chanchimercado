import type { Movement } from '@shared/types';
import { formatClp, formatShortDate, monthLabel, normalizePhone } from './format';

export interface AccountStatement {
  name: string;
  phone: string | null;
  balance: number;
  movements: Movement[];
}

function prettyDesc(m: Movement): string {
  return (m.description || (m.amount < 0 ? 'Abono' : 'Compra'))
    .replace(/^Compra:\s*/, '')
    .replace(/^Abono:\s*/, '')
    .replace(/^Abono Registrado\s*—?\s*/, '')
    .trim() || (m.amount < 0 ? 'Abono' : 'Compra');
}

/**
 * Elige (desde la compra mas nueva hacia atras) los cargos que suman exactamente
 * la deuda actual. La ultima compra se recorta para que el total cuadre.
 */
export function selectPendingPurchases(
  movements: Movement[],
  balance: number
): { movement: Movement; shown: number }[] {
  if (balance <= 0) return [];
  const cargos = movements
    .filter((m) => m.amount > 0)
    .sort((a, b) =>
      a.occurred_at === b.occurred_at ? b.created_at.localeCompare(a.created_at) : b.occurred_at.localeCompare(a.occurred_at)
    );

  let needed = balance;
  const selected: { movement: Movement; shown: number }[] = [];
  for (const cargo of cargos) {
    if (needed <= 0) break;
    const shown = Math.min(cargo.amount, needed);
    selected.push({ movement: cargo, shown });
    needed -= shown;
  }
  return selected.reverse();
}

/** Resumen: solo las compras (de la mas nueva hacia atras) que suman la deuda actual. */
export function buildSummaryMessage({ name, balance, movements }: AccountStatement): string {
  if (balance <= 0) {
    return `Hola ${name} 🐷\n\nTu cuenta en ChanchiMercado está *al día*. ¡Gracias por tu preferencia!`;
  }

  const selected = selectPendingPurchases(movements, balance);

  const lines: string[] = [];
  lines.push(`Hola ${name} 🐷`);
  lines.push('');
  lines.push('Este es el detalle de lo que tienes *pendiente*:');
  lines.push('');

  const byMonth = new Map<string, { movement: Movement; shown: number }[]>();
  for (const item of selected) {
    const label = monthLabel(item.movement.occurred_at);
    if (!byMonth.has(label)) byMonth.set(label, []);
    byMonth.get(label)!.push(item);
  }

  for (const [label, items] of byMonth) {
    lines.push(`*${label}*`);
    for (const { movement, shown } of items) {
      lines.push(`• [${formatShortDate(movement.occurred_at)}] ${prettyDesc(movement)} — ${formatClp(shown)}`);
    }
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push(`💰 *TOTAL PENDIENTE: ${formatClp(balance)}*`);
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('¡Muchas gracias por su preferencia!');

  return lines.join('\n');
}

/** Completo: todo el historial (compras y abonos) de todos los meses. */
export function buildAccountMessage({ name, balance, movements }: AccountStatement): string {
  const lines: string[] = [];
  lines.push(`Hola ${name} 🐷`);
  lines.push('');
  lines.push('*Detalle completo de tu cuenta:*');
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
      if (m.amount < 0) {
        lines.push(`• [${formatShortDate(m.occurred_at)}] 💰 Pago ${prettyDesc(m)} — ${formatClp(Math.abs(m.amount))}`);
      } else {
        lines.push(`• [${formatShortDate(m.occurred_at)}] ${prettyDesc(m)} — ${formatClp(m.amount)}`);
      }
    }
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push(`💰 *TOTAL PENDIENTE: ${formatClp(balance)}*`);
  lines.push('━━━━━━━━━━━━━━━━━━');
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
    lines.push(`• ${item.name} (x${item.quantity}) — ${formatClp(item.price * item.quantity)}`);
  }
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push(`*TOTAL: ${formatClp(total)}*`);
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push(`Fecha: ${new Date().toLocaleDateString('es-CL')}`);
  lines.push('');
  lines.push('Muchas gracias 🐷');
  return lines.join('\n');
}

export function orderWhatsappLink(message: string): string {
  return `https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(message)}`;
}
