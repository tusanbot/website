export type ThemeConfig = {
    colors: {
        primary: string;
        primaryDark: string;
        primaryLight: string;
    };

    radius: {
        xl: number;
        lg: number;
        md: number;
    };

    blur: {
        panel: number;
        card: number;
    };

    shadow: {
        sm: string;
        md: string;
        lg: string;
    };

    motion: {
        enabled: boolean;
        hoverScale: number;
        hoverLift: number;
        duration: number;
    };
};

export const defaultTheme: ThemeConfig = {
    colors: {
        primary: "#09967C",
        primaryDark: "#087d69",
        primaryLight: "#dff5ef",
    },

    radius: {
        xl: 28,
        lg: 20,
        md: 16,
    },

    blur: {
        panel: 16,
        card: 14,
    },

    shadow: {
        sm: "0 4px 12px rgba(15,23,42,0.06)",
        md: "0 12px 32px rgba(15,23,42,0.08)",
        lg: "0 20px 44px rgba(15,23,42,0.12)",
    },

    motion: {
        enabled: true,
        hoverScale: 1.02,
        hoverLift: -3,
        duration: 220,
    },
};