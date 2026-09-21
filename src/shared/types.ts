export type MovementType = 'purchase' | 'payment' | 'adjustment';

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  archived: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Movement {
  id: string;
  client_id: string;
  type: MovementType;
  description: string | null;
  amount: number;
  occurred_at: string;
  created_at: string;
}

export interface ClientDetail extends Client {
  movements: Movement[];
  totals: {
    purchases: number;
    payments: number;
  };
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string | null;
  image_key: string | null;
  image_url: string | null;
  is_visible: number;
  is_free_amount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ApiError {
  error: string;
}
