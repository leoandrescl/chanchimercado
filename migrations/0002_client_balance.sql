-- ChanchiMercado v2 - Saldo materializado por cliente
-- Motivo: la libreta calculaba SUM(movements.amount) en cada carga, leyendo
-- ~22.000 filas por request (clientes + todos los movimientos) y agotando el
-- cupo diario de D1 (5.000.000 filas). Guardamos el saldo en clients y lo
-- mantenemos actualizado dentro de la misma transaccion de cada movimiento.
-- Invariante: clients.balance = COALESCE(SUM(movements.amount), 0) para ese cliente.

ALTER TABLE clients ADD COLUMN balance INTEGER NOT NULL DEFAULT 0;

UPDATE clients
   SET balance = COALESCE(
     (SELECT SUM(movements.amount) FROM movements WHERE movements.client_id = clients.id),
     0
   );

CREATE INDEX IF NOT EXISTS idx_clients_balance ON clients (balance);
