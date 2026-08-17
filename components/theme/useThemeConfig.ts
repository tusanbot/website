"use client";

import { useTheme } from "./ThemeProvider";
import {
    defaultTheme,
    ThemeConfig,
} from "@/lib/theme/themeConfig";

export function useThemeConfig(): ThemeConfig {
    const { themeConfig } = useTheme();

    return themeConfig ?? defaultTheme;
}