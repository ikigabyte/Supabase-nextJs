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
import { redirect } from 'next/navigation'

function getProductionCounts(
  orders: Order[],
  orderTypes: OrderTypes[]
): Record<string, number> {
  return orderTypes.reduce((acc, category) => {
    const count = orders.filter(
      (order) =>
        order.material?.toLowerCase() === category.toLowerCase()
    ).length;
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

  if (user !== null) {

    //! Is this a server or a client component?
    console.log("user", user);
    const { count: toPrintCount } = await supabase
      .from("orders")
      .select("*", { count: "exact" })

    // const { count: toShipCount } = await supabase
    //   .from("orders")
    //   .select("*", { count: "exact" })
    //   .eq("production_status", "ship");
    // const { count: toCutCount } = await supabase
    //   .from("orders")
    //   .select("*", { count: "exact" })
    //   .eq("production_status", "cut");

    // const { count: toPackCount } = await supabase
    //   .from("orders")
    //   .select("*", { count: "exact" })
    //   .eq("production_status", "pack");

    // console.log("count", toPrintCount);
    printCount = toPrintCount;
    // shipCount = toShipCount;
    // cutCount = toCutCount;
    // packCount = toPackCount;

  }

  const onSearch = (searchTerm: string) => {
    console.log("Search term:", searchTerm);
    redirect(`/search/${searchTerm}`);
    // redirect(302, `/search/${searchTerm}`);
    
  }

  // console.log(printCount); // Use a reducer here
  // console.log("totalOrderCount", totalOrderCount);
  
  return (
    <header className="z-10 sticky top-0 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <nav className="flex items-center space-x-4 lg:space-x-3">
          <a className="mr-5 flex items-center space-x-2" href="/">
            <span className="font-bold text-sm">Stickerbeat Database v1.15</span>
          </a>
          <div className="flex flex-1 items-center justify-end space-x-12">
            {user !== null ? (
              <div className="flex items-center gap-5 text-xs font-medium">
                <Link href="/toprint?white">To Print {printCount !== null ? `(${printCount})` : ""}</Link>
                <Link href="/tocut?regular">To Cut {cutCount !== null && `(${cutCount})`}</Link>
                <Link href="/topack?regular">To Pack {packCount !== null && `(${packCount})`}</Link>
                <Link href="/topack?regular">To Ship {shipCount !== null && `(${shipCount})`}</Link>
                <Link href="/timeline">Timeline</Link>
                <Link href="/completed">Completed</Link>
                <SearchBar />
                {/* <Link href="/timeline">Timeline</Link> */}
              </div>
            ) : (
              <Link href="/"></Link>
            )}
          </div>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {user !== null ? (
            <form action={signOut} className="flex items-center gap-2">
              <Link href="/user">{user.email}</Link>
              <Button>Sign Out</Button>
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
