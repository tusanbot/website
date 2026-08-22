"use client";

import {
    Shield,
    Briefcase,
    ClipboardList,
    Users,
    MessageSquare,
    Settings,
    BarChart3,
    FileText,
    GraduationCap,
    Car,
    Receipt,
    Zap,
    Lock,
    MonitorSmartphone,
    Headphones,
    Search,
    Upload,
    ScanSearch,
    Cog,
    CheckCircle,
    MapPin,
    Phone,
    Mail,
    MessageCircle,
    ArrowRight,
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Home,
    User,
    Bell,
} from "lucide-react";

const icons = {
    shield: Shield,
    briefcase: Briefcase,
    clipboard: ClipboardList,
    users: Users,
    message: MessageSquare,
    settings: Settings,
    chart: BarChart3,
    file: FileText,
    graduation: GraduationCap,
    car: Car,
    receipt: Receipt,
    zap: Zap,
    lock: Lock,
    monitor: MonitorSmartphone,
    support: Headphones,
    search: Search,
    upload: Upload,
    review: ScanSearch,
    cog: Cog,
    check: CheckCircle,
    map: MapPin,
    phone: Phone,
    mail: Mail,
    chat: MessageCircle,
    arrowRight: ArrowRight,
    arrowLeft: ArrowLeft,
    chevronLeft: ChevronLeft,
    chevronRight: ChevronRight,
    home: Home,
    user: User,
    bell: Bell,
};

const emojiMap: Record<string, keyof typeof icons> = {
    "🛡️": "shield",
    "📋": "clipboard",
    "🔎": "search",
    "🔍": "search",
    "⚙️": "cog",
    "⚙": "cog",
    "✅": "check",
    "📊": "chart",
    "📈": "chart",
    "📉": "chart",
    "👥": "users",
    "💬": "message",
    "📨": "message",
    "🔔": "bell",
    "👤": "user",
    "📝": "file",
    "🎓": "graduation",
    "🚗": "car",
    "🧾": "receipt",
    "🧩": "briefcase",
    "📂": "briefcase",
    "📄": "file",
    "⚡": "zap",
    "🔒": "lock",
    "📱": "monitor",
    "🖥️": "monitor",
    "🎧": "support",
    "📤": "upload",
    "📍": "map",
    "📞": "phone",
    "✉️": "mail",
    "🏠": "home",
    "➡️": "arrowRight",
    "⬅️": "arrowLeft",
};

export type TusanIconName = keyof typeof icons;

type Props = {
    name: TusanIconName | string;
    size?: number;
    className?: string;
};

export default function TusanIcon({
    name,
    size = 22,
    className = "",
}: Props) {
    const key: TusanIconName =
        (name in icons
            ? (name as TusanIconName)
            : emojiMap[name]) ?? "briefcase";

    const Icon = icons[key];

    return (
        <Icon
            size={size}
            strokeWidth={2}
            className={className}
        />
    );
}
