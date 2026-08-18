const FJPANEL_URL = "https://fjpanel.com/api/v2";

export interface FJPanelService {
    service: number;
    name: string;
    type: string;
    category: string;
    rate: string;
    min: string;
    max: string;
}

interface FJPanelError {
    error?: string;
}

async function request<T>(payload: Record<string, string>): Promise<T> {
    const key = process.env.FJPANEL_API_KEY;
    if (!key) {
        throw new Error("FJPANEL_API_KEY is not configured");
    }

    const body = new URLSearchParams({ key, ...payload });
    const response = await fetch(FJPANEL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`FJPanel request failed with HTTP ${response.status}`);
    }

    const data = (await response.json()) as T & FJPanelError;
    if (data && typeof data === "object" && "error" in data && data.error) {
        throw new Error(data.error);
    }

    return data;
}

export async function getFJPanelServices() {
    return request<FJPanelService[]>({ action: "services" });
}
