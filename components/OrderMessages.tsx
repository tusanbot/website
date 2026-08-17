"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface OrderMessagesProps {
    orderId: string;
}

interface Message {
    id: string;
    order_id: string;
    sender_id: string;
    sender_role: "admin" | "user" | string;
    sender_name?: string | null;
    message: string;
    created_at: string;
    read_by_user: boolean;
    read_by_admin: boolean;
}

export default function OrderMessages({
    orderId,
}: OrderMessagesProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState("");
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    /*
     * دریافت کاربر فعلی
     */
    async function getUser() {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        setUser(user);

        return user;
    }

    /*
     * دریافت پیام‌های سفارش
     */
    async function loadMessages() {
        if (!orderId) return;

        const {
            data,
            error,
        } = await supabase
            .from("messages")
            .select("*")
            .eq("order_id", orderId)
            .order("created_at", {
                ascending: true,
            });

        if (error) {
            console.error(
                "خطا در دریافت پیام‌ها:",
                error
            );
            return;
        }

        setMessages((data || []) as Message[]);
    }

    /*
     * علامت‌گذاری پیام‌های طرف مقابل به عنوان خوانده‌شده
     */
    async function markMessagesAsRead(currentUser?: any) {
        const activeUser =
            currentUser || user;

        if (!activeUser || !orderId) return;

        const {
            data: profile,
            error: profileError,
        } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", activeUser.id)
            .single();

        if (profileError || !profile) {
            console.error(
                "خطا در دریافت نقش کاربر:",
                profileError
            );
            return;
        }

        /*
         * اگر ادمین وارد سفارش شده،
         * پیام‌های کاربر را خوانده‌شده می‌کنیم.
         */
        if (profile.role === "admin") {
            const { error } = await supabase
                .from("messages")
                .update({
                    read_by_admin: true,
                })
                .eq("order_id", orderId)
                .eq("sender_role", "user")
                .eq("read_by_admin", false);

            if (error) {
                console.error(
                    "خطا در خوانده‌شدن پیام‌های ادمین:",
                    error
                );
            }
        }

        /*
         * اگر کاربر عادی وارد سفارش شده،
         * پیام‌های ادمین را خوانده‌شده می‌کنیم.
         */
        else {
            const { error } = await supabase
                .from("messages")
                .update({
                    read_by_user: true,
                })
                .eq("order_id", orderId)
                .eq("sender_role", "admin")
                .eq("read_by_user", false);

            if (error) {
                console.error(
                    "خطا در خوانده‌شدن پیام‌های کاربر:",
                    error
                );
            }
        }
    }

    /*
     * بارگذاری اولیه
     */
    useEffect(() => {
        let mounted = true;

        async function initialize() {
            setLoading(true);

            const currentUser =
                await getUser();

            await loadMessages();

            if (currentUser) {
                await markMessagesAsRead(
                    currentUser
                );
            }

            if (mounted) {
                setLoading(false);
            }
        }

        initialize();

        return () => {
            mounted = false;
        };
    }, [orderId]);

    /*
     * دریافت پیام جدید به صورت لحظه‌ای
     */
    useEffect(() => {
        if (!orderId) return;

        const channel = supabase
            .channel(
                `messages-${orderId}`
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `order_id=eq.${orderId}`,
                },
                async (payload) => {
                    const newMessage =
                        payload.new as Message;

                    setMessages((current) => {
                        const exists =
                            current.some(
                                (item) =>
                                    item.id ===
                                    newMessage.id
                            );

                        if (exists) {
                            return current;
                        }

                        return [
                            ...current,
                            newMessage,
                        ];
                    });

                    /*
                     * اگر پیام از طرف مقابل آمده،
                     * آن را خوانده‌شده می‌کنیم.
                     */
                    const {
                        data: {
                            user: currentUser,
                        },
                    } =
                        await supabase.auth.getUser();

                    if (!currentUser) return;

                    const {
                        data: profile,
                    } = await supabase
                        .from("profiles")
                        .select("role")
                        .eq(
                            "id",
                            currentUser.id
                        )
                        .single();

                    if (!profile) return;

                    if (
                        profile.role ===
                        "admin" &&
                        newMessage.sender_role ===
                        "user"
                    ) {
                        await supabase
                            .from("messages")
                            .update({
                                read_by_admin:
                                    true,
                            })
                            .eq(
                                "id",
                                newMessage.id
                            );
                    }

                    if (
                        profile.role !==
                        "admin" &&
                        newMessage.sender_role ===
                        "admin"
                    ) {
                        await supabase
                            .from("messages")
                            .update({
                                read_by_user:
                                    true,
                            })
                            .eq(
                                "id",
                                newMessage.id
                            );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(
                channel
            );
        };
    }, [orderId]);

    /*
     * ارسال پیام
     */
    async function sendMessage() {
        const trimmedText =
            text.trim();

        if (
            !trimmedText ||
            sending
        ) {
            return;
        }

        const {
            data: {
                user: currentUser,
            },
        } = await supabase.auth.getUser();

        if (!currentUser) {
            return;
        }

        const {
            data: profile,
            error: profileError,
        } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", currentUser.id)
            .single();

        if (
            profileError ||
            !profile
        ) {
            alert(
                "اطلاعات کاربر دریافت نشد."
            );
            return;
        }

        setSending(true);

        /*
         * پیام خود کاربر به صورت خودکار
         * خوانده‌شده برای خودش محسوب می‌شود.
         *
         * برای طرف مقابل read_by_* = false است.
         */
        const { error } =
            await supabase
                .from("messages")
                .insert({
                    order_id: orderId,
                    sender_id:
                        currentUser.id,
                    message: trimmedText,
                    is_read: false,

                    read_by_user:
                        profile.role !==
                        "admin",

                    read_by_admin:
                        profile.role ===
                        "admin",

                    sender_role:
                        profile.role,
                });

        if (error) {
            console.error(
                "خطا در ارسال پیام:",
                error
            );

            alert(error.message);

            setSending(false);

            return;
        }

        setText("");

        /*
         * به‌روزرسانی پیام‌ها
         */
        await loadMessages();

        setSending(false);
    }

    /*
     * ارسال با Enter
     */
    function handleKeyDown(
        e: React.KeyboardEvent<HTMLInputElement>
    ) {
        if (
            e.key === "Enter" &&
            !e.shiftKey
        ) {
            e.preventDefault();

            sendMessage();
        }
    }

    return (
        <div
            dir="rtl"
            className="bg-white rounded-2xl shadow p-6"
        >
            {/* عنوان */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                    گفت‌وگو با کافی‌نت
                </h2>

                {messages.length > 0 && (
                    <span className="text-sm text-gray-500">
                        {messages.length.toLocaleString(
                            "fa-IR"
                        )}{" "}
                        پیام
                    </span>
                )}
            </div>

            {/* پیام‌ها */}
            <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
                {loading ? (
                    <p className="text-gray-500 text-center py-5">
                        در حال دریافت پیام‌ها...
                    </p>
                ) : messages.length === 0 ? (
                    <p className="text-gray-500 text-center py-5">
                        هنوز پیامی رد و بدل نشده است.
                    </p>
                ) : (
                    messages.map(
                        (item) => {
                            const isMine =
                                item.sender_id ===
                                user?.id;

                            return (
                                <div
                                    key={
                                        item.id
                                    }
                                    className={`flex ${isMine
                                            ? "justify-end"
                                            : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow ${isMine
                                                ? "bg-[#09967C] text-white rounded-br-none"
                                                : "bg-gray-200 text-gray-800 rounded-bl-none"
                                            }`}
                                    >
                                        {/* نام فرستنده */}
                                        <div className="text-xs mb-1 opacity-80">
                                            {item.sender_role ===
                                                "admin"
                                                ? `مدیر: ${item.sender_name ||
                                                "مدیر سیستم"
                                                }`
                                                : item.sender_name ||
                                                "کاربر"}
                                        </div>

                                        {/* متن پیام */}
                                        <div className="whitespace-pre-wrap break-words">
                                            {
                                                item.message
                                            }
                                        </div>

                                        {/* تاریخ */}
                                        <div className="text-[11px] mt-2 opacity-70">
                                            {new Date(
                                                item.created_at
                                            ).toLocaleString(
                                                "fa-IR"
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    )
                )}
            </div>

            {/* ارسال پیام */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={text}
                    onChange={(e) =>
                        setText(
                            e.target.value
                        )
                    }
                    onKeyDown={
                        handleKeyDown
                    }
                    placeholder="پیام خود را بنویسید..."
                    disabled={sending}
                    className="border border-gray-300 rounded-xl p-3 flex-1 outline-none focus:ring-2 focus:ring-[#09967C] disabled:bg-gray-100"
                />

                <button
                    type="button"
                    onClick={
                        sendMessage
                    }
                    disabled={
                        !text.trim() ||
                        sending
                    }
                    className="bg-[#09967C] text-white px-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {sending
                        ? "در حال ارسال..."
                        : "ارسال"}
                </button>
            </div>
        </div>
    );
}