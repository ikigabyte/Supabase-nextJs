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

type DropdownAssigneeProps = {
  users: { email: string; color: string }[];
};

export function DropdownAssignee({
  currentUser,
  users,
  setCurrentUser,
}: {
  currentUser: string;
  users: { email: string; color: string }[];
  setCurrentUser: (user: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild data-ignore-selection="true">
        <Button
          variant="destructive"
          className="h-full px-4 py-4 flex items-center"  // height + vertical padding
        >
          Current Assignee: {currentUser}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Select an assignee</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          data-ignore-selection="true"
          value={currentUser}
          onValueChange={(value) => {
            console.log("Radio changed to:", value);
            setCurrentUser(value);
          }}
        >
          {users.map(({ email }) => (
            <DropdownMenuRadioItem key={email} value={email}>
              {email}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}