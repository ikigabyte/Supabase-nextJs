'use client'

import { addTodo } from "@/app/toprint/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useRef } from "react";
import { useFormStatus } from "react-dom";

function FormContent() {
  const { pending } = useFormStatus();
  console.log("pending", pending);
  return (
    <>
      <Textarea
        minLength={4}
        name="todo"
        required
        placeholder="Add a new todo"
      />
      <Button type="submit" size="icon" className="min-w-10" disabled={pending} >
        <Send className="h-5 w-5" />
        <span className="sr-only">Submit Todo</span>
      </Button>
    </>
  );
}

export function TodoForm() {
  const formRef = useRef<HTMLFormElement>(null); // Null by default
  return (
    <Card>
      <CardContent className="p-3">
        <form
          ref={formRef}
          className="flex gap-4"
          action={async (data) => {
            await addTodo(data);
            formRef.current?.reset(); // Reset the form after submission
          }}
        >
          <FormContent />
        </form>
      </CardContent>
    </Card>
  );
}
