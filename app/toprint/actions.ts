"use server"

import { Todo } from "@/types/custom";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function addTodo(formData: FormData){

    // await new Promise((resolve) => {
    //     setTimeout(resolve, 3000);
    // })

    const supabase = await createClient();
    const text = formData.get("todo") as string;
    if (!text) {
        throw new Error("No todo text provided");
    }
    const { data: {user} } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User is not logged in");
    }

    const {error} = await supabase.from("todos").insert({
        task: text,
        user_id: user.id,
    });
    if (error) {
        console.error("Error adding todo", error);
        throw new Error("Error adding todo");
    }

    revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
}

export async function getTodos() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User is not logged in");
  }

  const { data: todos, error } = await supabase
    .from("todos")
    .select()
    .eq("user_id", user.id) // the user id
    .order("inserted_at", { ascending: false });

  if (error) {
    console.error("Error fetching todos", error);
    throw new Error("Error fetching todos");
  }

  return todos;
}

export async function removeTodo(id: number){
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User is not logged in");
  }

  const { error } = await supabase.from("todos").delete().match({
    user_id: user.id, // the user id 
    id: id, // the todo id
  })
  if (error){
    console.error("Error deleting todo", error);
    throw new Error("Error deleting todo");
  }

  revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
}

export async function updateTodo(todo : Todo){
    const supabase = await createClient();
    const { data: {user} } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User is not logged in");
    }

    const { error } = await supabase.from("todos").update(todo).match({
        user_id: user.id, // the user id
        id: todo.id, // the todo id
    });
    revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
}

export async function createOrder(formData: FormData){
  // await new Promise((resolve) => {
  //     setTimeout(resolve, 3000);
  // })

  const supabase = await createClient();
  const text = formData.get("todo") as string;
  if (!text) {
      throw new Error("No todo text provided");
  }
  const { data: {user} } = await supabase.auth.getUser();
  if (!user) {
      throw new Error("User is not logged in");
  }

  const {error} = await supabase.from("orders").insert({
    name_id: text,
    print_method: "Front",
  });
  if (error) {
      console.error("Error adding an order here", error);
      throw new Error("Error adding todo");
  }

  revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
}
