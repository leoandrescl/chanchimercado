import { describe, expect, it } from 'vitest';
import { selectPendingPurchases, buildSummaryMessage } from './whatsapp';
import type { Movement } from '@shared/types';

let seq = 0;
function mv(amount: number, date: string, description = 'Compra'): Movement {
  seq++;
  return {
    id: `m${seq}`,
    client_id: 'c1',
    type: amount < 0 ? 'payment' : 'purchase',
    description,
    amount,
    occurred_at: date,
    created_at: date,
  };
}

describe('selectPendingPurchases', () => {
  it('toma las compras mas nuevas y su suma da exactamente la deuda', () => {
    const movements = [
      mv(1000, '2026-01-05T12:00:00.000Z'),
      mv(2000, '2026-02-05T12:00:00.000Z'),
      mv(3000, '2026-03-05T12:00:00.000Z'),
    ];
    const selected = selectPendingPurchases(movements, 4000);
    const total = selected.reduce((s, x) => s + x.shown, 0);
    expect(total).toBe(4000);
    // Feb (recortada a 1000) + Mar (3000)
    expect(selected.map((x) => x.shown)).toEqual([1000, 3000]);
  });

  it('ignora abonos y meses anteriores ya cancelados', () => {
    const movements = [
      mv(5000, '2026-01-05T12:00:00.000Z'),
      mv(-5000, '2026-01-20T12:00:00.000Z'),
      mv(1500, '2026-06-05T12:00:00.000Z'),
    ];
    const selected = selectPendingPurchases(movements, 1500);
    expect(selected).toHaveLength(1);
    expect(selected[0].movement.amount).toBe(1500);
  });

  it('devuelve vacio si no hay deuda', () => {
    expect(selectPendingPurchases([mv(1000, '2026-01-05T12:00:00.000Z')], 0)).toEqual([]);
  });

  it('el mensaje resumido incluye el total y cuadra', () => {
    const movements = [mv(2000, '2026-06-01T12:00:00.000Z'), mv(3000, '2026-07-01T12:00:00.000Z')];
    const msg = buildSummaryMessage({ name: 'Ana', phone: null, balance: 5000, movements });
    expect(msg).toContain('TOTAL PENDIENTE');
    expect(msg).toContain('Ana');
  });

  it('mensaje al dia si el saldo es cero', () => {
    const msg = buildSummaryMessage({ name: 'Ana', phone: null, balance: 0, movements: [] });
    expect(msg).toContain('al día');
  });
});
