export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED'
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: 'starter' | 'main' | 'dessert' | 'drink';
  isAiGenerated?: boolean;
}

export interface CartItem extends MenuItem {
  cartId: string;
  notes?: string;
}

export interface Order {
  id: string;
  customerName: string;
  items: CartItem[];
  status: OrderStatus;
  createdAt: number;
  total: number;
  aiChefComment?: string;
}
