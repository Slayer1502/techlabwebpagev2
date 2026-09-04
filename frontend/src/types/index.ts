export type UserRole = 'admin' | 'sales' | 'employee' | 'technician' | 'customer';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  mobile?: string;
  email?: string;
}

export interface Product {
  id: string;
  type: string;
  name: string;
  price: number;
  originalPrice: number;
  finalPrice: number;
  description: string;
  discountPercent: number;
  stock: number;
  updated_by_employee_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  hsn_code?: string;
  gst_rate?: number;
  unit_type: 'standard' | 'measurement';
  base_unit?: string;
  sub_unit?: string;
  conversion_factor?: number;
  loose_stock?: number;
  imageUrl?: string | null;
}

export interface ServiceRequest {
  id: string;
  customer_name: string;
  customer_mobile: string;
  customer_email?: string;
  device_type: string;
  request_subject_type?: string;
  request_subject_name?: string;
  issue: string;
  preferred_date: string;
  assigned_employee_id?: string;
  assigned_employee_name?: string;
  service_person?: string;
  scheduled_date?: string;
  status: 'Pending' | 'Scheduled' | 'Completed' | 'Canceled';
  conveyance_expense?: number;
  created_at: string;
  bill_status?: 'none' | 'billed';
  bill_number?: string;
  bill_date?: string;
  bill_amount?: number;
  amount_paid?: number;
  discount_amount?: number;
  payment_status?: 'none' | 'pending' | 'partial' | 'paid';
  survey_status?: 'none' | 'submitted' | 'reviewed';
  part_request_status?: 'none' | 'requested' | 'available' | 'collected';
  requested_parts?: string;
  used_items?: string;
  completed_at?: string;
  estimated_cost?: number;
  linked_dc_id?: string;
  status_notes?: string;
}

export interface Party {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  gstin?: string;
  is_customer: boolean;
  is_supplier: boolean;
  created_at: string;
  total_purchases?: number;
  outstanding_balance?: number;
  customer_due?: number;
  purchase_count?: number;
  customer_order_count?: number;
  customer_spent?: number;
  dues?: number;
}

export interface CustomerSummary {
  mobile: string;
  name: string;
  address?: string;
  last_order?: string;
}

export type EnquiryStatus = 'new' | 'quoted' | 'confirmed' | 'delivered';

export interface Enquiry {
  id: string;
  customer_name: string;
  customer_mobile: string;
  type: string;
  product_interest?: string;
  visit_address?: string;
  preferred_date?: string;
  budget?: number;
  status: EnquiryStatus;
  notes?: string;
  lead_source?: string;
  created_at: string;
  supplier_id?: string;
  product_id?: string;
  quantity?: number;
  cost_price?: number;
  quoted_price?: number;
  quote_options?: string;
  po_id?: string;
  advance_amount?: number;
  advance_mode?: string;
  advance_date?: string;
  customer_advance_amount?: number;
  customer_advance_mode?: string;
  customer_advance_date?: string;
  supplier_advance_amount?: number;
  supplier_advance_mode?: string;
  supplier_advance_date?: string;
  final_received?: number;
  final_mode?: string;
  final_date?: string;
}

export interface Quotation {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_mobile: string;
  customer_address?: string;
  quote_date: string;
  valid_until?: string;
  total_amount: number;
  status: 'pending' | 'converted' | 'cancelled';
  items?: QuotationItem[];
  created_at: string;
  service_request_id?: string;
  converted_at?: string;
}

export interface QuotationItem {
  product_id?: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  products?: T[]; // Specifically for public products for now
  orders?: T[];
  items?: T[];
  page: number;
  limit: number;
}
