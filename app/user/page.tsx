// import { TodoList } from "@/components/todo-list";
 
import { Separator } from "@/components/ui/separator";
import { UserOrders } from "@/components/user-orders";
import { createClient } from "@/utils/supabase/server";
 
 export default async function UserPage() {
   const supabase = await createClient();
   const {
     data: { user },
   } = await supabase.auth.getUser();

   return (
     <>
       <UserOrders/>
     </>
   );
 }
