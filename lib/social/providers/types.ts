import type { SocialOrderStatus, SocialProvider, SocialService } from "@/lib/social/types";

export interface ProviderService {
    providerServiceId: string;
    name: string;
    type: string;
    category: string;
    rate: number;
    min: number;
    max: number;
}

export interface AddOrderInput {
    service: SocialService;
    link: string;
    quantity: number;
}

export interface AddOrderResult {
    providerOrderId: string;
}

export interface OrderStatusResult {
    providerOrderId: string;
    charge: number;
    status: SocialOrderStatus | string;
    currency: string;
}

export interface SocialProviderAdapter {
    readonly name: SocialProvider;
    listServices(): Promise<ProviderService[]>;
    addOrder(input: AddOrderInput): Promise<AddOrderResult>;
    getOrderStatus(providerOrderId: string): Promise<OrderStatusResult>;
    getBalance(): Promise<{ balance: number; currency: string }>;
}
