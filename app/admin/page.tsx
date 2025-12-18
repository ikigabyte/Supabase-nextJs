"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { getBrowserClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";

import {
  deleteAllOrders,
} from "@/utils/actions";
type Role = "user" | "admin";

type ProfileRow = {
  id: string;         // auth.users.id
  identifier: string; // email
  role: Role;
};

type HistoryRow = {
  id: number;
  inserted_at: string;
  name_id: string;
  production_change: string | null;
};

export default function AdminPage() {
  const supabase = getBrowserClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [active, setActive] = useState<ProfileRow | null>(null);

  // Full history for selected user (all time), and the filtered view we render
  const [fullHistory, setFullHistory] = useState<HistoryRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Date filter UI
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) return router.replace("/login");

      const { data: me, error: meErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (meErr || me?.role !== "admin") return router.replace("/");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, identifier, role")
        .order("identifier", { ascending: true });

      if (!cancelled) {
        if (error) {
          console.error("Failed to load users:", error);
          setUsers([]);
        } else {
          setUsers((data ?? []) as ProfileRow[]);
        }
        setLoading(false);
      }
    };

    boot();
    return () => { cancelled = true; };
  }, [router, supabase]);

  // Load full history for a user (all time)
  const loadHistory = async (profile: ProfileRow) => {
    setActive(profile);
    console.log("Loading history for", profile.identifier);
    console.log("Loading history for", profile.id);
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("history")
      .select("id, inserted_at, name_id, production_change")
      .eq("user_id", profile.id)
      .order("inserted_at", { ascending: false });
    console.log(data, error);
    if (error) {
      console.error("Failed to load history:", error);
      setFullHistory([]);
      setHistory([]);
    } else {
      const rows = (data ?? []) as HistoryRow[];
      setFullHistory(rows);
      // apply current date filter immediately
      setHistory(applyDateFilter(rows, selectedDate));
    }
    setLoadingHistory(false);
  };

  // Helper: filter by selected date (midnight..next midnight in local time)
  function applyDateFilter(rows: HistoryRow[], date: Date | null) {
    if (!date) return rows;
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return rows.filter((r) => {
      const t = new Date(r.inserted_at);
      return t >= start && t < end;
    });
  }

  // Counters: today and all-time (always based on fullHistory)
  const clicksAllTime = fullHistory.length;
  const clicksToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return fullHistory.filter((h) => new Date(h.inserted_at) >= start).length;
  }, [fullHistory]);

  // Apply/Clear actions
  const onApplyDate = () => setHistory(applyDateFilter(fullHistory, selectedDate));
  const onClearDate = () => {
    setSelectedDate(null);
    setHistory(fullHistory);
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin • Users</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users (Email + Role) */}
        <div className="overflow-x-auto border rounded">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow
                  key={u.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => loadHistory(u)}
                  onKeyDown={(e) => e.key === "Enter" && loadHistory(u)}
                  className={`cursor-pointer ${active?.id === u.id ? "bg-blue-50" : ""}`}
                >
                  <TableCell className="font-mono">{u.identifier}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
                      u.role === "admin" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {u.role}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-sm text-muted-foreground">
                    No users.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Activity for selected user */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold mr-2">
              {active ? `Activity • ${active.identifier}` : "Select a user to view activity"}
            </h2>
          </div>

          {active && (
            <>
              {/* Counters + Date filter toolbar */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="rounded border px-4 py-3 bg-emerald-50 text-emerald-700">
                  <div className="text-xs uppercase tracking-wide">Clicked today</div>
                  <div className="text-2xl font-bold">{clicksToday}</div>
                </div>
                <div className="rounded border px-4 py-3 bg-slate-50">
                  <div className="text-xs uppercase tracking-wide text-slate-600">Clicked all time</div>
                  <div className="text-2xl font-bold">{clicksAllTime}</div>
                </div>

                {/* Date picker + buttons (beside the counters) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="ml-auto">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate ?? undefined}
                      onSelect={(d) => setSelectedDate(d ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Button variant="secondary" onClick={onApplyDate}>Apply</Button>
                <Button variant="ghost" onClick={onClearDate}>Clear</Button>
              </div>

              {/* Orders table (filtered by date if selected) */}
              <div className="overflow-x-auto border rounded">
                {loadingHistory ? (
                  <div className="p-4 text-sm text-muted-foreground">Loading history…</div>
                ) : (
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Production change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(h.inserted_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono">
                            {h.name_id.length > 30 ? `${h.name_id.slice(0, 30)}…` : h.name_id}
                          </TableCell>
                          <TableCell>{h.production_change ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                      {history.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-sm text-muted-foreground">
                            No orders for the selected date.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <Button
        variant="destructive"
        disabled={loadingHistory}
        onClick={async () => {
          // Disable button while deleting
          setLoadingHistory(true);
          await deleteAllOrders();
          setLoadingHistory(false);
        }}
      >
        Reset Log
      </Button>
        </div>
  );
}