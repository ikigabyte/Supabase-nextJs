import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCorrectUserColor } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";

export function DropdownAssignee({
  currentUser,
  users,
  setCurrentUser,
  userRows,
}: {
  currentUser: string;
  users: { email: string; color: string; position: string | null }[];
  setCurrentUser: (user: string) => void;
  userRows: Map<string, { color: string; position: string | null }>;
}) {
  // memoize so roleKeys doesn't churn every render
  const isNAUser = (u: { email: string }) => u.email.trim().toLowerCase() === "n/a";

  const naUser = useMemo(() => users.find(isNAUser) ?? null, [users]);
  const usersWithoutNA = useMemo(() => users.filter((u) => !isNAUser(u)), [users]);

  const usersByPosition = useMemo(() => {
    return usersWithoutNA.reduce<Record<string, typeof users>>((acc, user) => {
      const raw = user.position?.trim();
      const position = raw && raw.length > 0 ? raw.toLowerCase() : "unassigned";
      (acc[position] ??= []).push(user);
      return acc;
    }, {});
  }, [usersWithoutNA]);

  // Ensure "unassigned" is always the last group
  const positionKeys = useMemo(() => {
    const keys = Object.keys(usersByPosition).filter((k) => k !== "unassigned");
    if (usersByPosition["unassigned"]) keys.push("unassigned");
    return keys;
  }, [usersByPosition]);


  // controlled open state, default collapsed
  const [openPositions, setOpenPositions] = useState<Record<string, boolean>>({});
  // console.log(openPositions);
  // ensure new roles start collapsed, remove stale roles
  useEffect(() => {
    setOpenPositions((prev) => {
      const next: Record<string, boolean> = {};
      for (const position of positionKeys) next[position] = prev[position] ?? false; // collapsed by default
      return next;
    });
  }, [positionKeys]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild data-ignore-selection="true">
        <Button
          variant="outline"
          className="rounded-full w-8 h-8 p-0 flex items-center justify-center text-white text-sm"
          style={{ backgroundColor: getCorrectUserColor(userRows, currentUser).backgroundColor }}
        >
          {currentUser
            .split("@")[0]
            .split(/[.\-_]/)
            .map((p) => p[0]?.toUpperCase())
            .join("")
            .slice(0, 2)}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" side="right" align="end">
        <DropdownMenuLabel>Select a User</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup value={currentUser} onValueChange={setCurrentUser}>
          {naUser && (
            <DropdownMenuRadioItem value={naUser.email} className="flex items-center gap-3">
              <span
                className="flex items-center justify-center rounded-full w-6 h-6 min-w-6 min-h-6 text-white text-sm"
                style={{ backgroundColor: naUser.color }}
              >
                NA
              </span>
              N/A
            </DropdownMenuRadioItem>
          )}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <ScrollArea className="max-h-72 w-full overflow-auto">
          {positionKeys.map((position) => (
            <Collapsible
              key={position}
              open={openPositions[position] ?? false} // never undefined, always pre-collapsed
              onOpenChange={(open) => setOpenPositions((prev) => ({ ...prev, [position]: open }))}
              className="mb-2"
            >
              <div className="flex items-center justify-between px-2">
                <span className="font-semibold text-sm capitalize">{position}</span>
                <CollapsibleTrigger asChild>
                  <Button
                    data-ignore-selection="true"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ChevronsUpDown className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent
                data-ignore-selection="true"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuRadioGroup value={currentUser} onValueChange={setCurrentUser}>
                  {(usersByPosition[position] ?? []).map(({ email, color }, idx) => (
                    <DropdownMenuRadioItem
                      key={`${email}-${position}-${idx}`}
                      value={email}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="flex items-center justify-center rounded-full w-6 h-6 min-w-6 min-h-6 text-white text-sm"
                        style={{ backgroundColor: color }}
                      >
                        {email
                          .split("@")[0]
                          .split(/[.\-_]/)
                          .map((p) => p[0]?.toUpperCase())
                          .join("")
                          .slice(0, 2)}
                      </span>
                      {email.split("@")[0]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
