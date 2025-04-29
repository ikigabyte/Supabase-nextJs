"use server"

import { Order } from "@/types/custom";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const getNewStatus = (currentStatus: string) => {
  switch (currentStatus) {
    case "print":
      return "cut";
    case "cut":
      return "pack";
    case "pack":
      return "ship";
    case "ship":
      return "completed";
    default:
  }
}

const getTimeStamp = () => {
  const timestamp = new Date().toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return timestamp;
}

async function addHistoryForUser(userId: string, orderId: string, newStatus: string) {
  const supabase = await createClient();
  const { data: {user} } = await supabase.auth.getUser();
  if (!user) {
      throw new Error("User is not logged in");
  }
  const { error } = await supabase.from("history").insert({
    user_id: user.id,
    order_id: parseInt(orderId),
    production_status: newStatus,
  }); // * It time stamps automatically
  
  if (error) {
      console.error("Error adding todo", error);
      throw new Error("Error adding todo");
  }

  // revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
}

// export async function addTodo(formData: FormData){

//     // await new Promise((resolve) => {
//     //     setTimeout(resolve, 3000);
//     // })

//     const supabase = await createClient();
//     const text = formData.get("todo") as string;
//     if (!text) {
//         throw new Error("No todo text provided");
//     }
//     const { data: {user} } = await supabase.auth.getUser();
//     if (!user) {
//         throw new Error("User is not logged in");
//     }

//     const {error} = await supabase.from("todos").insert({
//         task: text,
//         user_id: user.id,
//     });
//     if (error) {
//         console.error("Error adding todo", error);
//         throw new Error("Error adding todo");
//     }

//     revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
// }

// export async function getTodos() {
//   const supabase = await createClient();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user) {
//     throw new Error("User is not logged in");
//   }

//   const { data: todos, error } = await supabase
//     .from("todos")
//     .select()
//     .eq("user_id", user.id) // the user id
//     .order("inserted_at", { ascending: false });

//   if (error) {
//     console.error("Error fetching todos", error);
//     throw new Error("Error fetching todos");
//   }

//   return todos;
// }

// export async function removeTodo(id: number){
//   const supabase = await createClient();

//   const {
//     data: { user },
//   } = await supabase.auth.getUser();
//   if (!user) {
//     throw new Error("User is not logged in");
//   }

//   const { error } = await supabase.from("todos").delete().match({
//     user_id: user.id, // the user id 
//     id: id, // the todo id
//   })
//   if (error){
//     console.error("Error deleting todo", error);
//     throw new Error("Error deleting todo");
//   }

//   revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
// }

// export async function updateTodo(todo: Todo) {
//   const supabase = await createClient();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user) {
//     throw new Error("User is not logged in");
//   }

//   const { error } = await supabase.from("todos").update(todo).match({
//     user_id: user.id, // the user id
//     id: todo.id, // the todo id
//   });
//   revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
// }

export async function updateOrderStatus(order: Order, property: string) {
  if (order == null) {
    console.error("No order provided");
    throw new Error("No order provided");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User is not logged in");
  }
  
  // console.log("Updating order", order);
  const newStatus = getNewStatus(order.production_status || "");
  if (!newStatus) {
    console.error("No new status found");
    throw new Error("No new status found");
  }

  await addHistoryForUser(user.id, order.name_id, newStatus);
  // if (true) return;

  if (newStatus === "completed") {
    try{
      await supabase.rpc("move_order", { p_id: order.name_id });
    } catch (error) {
      console.error("Error moving order", error);
      throw new Error("Error moving order");
    }
    console.log("Order archived successfully");
    return
  }
  // Retrieve existing history JSONB
  const { data: existingRecord, error: historyError } = await supabase
    .from("orders")
    .select("history")
    .eq("name_id", order.name_id)
    .single();
  if (historyError) {
    console.error("Error fetching history", historyError);
    throw new Error("Error fetching history");
  }
  // Ensure history is an array of strings
  const history: string[] = Array.isArray(existingRecord?.history)
    ? (existingRecord.history as string[])
    : [];
  // console.log("Existing history:", history);

  // Build timestamped history entry
  const timestamp = getTimeStamp();
  const userEmail = user.email || user.id;
  const newEntry = `${userEmail} moves to "${newStatus}" on ${timestamp}`;
  history.push(newEntry);
  console.log("Updated history:", history);
  
  // console.log(order.name_id);
  const { error } = await supabase
    .from("orders")
    .update({ ...order, production_status: newStatus, history })
    .match({ name_id: order.name_id });
  if (error) {
    console.error("Error updating todo", error);
    throw new Error("Error updating todo");
  }

  console.log("Order updated successfully, new status:", newStatus);
  // revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
}

export async function updateOrderNotes(order : Order, newNotes : string){
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User is not logged in");
  }
  console.log(user);

  console.log(newNotes);

  const { error } = await supabase
    .from("orders")
    .update({ ...order, notes: newNotes })
    .match({ name_id: order.name_id });

  if (error) {
    console.error("Error updating todo", error);
    throw new Error("Error updating todo");
  }
  console.log("Order updated successfully");
  
}

export async function createOrder(formData: FormData) {
  // await new Promise((resolve) => {
  //     setTimeout(resolve, 3000);
  // })

  const supabase = await createClient();
  const text = formData.get("todo") as string;
  if (!text) {
    throw new Error("No todo text provided");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User is not logged in");
  }

  const { error } = await supabase.from("orders").insert({
    name_id: text,
    print_method: "Front",
  });
  if (error) {
    console.error("Error adding an order here", error);
    throw new Error("Error adding todo");
  }

  revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
}
