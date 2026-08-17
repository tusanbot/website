"use client";


import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import OrderStatus from "@/components/OrderStatus";
import AdminOrderStatus from "@/components/AdminOrderStatus";
import {
    getAdminUnreadMessagesByOrder,
    getAdminUnreadMessagesCount
} from "@/lib/notifications";
import Link from "next/link";



export default function AdminPage() {


    const [orders, setOrders] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    const [unreadCount, setUnreadCount] = useState(0);

    const [orderUnread, setOrderUnread] = useState<any>({});



    useEffect(() => {

        loadOrders();
        loadAdminUnread();


        const channel = supabase
            .channel("admin-messages")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages"
                },
                async () => {

                    const count =
                        await getAdminUnreadMessagesCount();

                    setUnreadCount(count);

                }
            )
            .subscribe();



        return () => {

            supabase.removeChannel(channel);

        };


    }, []);





    async function loadOrders() {


        const {
            data: {
                user
            }
        }
            =
            await supabase.auth.getUser();



        if (!user)
            return;



        // بررسی مدیر بودن

        const { data: profile } = await supabase

            .from("profiles")

            .select("role")

            .eq(
                "id",
                user.id
            )

            .single();



        if (profile?.role !== "admin") {

            alert(
                "دسترسی ندارید"
            );

            return;

        }





        const { data, error } = await supabase

            .from("orders")

            .select(`

                

*,



services(
title,
icon
),

profiles(
full_name,
phone
)

`)

            .order(
                "created_at",
                {
                    ascending: false
                }
            );




        if (error) {

            console.log(error);

            return;

        }


        setOrders(data || []);

        const unreadMap: any = {};


        for (const order of data || []) {

            unreadMap[order.id] =
                await getAdminUnreadMessagesByOrder(order.id);

        }


        setOrderUnread(unreadMap);

        setLoading(false);


    }











    if (loading) {

        return (

            <div className="p-10">

                در حال دریافت سفارش‌ها...

            </div>

        )

    }


    async function loadAdminUnread() {

        const count = await getAdminUnreadMessagesCount();

        setUnreadCount(count);

    }





    return (

        <div className="min-h-screen bg-gray-100 p-6">


            <div className="max-w-6xl mx-auto">


                <h1 className="text-3xl font-bold mb-6">

                    پنل مدیریت کافی‌نت

                </h1>




                <div className="space-y-4">


                    {
                        orders.map(order => (


                            <div

                                key={order.id}

                                className="bg-white rounded-xl shadow p-5"

                            >



                                <div className="flex justify-between">


                                    <h2 className="font-bold text-xl">

                                        {order.services?.icon}

                                        {" "}

                                        {order.services?.title}

                                    </h2>



                                    <OrderStatus

                                        status={order.status}

                                    />

                                    <AdminOrderStatus

                                        orderId={order.id}

                                        currentStatus={order.status}

                                        onUpdate={loadOrders}

                                    />


                                </div>

                                پیام‌ها

                                {orderUnread[order.id] > 0 && (
                                    <span className="bg-red-500 text-white rounded-full px-2">
                                        {orderUnread[order.id]}
                                    </span>
                                )}



                                <div className="mt-3">


                                    <p>

                                        مشتری:

                                        {" "}

                                        {order.profiles?.full_name}

                                    </p>


                                    <p>

                                        تلفن:

                                        {" "}

                                        {order.profiles?.phone}

                                    </p>


                                    <p>

                                        کد پیگیری:

                                        {" "}

                                        {order.tracking_code}

                                    </p>



                                </div>

                                <a
                                    href={`/admin/orders/${order.id}`}
                                    className="block mt-4 text-center bg-[#09967C] text-white p-2 rounded-xl"
                                >
                                    مدیریت سفارش
                                </a>

                                <Link
                                    href="/admin/services"
                                    className="block bg-white rounded-2xl shadow p-5 mb-6 hover:shadow-lg transition"
                                >
                                    <div className="text-xl font-bold">⚙️ مدیریت خدمات</div>
                                    <div className="text-gray-600 mt-1">
                                        ایجاد، ویرایش، حذف و فعال/غیرفعال کردن خدمات
                                    </div>
                                </Link>



                            </div>


                        ))

                    }


                </div>


            </div>


        </div>


    )








}