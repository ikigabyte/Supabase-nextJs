import { TodoList } from "@/components/todo-list";
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
   const { data: todos } = await supabase.from("todos").select().order("inserted_at", { ascending: false });
   console.log(todos);
   return (
     <section className="p-3 pt-6 max-w-2xl w-full flex flex-col gap-4">
       <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">To Print</h1>

       <Separator className="w-full " />
       <TodoList todos={todos ?? []} />
     </section>
   );
 }

   {/* <h1> This is the printing section</h1>; */}
