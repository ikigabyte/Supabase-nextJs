// import { ButtonOrganizer } from "@/components/button-organizer";
import { OrderOrganizer } from "@/components/order-organizer";
import { Separator } from "@/components/ui/separator";
import { getBrowserClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";

export default async function ToCutPage() {
  // const supabase = getBrowserClient();
  // console.log("INIT:", supabase);
  
  // const {
  //   data: { user },
  //   error,
  // } = await supabase.auth.getUser();
  // if (!user) {
    // redirect("/login");
  
  // console.log("Supabase client", supabase);
  // Fetch orders
  // const { data: orders } = await supabase.from("orders").select().order("due_date", { ascending: false });

  // Extract unique categories from orders

  // Handle category click
  // const handleCategoryClick = (category: string) => {
  //   console.log(`Category clicked: ${category}`);
  // };
  return (
    <div className="w-full overflow-x-auto">
      <section className="p-1 pt-10 w-[95%] flex flex-col gap-2 mb-40 mx-auto">
        <OrderOrganizer orderType="cut" defaultPage="regular" />
      </section>
    </div>
  );
}
