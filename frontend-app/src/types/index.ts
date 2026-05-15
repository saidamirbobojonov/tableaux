// --- Auth ---
export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

// --- Branch ---
export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  logo: string | null;
  cover_image: string | null;
  primary_color: string;
  secondary_color: string;
  default_delivery_fee: string;
  default_tip_percent: number;
  currency: string;
  timezone: string;
}

// --- Analytics ---
export interface KPI {
  revenue: number;
  orders_count: number;
  avg_ticket: number;
  tips_total: number;
  discounts_total: number;
}

export interface TopItem {
  menu_item__name: string;
  total_qty: number;
  total_money: string;
}

export interface DailyTrend {
  day: string;
  revenue: number;
  orders: number;
}

export interface HourlySlot {
  hour: number;
  orders: number;
  revenue: number;
}

export interface PaymentSplit {
  method: string;
  label: string;
  orders: number;
  revenue: number;
}

export interface CategoryBreakdown {
  category: string;
  revenue: number;
  qty: number;
}

export interface WaiterStat {
  name: string;
  orders: number;
  revenue: number;
  avg_ticket: number;
  tips: number;
}

export interface FoodCost {
  total_revenue: number;
  total_food_cost: number;
  gross_profit: number;
  margin_percent: number;
}

export interface OrderTypeSplit {
  type: string;
  orders: number;
  revenue: number;
}

export interface DashboardStats {
  kpi: KPI;
  top_items: TopItem[];
  daily_trend: DailyTrend[];
  hourly_distribution: HourlySlot[];
  payment_split: PaymentSplit[];
  category_breakdown: CategoryBreakdown[];
  waiter_stats: WaiterStat[];
  food_cost: FoodCost;
  order_type_split: OrderTypeSplit[];
}

// --- Orders ---
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PREPARING"
  | "READY"
  | "ON_WAY"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "RESERVE";

export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED";

export type TableShape = "rect" | "round" | "square";

export interface Table {
  id: string;
  number: string;
  name: string;
  capacity: number;
  status: TableStatus;
  is_active: boolean;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  shape: TableShape;
}

export interface OrderItem {
  name: string;
  variant: string | null;
  quantity: number;
  price: string;
  total: string;
  modifiers: { name: string; price: string }[];
  notes: string;
}

export interface Order {
  id: string;
  branch: string;
  order_type: OrderType;
  table_id: string | null;
  table_number: string | null;
  status: OrderStatus;
  payment_method: string | null;
  total_amount: string;
  tip_amount: string;
  discount_amount: string;
  delivery_fee: string;
  delivery_address: string | null;
  customer_phone: string | null;
  created_at: string;
  items_details: OrderItem[];
  notes: string;
  created_by_name: string | null;
}

// --- KDS ---
export interface KDSModifier {
  name: string;
  price: string;
}

export interface KDSItem {
  id: string;
  name: string;
  variant_name: string | null;
  quantity: number;
  notes: string;
  modifiers: KDSModifier[];
}

export interface KDSOrder {
  id: string;
  table_number: string | null;
  status: OrderStatus;
  order_type: OrderType;
  created_at: string;
  time_elapsed_seconds: number;
  server_name: string;
  items: KDSItem[];
  notes: string;
  delivery_address: string | null;
}
