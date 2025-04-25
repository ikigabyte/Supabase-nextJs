'use client';

import { TodoItem } from "./todo-item";
import { TodoForm } from "./todo-form";
import { Todo } from "@/types/custom";
import { useOptimistic } from "react";
import OrderHeaders from "./order-headers";

export type Action = "delete" | "update" | "create";

export function todoReducer(state: Array<Todo>, { action, todo }: { action: Action; todo: Todo }) {
  switch (action) {
    case "delete":
      return state.filter(({ id }) => id !== todo.id); // deletes the state id
    case "update":
      return state.map((t) => (t.id == todo.id ? todo : t)); // change the current todo
    case "create":
      return [todo, ...state]; // this is at the start of the array
    default:
      return state;
  }
}

export type TodoOptimisticUpdate = (action: { action: Action; todo: Todo }) => void;

export function TodoList({ todos }: { todos: Array<Todo> }) {
  const [optimisticTodos, optimisticTodosUpdate] = useOptimistic(
    todos,
    todoReducer
  );
  return (
    <>
      <TodoForm optimisticUpdate={optimisticTodosUpdate} />
      <div className="w-full flex flex-col gap-0">
        {optimisticTodos?.map((todo) => {
          return (
            <TodoItem
              optimisticUpdate={optimisticTodosUpdate}
              todo={todo}
              key={todo.name_id}
            />
          );
        })}
      </div>
    </>
  );
}

export function OrderList({ todos }: { todos: Array<Todo> }) {
  const [optimisticTodos, optimisticTodosUpdate] = useOptimistic(
    todos,
    todoReducer
  );
  return (
    <>
     
      {/* <TodoForm optimisticUpdate={optimisticTodosUpdate} /> */}

      <div className="w-full flex flex-col gap-0">
      <OrderHeaders
        headers={[
          "Name ID",
          "Shape",
          "Order ID",
          "Quantity",
          "Lamination",
          "Print Method",
          "Due Date",
          "Ship Date",
          "Notes"
        ]}
      />
        {optimisticTodos?.map((todo) => {
          return <TodoItem optimisticUpdate={optimisticTodosUpdate} todo={todo} key={todo.name_id} />;
        })}
      </div>
    </>
  );
}