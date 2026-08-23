export type SocialProvider = "fjpanel" | (string & {});

export type SocialOrderStatus =
    | "pending"
    | "awaiting_payment"
    | "paid"
    | "processing"
    | "partial"
    | "completed"
    | "cancelled"
    | "failed";

export interface SocialPlatform {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    description: string | null;
    is_active: boolean;
    sort_order: number;
}

export interface SocialCategory {
    id: string;
    platform_id: string;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
}

export interface SocialService {
    id: string;
    platform_id: string;
    category_id: string;
    provider: SocialProvider;
    provider_service_id: string | null;
    name: string;
    provider_name: string | null;
    description: string | null;
    service_type: string;
    provider_rate: number | null;
    min_quantity: number;
    max_quantity: number;
    profit_type: "percentage" | "fixed" | "none";
    profit_value: number;
    is_active: boolean;
    sort_order: number;
}

/** Safe customer-facing catalog shape. Never contains provider or margin data. */
export interface PublicSocialService {
    id: string;
    platform_id: string;
    category_id: string;
    name: string;
    description: string | null;
    service_type: string;
    min_quantity: number;
    max_quantity: number;
    is_active: boolean;
    sort_order: number;
    customer_unit_price: number | null;
}

export interface SocialOrder {
    id: string;
    tracking_code: string;
    user_id: string;
    service_id: string;
    provider: SocialProvider;
    provider_order_id: string | null;
    link: string;
    quantity: number;
    price: number;
    provider_charge: number | null;
    status: SocialOrderStatus;
    provider_status: string | null;
    admin_note: string | null;
    created_at: string;
    updated_at: string;
}
