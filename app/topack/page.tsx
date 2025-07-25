// import { ButtonOrganizer } from "@/components/button-organizer";
import { OrderOrganizer } from "@/components/order-organizer";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function ToPrintPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("User not found, redirecting to login");
    redirect("/login");
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
      <section className="p-1 pt-10 w-[95%] min-w-[1650px] flex flex-col gap-2 mb-40 mx-auto">
        <OrderOrganizer orderType="pack" defaultPage="regular" />
      </section>
    </div>
  );
}
