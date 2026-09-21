-- ChanchiMercado v2 - esquema inicial
-- Principio: el saldo NO se guarda, se calcula como SUM(movements.amount).
-- amount > 0 = compra fiada, amount < 0 = abono. Cada operacion es un solo INSERT.

CREATE TABLE IF NOT EXISTS clients (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT,
  note        TEXT,
  archived    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_clients_archived ON clients (archived);

CREATE TABLE IF NOT EXISTS movements (
  id           TEXT PRIMARY KEY,
  client_id    TEXT NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('purchase', 'payment', 'adjustment')),
  description  TEXT,
  amount       INTEGER NOT NULL,
  occurred_at  TEXT NOT NULL,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_movements_client ON movements (client_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_movements_occurred ON movements (occurred_at);

CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  price           INTEGER NOT NULL DEFAULT 0,
  category        TEXT,
  image_key       TEXT,
  is_visible      INTEGER NOT NULL DEFAULT 1,
  is_free_amount  INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_order ON products (sort_order, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS orders (
  id           TEXT PRIMARY KEY,
  client_name  TEXT,
  phone        TEXT,
  items_json   TEXT NOT NULL,
  total        INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'entregado', 'anulado')),
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL,
  entity        TEXT NOT NULL,
  entity_id     TEXT,
  details_json  TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log (created_at);
