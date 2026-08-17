"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TestServices() {

    useEffect(() => {

        async function test() {

            const { data, error } = await supabase
                .from("services")
                .select("*");


            console.log("DATA:", data);
            console.log("ERROR:", error);

        }


        test();

    }, []);


    return (
        <div className="p-10">
            تست خدمات
        </div>
    );
}