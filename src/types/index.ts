export interface Category {
  category_id: number;
  category_name: string;
  description: string | null;
}

export interface Supplier {
  supplier_id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
}

export interface Customer {
  customer_id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
}

export interface Product {
  product_id: number;
  sku: string;
  name: string;
  category_id: number;
  supplier_id: number;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  reorder_level: number;
  // Joined fields
  category_name?: string;
  supplier_name?: string;
}

export type PurchaseStatus = 'Pending' | 'Received' | 'Cancelled';

export interface Purchase {
  purchase_id: number;
  supplier_id: number;
  purchase_date: string;
  total_amount: number;
  status: PurchaseStatus;
  supplier_name?: string;
  items_count?: number;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  purchase_item_id: number;
  purchase_id: number;
  product_id: number;
  quantity: number;
  unit_cost: number;
  product_name?: string;
  sku?: string;
  subtotal?: number;
}

export type PaymentMethod = 'Cash' | 'Card' | 'UPI';

export interface Sale {
  sale_id: number;
  customer_id: number;
  sale_date: string;
  total_amount: number;
  payment_method: PaymentMethod;
  customer_name?: string;
  items_count?: number;
  items?: SaleItem[];
}

export interface SaleItem {
  sale_item_id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  product_name?: string;
  sku?: string;
  subtotal?: number;
}

export interface LowStockProduct {
  product_id: number;
  sku: string;
  name: string;
  category_name: string;
  supplier: string;
  stock_qty: number;
  reorder_level: number;
  supplier_id?: number;
  cost_price?: number;
}

export interface SalesSummaryItem {
  sale_id: number;
  customer: string;
  sale_date: string;
  payment_method: PaymentMethod;
  total_amount: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  todaySales: number;
  todayPurchases: number;
  lowStockItems: LowStockProduct[];
  recentSales: SalesSummaryItem[];
  salesByCategory: {
    category_name: string;
    total_sales: number;
  }[];
}
