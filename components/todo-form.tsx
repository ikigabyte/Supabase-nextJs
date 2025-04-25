'use client'

import { addTodo, createOrder } from "@/app/toprint/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { TodoOptimisticUpdate } from "./todo-list";
import { Todo, Order } from "@/types/custom";
import { todo } from "node:test";

function FormContent() {
  const { pending } = useFormStatus();
  // console.log("pending", pending);
  return (
    <>
      <Textarea minLength={4} name="todo" required placeholder="Add a new todo" />
      <Button type="submit" size="icon" className="min-w-10" disabled={pending}>
        <Send className="h-5 w-5" />
        <span className="sr-only">Submit Todo</span>
      </Button>
    </>
  );
}

export function TodoForm({ optimisticUpdate }: { optimisticUpdate: TodoOptimisticUpdate }) {
  const formRef = useRef<HTMLFormElement>(null); // Null by default
  return (
    <Card>
      <CardContent className="p-3">
        <form
          ref={formRef}
          className="flex gap-1"
          action={async (data) => { // Fake todo for the ui instantly
            // const newTodo : Order = {
            //   id: -1, // useful for optimistic update
            //   inserted_at: "",
            //   user_id: "",
            //   task: data.get("todo") as string,
            //   is_complete: false,
            //   date: null,
            //   due_date: null,
            // }
     const newTodo: Order = {
        name_id: "hello",
        // order_key: -1,
        order_id: -1,
        print_method: "",
        shape: "",
        quantity: null,
        lamination: null,
        production_status: null,
        notes: data.get("todo") as string,
        due_date: null,
        ihd_date: null,
        history: [], // initialize with empty history
      };
            optimisticUpdate({action : "create", todo: newTodo})
            await createOrder(data);
            // await addTodo(data);
            formRef.current?.reset(); // Reset the form after submission
          }}
        >
          <FormContent />
        </form>
      </CardContent>
    </Card>
  );
}
 