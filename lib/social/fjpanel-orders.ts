const FJPANEL_URL = "https://fjpanel.com/api/v2";

interface FJPanelError {
    error?: string;
}

export interface FJPanelAddResponse {
    order: number;
}

export interface FJPanelStatusResponse {
    charge: string;
    status: string;
    currency: string;
}

async function request<T>(payload: Record<string, string>): Promise<T> {
    const key = process.env.FJPANEL_API_KEY;
    if (!key) throw new Error("FJPANEL_API_KEY is not configured");

    const response = await fetch(FJPANEL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ key, ...payload }),
        cache: "no-store",
    });

    if (!response.ok) throw new Error(`FJPanel request failed with HTTP ${response.status}`);

    const data = (await response.json()) as T & FJPanelError;
    if (data && typeof data === "object" && "error" in data && data.error) {
        throw new Error(data.error);
    }
    return data;
}

export function addFJPanelOrder(service: string, link: string, quantity: number) {
    return request<FJPanelAddResponse>({
        action: "add",
        service,
        link,
        quantity: String(quantity),
    });
}

export function getFJPanelOrderStatus(order: string) {
    return request<FJPanelStatusResponse>({
        action: "status",
        order,
    });
}
