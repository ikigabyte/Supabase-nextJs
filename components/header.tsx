import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Input } from "./ui/input";
import { count } from "console";
import { OrderTypes } from "@/utils/orderTypes";
import { Order } from "@/types/custom";

// import {}
// import { SearchBar } from "./search-bar";
// import { redirect } from "next/dist/server/api-utils";

// import { redirect } from 'next/navigation'
import { redirect } from "next/navigation";
import { NavBarElement } from "./navbar-element";

function getProductionCounts(orders: Order[], orderTypes: OrderTypes[]): Record<string, number> {
  return orderTypes.reduce((acc, category) => {
    const count = orders.filter((order) => order.material?.toLowerCase() === category.toLowerCase()).length;
    acc[category] = count;
    return acc;
  }, {} as Record<string, number>);
}

const getInitals = (name: string) => {
    return name[0].charAt(0).toUpperCase();
}

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="z-10 sticky top-0 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <nav className="flex items-center space-x-4 lg:space-x-3">
          <a className="mr-5 flex items-center space-x-2" href="/">
            <img src="/stickerbeat-logo.png" alt="Stickerbeat Logo" className="h-8 w-8" />
          </a>
          <div className="flex flex-1 items-center justify-end space-x-12">
            {user !== null ? <NavBarElement /> : <Link href="/login"></Link>}
          </div>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {user !== null ? (
            <form action={signOut} className="flex items-center gap-2">
              <Button
                asChild
                size="icon"
                className="rounded-full w-8 h-8 p-0 flex items-center justify-center text-xs font-bold border border-black"
                title={user.email}
              >
                <Link href="/user">{getInitals(user.email || "User")}</Link>
              </Button>
              <Button size="sm">Sign Out</Button>
            </form>
          ) : (
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
