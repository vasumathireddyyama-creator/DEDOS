export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // in cents, e.g., 2999 = $29.99
  image: string;
  stock: number;
  maxStock: number;
  category: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  priceAtPurchase: number; // in cents
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number; // in cents
  status: 'Pending' | 'Paid' | 'Processing' | 'Shipped' | 'Completed' | 'Refunded';
  stripeSessionId?: string;
  customerEmail: string;
  paymentMethod: 'stripe' | 'simulated';
  createdAt: string;
}

export type RealTimeEvent =
  | { type: 'INVENTORY_UPDATE'; data: { productId: string; stock: number } }
  | { type: 'ORDER_CREATED'; data: Order }
  | { type: 'ORDER_UPDATED'; data: { orderId: string; status: Order['status'] } };
