'use server'

import { Order } from "@/types/custom";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { OrderTypes } from "./orderTypes";

import { updateZendeskStatus } from "@/utils/google-functions";

const getNewStatus = (currentStatus: string, revert: boolean) => {
  if (revert) {
    switch (currentStatus) {
      case "cut":
        return "print";
      case "pack":
        return "cut";
      case "ship":
        return "pack";
      case "completed":
        return "ship";
      default:
        return null;
    }
  } else {
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
        return null;
    }
  }
};

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

async function getSiblingOrders(orderId: number, newStatus : string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_id", orderId);
  if (error) {
    console.error("Error fetching orders for order_id", orderId, error);
    throw new Error("Error fetching orders");
  }

  // console.log("Fetched orders for order_id", orderId, data);
  // Inserted logic to build statuses and check if all equal newProductionStatus
  const statuses = (data ?? []).map(o => o.production_status);
  console.log("Statuses", statuses);
  if (statuses.length > 0 && statuses.every(s => s === newStatus)) {
    console.log("ready to update zendesk order");
    return true
  }
  return false
}

async function addHistoryForUser(nameid: string, newStatus: string, previousStatus : string) {
  const supabase = await createClient();
  const { data: {user} } = await supabase.auth.getUser();
  if (!user) {
      throw new Error("User is not logged in");
  }
  // console
  const combinedString = previousStatus + " to " + newStatus;
  const { error } = await supabase.from("history").insert({
    user_id: user.id,
    name_id: nameid,
    production_change: combinedString,
  }); // * It time stamps automatically
  
  if (error) {
      console.error("Error adding history", error);
      throw new Error("Error adding history");
  }

  return true

  // revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
}

export async function removeOrderLine(order: Order){
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User is not logged in");
  }

  addHistoryForUser(order.name_id, "deleted", order.production_status || "");
  const { error: deleteError } = await supabase
    .from("orders")
    .delete()
    .eq("name_id", order.name_id);
  if (deleteError) {
    console.error("Error deleting order", deleteError);
    throw new Error("Error deleting order");
  }

  console.log("Order deleted successfully");
  revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
}

export async function removeOrderAll(orderId: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User is not logged in");
  }

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("order_id", orderId);
  if (error) {
    console.error("Error deleting orders", error);
    throw new Error("Error deleting orders");
  }

  console.log(`Orders with order_id ${orderId} deleted successfully`);
  revalidatePath("/toprint");
}

export async function updateOrderStatus(order: Order, revert: boolean = false, bypassStatus?: string) {
  try {
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

    console.log(order.production_status);
    const newStatus = bypassStatus || getNewStatus(order.production_status || "", revert);
    console.log("New status", newStatus);
    if (!newStatus || newStatus == null) {
      console.error("No new status found");
      throw new Error("No new status found");
    }

    addHistoryForUser(order.name_id, newStatus, order.production_status || "");

    if (newStatus === "completed") {
      try {
        await supabase.rpc("move_order", { p_id: order.name_id });
      } catch (error) {
        console.error("Error moving order", error);
        throw new Error("Error moving order");
      }
      console.log("Order archived successfully");
      return;
    }

    const { data: existingRecord, error: historyError } = await supabase
      .from("orders")
      .select("history")
      .eq("name_id", order.name_id)
      .single();
    if (historyError) {
      console.error("Error fetching history", historyError);
      throw new Error("Error fetching history");
    }

    const history: string[] = Array.isArray(existingRecord?.history)
      ? (existingRecord.history as string[])
      : [];

    const timestamp = getTimeStamp();
    const userEmail = user.email || user.id;
    const newEntry = `${userEmail} moves to "${newStatus}" on ${timestamp}`;
    history.push(newEntry);

    const { error } = await supabase
      .from("orders")
      .update({ ...order, production_status: newStatus, history })
      .match({ name_id: order.name_id });
    if (error) {
      console.error("Error updating todo", error);
      throw new Error("Error updating todo");
    }

    console.log("Order updated successfully, new status:", newStatus);
    const readyForZendeskUpdate = await getSiblingOrders(order.order_id, newStatus);
    if (readyForZendeskUpdate) {
      console.log("Updating Zendesk status");
      updateZendeskStatus(order.order_id, newStatus);
    }
  } catch (error) {
    console.error("Error updating order status", error);
  }
}

export async function updateOrderNotes(order : Order, newNotes : string){
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User is not logged in");
  }

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

  // console.log("Existing history:", history);

  // Build timestamped history entry

    // const { data: existingRecord, error: historyError } = await supabase
  //   .from("orders")
  //   .select("history")
  //   .eq("name_id", order.name_id)
  //   .single();
  // if (historyError) {
  //   console.error("Error fetching history", historyError);
  //   throw new Error("Error fetching history");
  // }