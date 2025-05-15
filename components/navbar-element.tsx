'use client'

import Link from "next/link";

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";

import { useRouter } from "next/navigation";
import type { Session } from '@supabase/supabase-js';
// import { Session } from "inspector";

interface NavBarElementProps {
  onSearch: (searchTerm: string) => void;
}

export function NavBarElement() {
  const router = useRouter();

  const handleSearch = (query: string) => {
    console.log("Search query:", query);
    router.push(`/search?query=${query}`);
  };

  // console.log(supabase)
  
  const [counts, setCounts] = useState({ print: 0, cut: 0, pack: 0, ship: 0 });

  const supabase = createClientComponentClient();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // console.log('Session:', session);
      // console.log('Session:', session, 'Error:', error);
      setSession(session);
    });
  }, []);

  // supabase
  // .from("orders")
  // .select()
  // // .eq("production_status", orderType)
  // .order("due_date", { ascending: false })
  // .order("order_id", { ascending: false })
  // .then(({ data }) => console.log(data));

  useEffect(() => {
    const fetchCounts = async () => {
      const statuses = ["print", "cut", "pack", "ship"] as const;
      const newCounts: Record<typeof statuses[number], number> = { print: 0, cut: 0, pack: 0, ship: 0 };
      await Promise.all(
        statuses.map(async (status) => {
          const { data, count, error } = await supabase
          .from("orders")
          .select("*", { count: 'exact' })
          .eq("production_status", status)
          .limit(0);
        
        // console.log(`Status ${status}:`, { count, error });
        newCounts[status] = count ?? 0;
          // Debug: fetch sample data for this status
          const { data: sampleData, error: sampleError } = await supabase
            .from("orders")
            .select("*")
            .eq("production_status", status)
            .limit(5);
          // console.log(`Sample data for status '${status}':`, sampleData, sampleError);
        })
      );
      // console.log("Counts fetched:", newCounts);
      setCounts(newCounts);
    };
    fetchCounts();
    const channel = supabase
      .channel("orders_counts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, fetchCounts)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, fetchCounts)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, fetchCounts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="flex items-center gap-5 text-xs font-medium">
      <Link id="to-print" href="/toprint?rush">
        To Print ({counts.print})
      </Link>
      <Link id="to-cut" href="/tocut?regular">
        To Cut ({counts.cut})
      </Link>
      <Link id="to-pack" href="/topack?regular">
        To Pack ({counts.pack})
      </Link>
      <Link id="to-ship" href="/toship?regular">
        To Ship ({counts.ship})
      </Link>
      <Link id="completed" href="/completed">
        Completed
      </Link>
      <Link id="timeline" href="/timeline">
        Timeline
      </Link>
      <Link id="search" href="/search">
        Search
      </Link>
    </div>
  );
}
