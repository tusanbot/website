import { redirect } from "next/navigation";

export const metadata = {
  title: "خدمات کافی‌نت توسن",
  description: "دسته‌بندی و خدمات کافی‌نت توسن در یک ساختار یکپارچه.",
  alternates: { canonical: "https://www.tusancn.ir/services" },
};

export default function ServiceCategoriesPage() {
  redirect("/services");
}
