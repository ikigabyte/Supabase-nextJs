'use client';

import { TodoItem } from "./todo-item";
import { TodoForm } from "./todo-form";
import { Todo, Order } from "@/types/custom";
import { useOptimistic } from "react";
import OrderHeaders from "./order-headers";
import { OrderColumnTable } from "./order-table";

export type Action = "delete" | "update" | "create";

export function todoReducer(state: Array<Order>, { action, todo }: { action: Action; todo: Order }) {
  switch (action) {
    case "delete":
      return state.filter(({ name_id }) => name_id !== todo.name_id); // deletes the state id
    case "update":
      return state.map((t) => (t.name_id === todo.name_id ? todo : t)); // change the current todo
    case "create":
      return [todo, ...state]; // this is at the start of the array
    default:
      return state;
  }
}

export type TodoOptimisticUpdate = (action: { action: Action; todo: Order }) => void;

export function TodoList({ todos }: { todos: Array<Order> }) {
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

export function OrderList({ todos }: { todos: Array<Order> }) {
  const [optimisticTodos, optimisticTodosUpdate] = useOptimistic(
    todos,
    todoReducer
  );
  return (
    <>
      {/* <TodoForm optimisticUpdate={optimisticTodosUpdate} /> */}
      <div className="w-full flex flex-col gap-0">
        {optimisticTodos?.map((todo) => {
          return <OrderColumnTable data={todo} key={todo.name_id} />;
        })}
      </div>
    </>
  );
}

// return <OrderList optimisticUpdate={optimisticTodosUpdate} todo={todo} key={todo.name_id} />;

   {/* <OrderHeaders
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
      /> */}