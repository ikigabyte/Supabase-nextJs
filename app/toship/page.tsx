// import { ButtonOrganizer } from "@/components/button-organizer";
import { OrderOrganizer } from "@/components/order-organizer";
import { Separator } from "@/components/ui/separator";
import { getServerClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function ToShipPage() {
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
    <div className="w-full overflow-x-auto">
      <section className="p-1 pt-10 w-[95%] flex flex-col gap-2 mb-40 mx-auto">
        <OrderOrganizer orderType="ship" defaultPage="regular" />
      </section>
    </div>
  );
}
