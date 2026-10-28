export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface Service {
  id: string;
  user_id: string;
  name: string;
  description: string;
  default_price: number;
  default_duration: number; // em minutos
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  client_id: string | null;
  client_name: string;
  client_phone: string;
  service_id: string | null;
  service_name: string;
  appointment_date: string; // YYYY-MM-DD
  start_time: string;       // HH:mm
  end_time: string;         // HH:mm
  duration: number;         // minutos
  price: number;
  paid_amount: number;
  location: string;
  notes: string;
  status: AppointmentStatus;
  payment_status: PaymentStatus;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string; // YYYY-MM-DD
  notes: string;
  created_at: string;
}

export interface BlockedSlot {
  id: string;
  user_id: string;
  title: string;
  block_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  is_full_day: boolean;
  created_at: string;
}

export interface BusinessSettings {
  id: string;
  user_id: string;
  work_start_time: string; // HH:mm
  work_end_time: string;   // HH:mm
  work_days: number[];     // [1,2,3,4,5,6]
  updated_at: string;
}