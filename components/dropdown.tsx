import { ReactNode } from "react";
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

export function DropdownAssignee({
  currentUser,
  users,
  setCurrentUser,
  userRows,
  trigger,
}: {
  currentUser: string;
  users: { email: string; color: string; position: string | null }[];
  setCurrentUser: (user: string) => void;
  userRows: Map<string, { color: string; position: string | null }>;
  trigger?: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild data-ignore-selection="true">
        {trigger ?? (
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
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72" side="right" align="end">
        <DropdownMenuLabel>Select a User</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-72 overflow-y-auto">
          <DropdownMenuRadioGroup value={currentUser} onValueChange={setCurrentUser}>
            {users.map((user) => {
              const isNA = user.email.trim().toLowerCase() === "n/a";
              return (
                <DropdownMenuRadioItem
                  key={user.email}
                  value={user.email}
                  data-ignore-selection="true"
                  className="flex w-full items-center justify-between gap-4"
                >
                  <span className="min-w-0 flex-1 truncate">{isNA ? "N/A" : user.email.split("@")[0]}</span>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">
                    {isNA ? "—" : user.position?.trim() || "Unassigned"}
                  </span>
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
