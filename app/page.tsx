import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 font-archivo">
      <div className="flex w-full max-w-xs flex-col gap-4">
        <Button
          asChild
          size="lg"
          className="h-14 bg-[#76C043] text-base font-semibold uppercase tracking-[0.18em] text-white hover:bg-[#5fa032]"
        >
          <Link href="/tracking">Tracking</Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-14 border-zinc-300 bg-white text-base font-semibold uppercase tracking-[0.18em] text-zinc-900 hover:bg-zinc-100"
        >
          <Link href="/empty">Empty</Link>
        </Button>
        <Link
          href="/database"
          className="text-center text-sm font-medium uppercase tracking-[0.18em] text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline"
        >
          Login
        </Link>
      </div>
    </main>
  );
}
