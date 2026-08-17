"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import {
    defaultTheme,
    ThemeConfig,
} from "@/lib/theme/themeConfig";

import {
    applyTheme,
} from "@/lib/theme/themeUtils";

import {
    loadThemeFromDatabase,
} from "@/lib/theme/themeService";

import { supabase } from "@/lib/supabase";
import { loadUserTheme } from "@/lib/theme/userThemeService";

export type ThemeMode = "light" | "dark";

type ThemeContextType = {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;

    themeConfig: ThemeConfig;
    setThemeConfig: (config: ThemeConfig) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(
    undefined
);

export function ThemeProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [theme, setThemeState] =
        useState<ThemeMode>("light");

    const [themeConfig, setThemeConfigState] =
        useState<ThemeConfig>(defaultTheme);

    /*
     * بارگذاری تنظیمات اولیه Theme
     */
    useEffect(() => {
        let mounted = true;

        async function initializeTheme() {
            // -------------------------
            // حالت روشن / تاریک
            // -------------------------
            const savedMode = localStorage.getItem(
                "tusan-theme-mode"
            ) as ThemeMode | null;

            if (
                savedMode === "light" ||
                savedMode === "dark"
            ) {
                if (mounted) {
                    setThemeState(savedMode);
                }
            }

            try {
                // -------------------------
                // بررسی کاربر لاگین شده
                // -------------------------
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                // -------------------------
                // Theme شخصی کاربر
                // -------------------------
                if (user) {
                    const userTheme =
                        await loadUserTheme(user.id);

                    if (userTheme) {
                        if (mounted) {
                            setThemeConfigState(userTheme);
                            applyTheme(userTheme);

                            localStorage.setItem(
                                "tusan-theme-config",
                                JSON.stringify(userTheme)
                            );
                        }

                        return;
                    }
                }

                // -------------------------
                // Theme عمومی سایت
                // -------------------------
                const globalTheme =
                    await loadThemeFromDatabase();

                if (!mounted) {
                    return;
                }

                if (globalTheme) {
                    setThemeConfigState(globalTheme);
                    applyTheme(globalTheme);

                    localStorage.setItem(
                        "tusan-theme-config",
                        JSON.stringify(globalTheme)
                    );
                } else {
                    setThemeConfigState(defaultTheme);
                    applyTheme(defaultTheme);
                }
            } catch (error) {
                console.error(
                    "خطا در بارگذاری تنظیمات Theme:",
                    error
                );

                if (mounted) {
                    setThemeConfigState(defaultTheme);
                    applyTheme(defaultTheme);
                }
            }
        }

        initializeTheme();

        return () => {
            mounted = false;
        };
    }, []);


    /*
     * تغییر حالت روشن / تاریک
     */
    useEffect(() => {
        document.documentElement.setAttribute(
            "data-theme",
            theme
        );

        localStorage.setItem(
            "tusan-theme-mode",
            theme
        );
    }, [theme]);

    /*
     * تغییر ThemeConfig
     */
    const setThemeConfig = (
        config: ThemeConfig
    ) => {
        setThemeConfigState(config);

        applyTheme(config);

        localStorage.setItem(
            "tusan-theme-config",
            JSON.stringify(config)
        );
    };

    /*
     * تغییر حالت Theme
     */
    const setTheme = (
        mode: ThemeMode
    ) => {
        setThemeState(mode);
    };

    /*
     * تغییر روشن / تاریک
     */
    const toggleTheme = () => {
        setThemeState((current) =>
            current === "light"
                ? "dark"
                : "light"
        );
    };

    return (
        <ThemeContext.Provider
            value={{
                theme,
                setTheme,
                toggleTheme,

                themeConfig,
                setThemeConfig,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context =
        useContext(ThemeContext);

    if (!context) {
        throw new Error(
            "useTheme must be used inside ThemeProvider"
        );
    }

    return context;
}