export interface User {
  id: string
  full_name: string | null
  email: string | null
  licence_number: string | null
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  status: "active" | "trial" | "overdue" | "cancelled"
  plan: string
  price_at_signup: number
  started_at: string
  renews_at: string
  payment_method_brand: string
  payment_method_last4: string
  payment_method_expiry: string
}

export interface Jump {
  id: string
  user_id: string
  jump_number: number
  date: string
  location: string
  aircraft: string
  altitude_ft: number
  freefall_seconds: number
  canopy: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export type JumpInsert = Omit<Jump, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type JumpUpdate = Partial<JumpInsert>
