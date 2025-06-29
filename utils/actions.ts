'use server'

import { Order } from "@/types/custom";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { OrderTypes } from "./orderTypes";

import { updateZendeskNotes, updateZendeskStatus } from "@/utils/google-functions";

// import projectSettings from "../project-settings.json";

// console.log("Project settings", projectSettings.developer);
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
  const timestamp = new Date().toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return timestamp;
};

async function getSiblingOrders(orderId: number, newStatus: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select("*").eq("order_id", orderId);
  if (error) {
    console.error("Error fetching orders for order_id", orderId, error);
    throw new Error("Error fetching orders");
  }

  // console.log("Fetched orders for order_id", orderId, data);
  // Inserted logic to build statuses and check if all equal newProductionStatus
  const statuses = (data ?? []).map((o) => o.production_status);
  // console.log("Statuses", statuses);
  if (statuses.length > 0 && statuses.every((s) => s === newStatus)) {
    console.log("ready to update zendesk order");
    console.log("All sibling orders have the same status:", newStatus);
    console.log("Order ID:", orderId);
    return true;
  }
  return false;
}

async function addHistoryForUser(nameid: string, newStatus: string, previousStatus: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  return true;

  // revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
}

export async function removeOrderLine(order: Order) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User is not logged in");
  }

  addHistoryForUser(order.name_id, "deleted", order.production_status || "");
  const { error: deleteError } = await supabase.from("orders").delete().eq("name_id", order.name_id);
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

  const { error } = await supabase.from("orders").delete().eq("order_id", orderId);
  if (error) {
    console.error("Error deleting orders", error);
    throw new Error("Error deleting orders");
  }

  console.log(`Orders with order_id ${orderId} deleted successfully`);
  revalidatePath("/toprint");
}
export async function updateOrderStatus(order: Order, revert: boolean, bypassStatus?: string) {
  // const ignoreZendesk = process.env.IGNORE_ZENDESK === "true"

  if (!order) throw new Error("No order provided");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User is not logged in");

  const newStatus = bypassStatus || getNewStatus(order.production_status || "", revert);
  if (!newStatus) throw new Error("No new status found");

  const addHistoryPromise = addHistoryForUser(order.name_id, newStatus, order.production_status || "");

  if (newStatus === "completed") {
    try {
      await supabase.rpc("move_order", { p_id: order.name_id });
    } catch (err) {
      console.error("Error moving order", err);
      throw new Error("Error moving order");
    }
    return;
  }

  const { data: existingRecord, error: historyError } = await supabase
    .from("orders")
    .select("history")
    .eq("name_id", order.name_id)
    .single();
  if (historyError) throw new Error("Error fetching history");

  const history: string[] = Array.isArray(existingRecord?.history)
    ? existingRecord.history.filter((h: unknown): h is string => typeof h === "string")
    : [];
  const timestamp = getTimeStamp();
  const userEmail = user.email || user.id;
  history.push(`${userEmail} moves to "${newStatus}" on ${timestamp}`);

  const updateOrderPromise = supabase
    .from("orders")
    .update({ ...order, production_status: newStatus, history })
    .match({ name_id: order.name_id });

  // Run both in parallel
  await Promise.all([addHistoryPromise, updateOrderPromise]);

  // const readyForZendeskUpdate = await getSiblingOrders(order.order_id, newStatus);

  // // Send webhook async (non-blocking)
  // if (readyForZendeskUpdate && !ignoreZendesk) {
  //   console.log("Triggering Zendesk webhook…");
  //   void updateZendeskStatus(order.order_id, newStatus); // don't block
  // }
}

export async function updateOrderNotes(order: Order, newNotes: string) {
  // const ignore_zendesk = process.env.IGNORE_ZENDESK || false;
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
  const userEmail = user.email || user.id;

  const timeStamp = getTimeStamp();
  updateZendeskNotes(order.order_id, "[ PRINT LOG @ " + timeStamp + " by " + userEmail + " ] : \n" + newNotes);
  // if (!ignore_zendesk || ignore_zendesk == "false") {
    
  // }
  console.log("Order updated successfully");
}

/**
 * Create a custom order using the values submitted from the OrderInputter.
 * @param values - a Record of header keys to input values
 */

export async function createCustomOrder(values: Record<string, string>) {
  // console.log("Creating custom order with values:", values);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("User", user);
  // console.log(values);
  // const missingFields = Object.entries(values)
  //   .filter(([key, val]) => val.trim() === "")
  //   .map(([key]) => key);
  // if (missingFields.length > 0) {
  //   console.error("Missing required fields for order:", missingFields);
  //   throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  // }

  // Insert the new order; mapping record keys to database column names
  const orderData: Record<string, string> & { orderType: string; production_status: string } = { ...values, orderType: "2", production_status: "print" }; // force orderType to "2"
  if (!orderData.due_date || (typeof orderData.due_date === "string" && orderData.due_date.trim() === "")) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    orderData.due_date = `${yyyy}-${mm}-${dd}`;
  }
  const { error } = await supabase
    .from("orders")
    .insert([orderData as unknown as { due_date: string; name_id: string }]);
  if (error) {
    console.error("Error creating custom order", error);
    return { result: false, message: error.message };
  }
  return { result: true, message: "Order created successfully" };

  // revalidate pages showing orders if needed
  // revalidatePath("/toprint");
}

// export async function createOrder(formData: FormData) {
//   // await new Promise((resolve) => {
//   //     setTimeout(resolve, 3000);
//   // })

//   const supabase = await createClient();
//   const text = formData.get("todo") as string;
//   if (!text) {
//     throw new Error("No todo text provided");
//   }
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();
//   if (!user) {
//     throw new Error("User is not logged in");
//   }

//   const { error } = await supabase.from("orders").insert({
//     name_id: text,
//     print_method: "Front",
//   });
//   if (error) {
//     console.error("Error adding an order here", error);
//     throw new Error("Error adding todo");
//   }

//   revalidatePath("/toprint"); // * Revalidate any of the data should be refreshed
// }

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
