'use server'

// import { ButtonOrganizer } from "@/components/button-organizer";
import { OrderOrganizer } from "@/components/order-organizer";
import { Separator } from "@/components/ui/separator";
import { getServerClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Construction } from "lucide-react";
import { TimelineOrders } from "@/components/timeline-display";

export default async function ToPrintPage() {
  const supabase = await getServerClient();

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
    <>
      {/* <Construction className="mr-5" /> */}
      {/* <h1 className="font-bold text-3xl "> Timeline Orders </h1> */}
      <TimelineOrders />
    </>
    // <section className="p-2 pt-10 max-w-8xl w-[90%] flex flex-col gap-2">
    //   <OrderOrganizer orderType="print" defaultPage="white"/>
    // </section>
  );
}
