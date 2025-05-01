// import { ButtonOrganizer } from "@/components/button-organizer";
import { OrderOrganizer } from "@/components/order-organizer";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {Construction} from "lucide-react";

export default async function ToPrintPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("User not found, redirecting to login");
    return redirect("/login");
  }

  // Fetch orders
  // const { data: orders } = await supabase.from("orders").select().order("due_date", { ascending: false });

  // Extract unique categories from orders

  // Handle category click
  // const handleCategoryClick = (category: string) => {
  //   console.log(`Category clicked: ${category}`);
  // };
  return (
    <div className="flex items-center justify-center h-screen">
      <Construction className="mr-5" />
      <h1>Work in Progress..</h1>
    </div>
    // <section className="p-2 pt-10 max-w-8xl w-[90%] flex flex-col gap-2">
    //   <OrderOrganizer orderType="print" defaultPage="white"/>
    // </section>
  );
}
