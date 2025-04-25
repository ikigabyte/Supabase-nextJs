import { OrderList, TodoList } from "@/components/todo-list";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation"
 
 export default async function ToPrintPage() {
   const supabase = await createClient();

   const {
     data: { user },
   } = await supabase.auth.getUser();

   if (!user) {
     return redirect("/login");
   }

   // Table name
   const { data: orders } = await supabase.from("orders").select().order("due_date", { ascending: false });
  //  console.log(todos);
   return (
    <section className="p-2 pt-3 max-w-8xl w-[90%] flex flex-col gap-2">
       <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">To Print</h1>
       <Separator className="w-full " />
       {/* <TodoList todos={orders ?? []} /> */}
       <OrderList todos={orders ?? []} />
     </section>
   );
 }

   {/* <h1> This is the printing section</h1>; */}
