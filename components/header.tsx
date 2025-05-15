import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Input } from "./ui/input";
import { count } from "console";
import { OrderTypes } from "@/utils/orderTypes";
import { Order } from "@/types/custom";
import { SearchBar } from "./search-bar";
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

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let printCount = null;
  let shipCount = null;
  let cutCount = null;
  let packCount = null;

  // if (user == null) {
  //   redirect("/login");
  // }

  // if (user !== null) {

  // }
  // function onSearch(searchTerm: string) {
  //   console.log("Search term:", searchTerm);
  //   console.log("Redirecting to search page with term:", searchTerm);
  //   redirect(`/search/${searchTerm}`);
  // }

  // console.log(printCount); // Use a reducer here
  // console.log("totalOrderCount", totalOrderCount);

  return (
    <header className="z-10 sticky top-0 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <nav className="flex items-center space-x-4 lg:space-x-3">
          <a className="mr-5 flex items-center space-x-2" href="/">
            <span className="font-bold text-sm">Stickerbeat Database</span>
          </a>
          <div className="flex flex-1 items-center justify-end space-x-12">
            {user !== null ? <NavBarElement /> : <Link href="/login"></Link>}
          </div>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {user !== null ? (
            <form action={signOut} className="flex items-center gap-2">
              <Link href="/user" className="text-xs border-b-2 border-black pb-0.5">
                {user.email}
              </Link>
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
