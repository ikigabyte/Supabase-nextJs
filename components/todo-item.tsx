"use client";

import { removeTodo, updateTodo } from "@/app/toprint/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Todo, Order } from "@/types/custom";
import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { TodoOptimisticUpdate } from "./todo-list";
import { useState } from "react";

export function TodoItem({ todo, optimisticUpdate }: { todo: Order; optimisticUpdate: TodoOptimisticUpdate }) {
  return (
    <form>
      <TodoCard optimisticUpdate={optimisticUpdate} todo={todo} />
    </form>
  );
}

export function TodoCard({ todo, optimisticUpdate }: { todo: Order; optimisticUpdate: TodoOptimisticUpdate }) {
  const { pending } = useFormStatus();
  const [checked, setChecked] = useState(todo.is_complete);

  return (
    <Card className={cn("w-full", pending && "opacity-50")}>
      <CardContent className="overflow-x-auto p-3">
        <div className="grid grid-cols-12 gap-2 w-full text-center flex-nowrap">
          <p className="pt-1 min-w-0 break-words flex-1 border-r col-span-2">{todo.name_id || ""}</p>
          <p className="pt-1 min-w-0 break-words flex-1 border-r">{todo.shape || ""}</p>
          <p className="pt-1 min-w-0 break-words flex-1 border-r">{todo.order_id || ""}</p>
          <p className="pt-1 min-w-0 break-words flex-1 border-r">{todo.quantity || ""}</p>
          <p className="pt-1 min-w-0 break-words flex-1 border-r">{todo.lamination || ""}</p>
          <p className="pt-1 min-w-0 break-words flex-1 border-r">{todo.print_method || ""}</p>
          <p className="pt-1 min-w-0 break-words flex-1 border-r">{todo.due_date || ""}</p>
          <p className="pt-1 min-w-0 break-words flex-1 border-r">{todo.ship_date || ""}</p>
          <textarea
            className="pt-1 min-w-0 break-words flex-1 col-span-2 border resize-none h-10"
            defaultValue={todo.notes || ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                console.log("Enter pressed");
                // updateTodo({ ...todo, notes: e.currentTarget.value });
              }
            }}
            disabled={pending}
          />
          <span className="pt-1 min-w-0 break-words flex-1 border-r flex items-center justify-center">
            <Checkbox
              disabled={pending}
              checked={Boolean(checked)}
              onCheckedChange={async (val) => {
                if (val === "indeterminate") return;
                setChecked(val);
                await updateTodo({ ...todo, is_complete: val });
              }}
            />
          </span>
          <span className="pt-1 min-w-0 break-words flex-1 flex items-center justify-center">
            {/* <Button
              disabled={pending}
              formAction={async (data) => {
                optimisticUpdate({ action: "delete", todo });
                await removeTodo(todo.id);
              }}
              variant="ghost"
              size="icon"
            >
              <Trash2 className="h-5 w-5" />
              <span className="sr-only">Delete Todo</span>
            </Button> */}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
