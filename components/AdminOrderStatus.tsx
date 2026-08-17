"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";


const statuses = [
    {
        value: "registered",
        label: "ثبت شده"
    },
    {
        value: "checking",
        label: "در حال بررسی"
    },
    {
        value: "need_documents",
        label: "نیاز به مدارک"
    },
    {
        value: "processing",
        label: "در حال انجام"
    },
    {
        value: "ready",
        label: "آماده تحویل"
    },
    {
        value: "completed",
        label: "تکمیل شده"
    },
    {
        value: "cancelled",
        label: "لغو شده"
    }
];


export default function AdminOrderStatus({

    orderId,
    currentStatus,
    onUpdate

}: {

    orderId: string;
    currentStatus: string;
    onUpdate: () => void;

}) {


    const [status, setStatus] = useState(currentStatus);

    const [loading, setLoading] = useState(false);



    async function saveStatus() {


        if (status === currentStatus) {

            alert("وضعیت تغییری نکرده است");

            return;

        }



        setLoading(true);



        const { error: updateError } = await supabase

            .from("orders")

            .update({

                status

            })

            .eq(
                "id",
                orderId
            );



        if (updateError) {

            alert(updateError.message);

            setLoading(false);

            return;

        }



        const { error: historyError } = await supabase

            .from("order_history")

            .insert({

                order_id: orderId,

                old_status: currentStatus,

                new_status: status,

                description: "تغییر وضعیت سفارش توسط مدیر"

            });



        if (historyError) {

            console.log(historyError);

            alert(
                "وضعیت تغییر کرد ولی تاریخچه ثبت نشد"
            );

        }
        else {

            alert(
                "وضعیت سفارش تغییر کرد"
            );

        }



        onUpdate();


        setLoading(false);


    }




    return (

        <div className="flex gap-2 items-center">


            <select

                value={status}

                onChange={
                    e => setStatus(e.target.value)
                }

                className="border rounded p-2"

            >

                {
                    statuses.map(item => (

                        <option

                            key={item.value}

                            value={item.value}

                        >

                            {item.label}

                        </option>

                    ))
                }


            </select>



            <button

                onClick={saveStatus}

                disabled={loading}

                className="bg-[#09967C] text-white px-4 py-2 rounded"

            >

                {
                    loading
                        ?
                        "در حال ذخیره..."
                        :
                        "ثبت تغییر"
                }

            </button>


        </div>

    );


}