// import { TodoList } from "@/components/todo-list";
 import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
 
 export default async function UserPage() {
   const supabase = await createClient();
   const {
     data: { user },
   } = await supabase.auth.getUser();

   return (
     <>
       <h1>
         Hello {user?.email}
         <Separator className="w-full " />
       </h1>
       <p> Here are your recently clicked orders * Find a way to display the orders of the user that was clicked similar to todos </p>
     </>
   );
 }
