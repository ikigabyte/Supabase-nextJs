import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation"
 
 export default async function UserPage() {
   const supabase = await createClient();
   
   const {
     data: { user },
   } = await supabase.auth.getUser();

   if (!user){
    return redirect('/login')
   }
   return (
    <h1> This is the printing section</h1>
   );
 }
