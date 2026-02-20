"use server";

import { Order } from "@/types/custom";
import { getServerClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
// import { OrderTypes } from "./orderTypes";

import { updateZendeskNotes, reprintInternalNote, forceRefreshTimeline } from "@/utils/google-functions";
// import { GoTrueAdminApi } from "@supabase/supabase-js";

type AdminRow = { role: "admin" | string };
const getNewStatus = (currentStatus: string, revert: boolean) => {
  if (revert) {
    switch (currentStatus) {
      case "cut":
        return "print";
      case "pack":
        return "prepack";
      case "prepack":
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
        return "prepack";
      case "prepack":
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


async function retrieveUserRole(user?: { id: string; email?: string }): Promise<string | null> {
  const supabase = await getServerClient();

  if (!user) {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("User is not logged in");
    user = currentUser;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select<"role", AdminRow>("role")
    .eq("id", user?.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking user role:", error);
    return null;
  }
  return data?.role ?? null;
}

async function requireAdmin(user?: { id: string; email?: string }): Promise<boolean> {
  const supabase = await getServerClient();

  if (!user) {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("User is not logged in");
    user = currentUser;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select<"role", AdminRow>("role")
    .eq("id", user?.id)
    .eq("role", "admin")
    .single();

  if (error && error.code !== "PGRST116") {
    // Unexpected error
    console.error("Error checking admin role:", error);
    return false;
  }
  // If no data found, user is not admin
  if (!data) return false;
  return true;
}
const getTimeStamp = () => {
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "America/Toronto",
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
  const supabase = await getServerClient();
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


export async function forceUpdateTimeline() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User is not logged in");
  }

  const role = await retrieveUserRole(user);
  if (role !== "admin" && role !== "manager") {
    throw new Error("User does not have permission to force update timeline");
  }
  console.log("Forcing timeline refresh by updating order_id 0 with timestamp");
  await forceRefreshTimeline();
  return true;
}


async function addHistoryForUser(nameid: string, newStatus: string, previousStatus: string) {
  const supabase = await getServerClient();
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
  // revalidatePath("/database/toprint"); // * Revalidate any of the data should be refreshed
}

export async function removeOrderLine(order: Order) {
  const supabase = await getServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User is not logged in");
  }
  const isAdmin = await requireAdmin(user ?? undefined);
  if (!isAdmin) {
    throw new Error("User is not an admin"); // not authorized
  }
  // console.log(isAdmin);
  addHistoryForUser(order.name_id, "deleted", order.production_status || "");
  const { error: deleteError } = await supabase.from("orders").delete().eq("name_id", order.name_id);
  if (deleteError) {
    console.error("Error deleting order", deleteError);
    throw new Error("Error deleting order");
  }

  console.log("Order deleted successfully");
  revalidatePath("/database/toprint"); // * Revalidate any of the data should be refreshed
}

export async function removeOrderAll(orderId: number) {
  const supabase = await getServerClient();

  // const {remove}
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User is not logged in");
  }

  const isAdmin = await requireAdmin(user);
  if (!isAdmin) {
    throw new Error("User is not an admin"); // not authorized
  }

  // Get all name_ids that belong to this order_id before deleting
  const { data: orderRows, error: fetchError } = await supabase
    .from("orders")
    .select("name_id, production_status")
    .eq("order_id", orderId);

  if (fetchError) {
    console.error("Error fetching name_ids for order_id", orderId, fetchError);
    throw new Error("Error fetching name_ids for order");
  }

  const nameIds = (orderRows ?? []).map((row) => row.name_id);
  // Update the history for each name_id based on its production_status before deletion
  if (orderRows && orderRows.length > 0) {
    await Promise.all(
      orderRows.map((row) =>
        addHistoryForUser(row.name_id, "deleted", row.production_status || "")
      )
    );
  }
  
  const { error } = await supabase.from("orders").delete().eq("order_id", orderId);
  if (error) {
    console.error("Error deleting orders", error);
    throw new Error("Error deleting orders");
  }

  await Promise.all(nameIds.map((nameId) => addHistoryForUser(nameId, "deleted", "N/A")));

  console.log(`Orders with order_id ${orderId} deleted successfully`);
  revalidatePath("/database/toprint");
}
export async function assignColorToQuantityRow(nameIds: string[], colorValue?: string | null) { // this should be in a hexcode format
  if (!nameIds || nameIds.length === 0) throw new Error("No nameIds provided");
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User is not logged in");

  // Fetch the rows first
  const { data: rows, error: fetchError } = await supabase
    .from("orders")
    .select("name_id, quantityColor")
    .in("name_id", nameIds);

  if (fetchError) {
    console.error("Error fetching orders", fetchError);
    throw new Error("Error fetching orders");
  }
  // const isAdmin = await requireAdmin(user);
  // if (isAdmin)
  // If asigneeValue is null, update all rows and bypass admin check
  let idsToUpdate = (rows ?? []).map((row) => row.name_id);
  
  // const idsToUpdate = rowsWithoutAssignee.map((row) => row.name_id);

  const { data: updatedRows, error } = await supabase
    .from("orders")
    .update({ quantityColor: colorValue })
    .in("name_id", idsToUpdate)
    .select("name_id");

  if (error) {
    console.error("Error assigning orders", error);
    throw new Error("Error assigning orders");
  }

  // updatedRows is an array of { name_id: string } for rows that existed
  // const updatedIds = new Set((updatedRows ?? []).map((r) => r.name_id));
  // const missingIds = idsToUpdate.filter((id) => !updatedIds.has(id));

  // if (missingIds.length > 0) {
  //   console.warn("No matching orders found for name_id(s):", missingIds);
  // }
}



export async function assignAssigneeToRows(nameIds: string[], asigneeValue?: string | null) {
  if (!nameIds || nameIds.length === 0) throw new Error("No nameIds provided");
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User is not logged in");

  // Fetch the rows first
  const { data: rows, error: fetchError } = await supabase
    .from("orders")
    .select("name_id, asignee")
    .in("name_id", nameIds);

  if (fetchError) {
    console.error("Error fetching orders", fetchError);
    throw new Error("Error fetching orders");
  }
  const isAdmin = await requireAdmin(user);

  // If asigneeValue is null, update all rows and bypass admin check
  let idsToUpdate: string[];
  if (asigneeValue === null || isAdmin) {
    // Admin can unassign anyone or assign anyone no problem
    idsToUpdate = (rows ?? []).map((row) => row.name_id);
  } else {
    // Find rows that do NOT have an assignee
    const rowsWithoutAssignee = (rows ?? []).filter((row) => !row.asignee);
    if (rowsWithoutAssignee.length === 0) {
      console.warn("All selected orders already have an assignee");
      return;
    }
    idsToUpdate = rowsWithoutAssignee.map((row) => row.name_id); // only update rows without assignee if you're not an admin
  }

  // const idsToUpdate = rowsWithoutAssignee.map((row) => row.name_id);

  const { data: updatedRows, error } = await supabase
    .from("orders")
    .update({ asignee: asigneeValue })
    .in("name_id", idsToUpdate)
    .select("name_id");

  if (error) {
    console.error("Error assigning orders", error);
    throw new Error("Error assigning orders");
  }

  // updatedRows is an array of { name_id: string } for rows that existed
  // const updatedIds = new Set((updatedRows ?? []).map((r) => r.name_id));
  // const missingIds = idsToUpdate.filter((id) => !updatedIds.has(id));

  // if (missingIds.length > 0) {
  //   console.warn("No matching orders found for name_id(s):", missingIds);
  // }
}

// export async function assignOrderToUser(order: Order, asigneeValue?: string | null) {
//   if (!order) throw new Error("No order provided");

//   const supabase = await getServerClient();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user) throw new Error("User is not logged in");

//   // Determine the value for asignee
//   // console.log("Assigning to:", asigneeValue);
//   const { error } = await supabase
//     .from("orders")
//     .update({ ...order, asignee: asigneeValue })
//     .match({ name_id: order.name_id });

//   if (error) {
//     console.error("Error assigning order", error);
//     throw new Error("Error assigning order");
//   }

//   // Optionally revalidate if needed
//   // revalidatePath("/database/toprint");
// }



export async function createReprint(nameId: string, quantity?: number) {
  if (!quantity) return;
  if (!nameId || !quantity) return;
  // Ensure quantity is an integer (no decimals)
  const intQuantity = Math.floor(quantity);
  if (!Number.isInteger(intQuantity) || intQuantity <= 0) {
    throw new Error("Quantity must be a positive integer");
  }

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User is not logged in");
  const role = await retrieveUserRole(user ?? null);
  if (role !== "admin" && role !== "manager") {
    throw new Error("User does not have permission to create reprints");
  }
  // console.log(role);
  // console.log(`Creating reprint for ${nameId} with quantity ${quantity}`);
  const { data: originalOrder, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("name_id", nameId)
    .single();

  if (fetchError || !originalOrder) {
    console.error("Original order not found", fetchError);
    throw new Error("Original order not found");
  }

  // Find the next available -R{n} suffix for the new name_id
  let reprintNumber = 1;
  let newNameId = `${nameId}-R${reprintNumber}`;
  // Fetch all name_ids that start with the base nameId + "-R"
  const { data: reprints, error: reprintsError } = await supabase
    .from("orders")
    .select("name_id")
    .like("name_id", `${nameId}-R%`);

  if (reprintsError) {
    console.error("Error checking for existing reprints", reprintsError);
    throw new Error("Error checking for existing reprints");
  }

  const existingReprintNumbers = (reprints ?? [])
    .map((row) => {
      const match = row.name_id.match(new RegExp(`^${nameId}-R(\\d+)$`));
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n): n is number => n !== null);

  while (existingReprintNumbers.includes(reprintNumber)) {
    reprintNumber++;
    newNameId = `${nameId}-R${reprintNumber}`;
  }

  // Prepare the new order object
  const reprintOrder = {
    ...originalOrder,
    name_id: newNameId,
    quantity: intQuantity,
    production_status: "print",
    asignee: null,
    rush: true,
    notes: `AUTOMATIC REPRINT FOR QUANTITY ${intQuantity}`,
    history: [`${user.email || user.id} created reprint on ${getTimeStamp()}`],
  };

  // Insert the reprint order
  const { error: insertError } = await supabase.from("orders").insert(reprintOrder);

  if (insertError) {
    console.error("Error creating reprint order", insertError);
    throw new Error("Error creating reprint order");
  }
  // console.log("Reprint order created:", newNameId);

  const { error } = await supabase.from("history").insert({
    // * little history stamp
    user_id: user.id,
    name_id: nameId,
    production_change: `Created reprint ${newNameId} for quantity ${intQuantity}`,
  }); // * It time stamps automatically

  const orderId = originalOrder.order_id;
  await reprintInternalNote(orderId, `Reprint created for quantity ${intQuantity} from original order ${nameId}. by ${user.email || user.id}`);
  if (error) {
    console.error("Error adding history for reprint", error);
    throw new Error("Error adding history for reprint");
  }
}

export async function updateOrderStatus(order: Order, revert: boolean, bypassStatus?: string) {
  // const ignoreZendesk = process.env.IGNORE_ZENDESK === "true"

  if (!order) throw new Error("No order provided");

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User is not logged in");

  const newStatus = bypassStatus || getNewStatus(order.production_status || "", revert);
  if (!newStatus) throw new Error("No new status found");

  if (newStatus === order.production_status) { // anti same status spam
    console.warn("New status is the same as current status, no update needed");
    return;
  } 

  const addHistoryPromise = addHistoryForUser(order.name_id, newStatus, order.production_status || "");
  // console.log(newStatus);
  if (newStatus === "completed") {
    try {
      const { data, error } = await supabase.rpc("move_order", { p_id: order.name_id });
      if (error) {
        console.error("move_order RPC failed:", { code: error.code, message: error.message, details: error.details });
        return;
      }
      console.log("move_order RPC ok:", data);
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
    .update({ ...order, production_status: newStatus, history, asignee: null })
    .match({ name_id: order.name_id });
  // Always overwrite the history for order_id 0 with a single entry
  // Check if order_id 0 exists before updating its history
  const { data: zeroOrder, error: zeroOrderError } = await supabase
    .from("orders")
    .select("order_id")
    .eq("order_id", 0)
    .single();

  if (!zeroOrderError && zeroOrder) {
    await supabase.from("orders").update({ notes: timestamp }).eq("order_id", 0);
  }
  // If order_id is 0, also update its history with just a timestamp
  // if (order.order_id === 0) {
  //   const { data: zeroOrder, error: zeroOrderError } = await supabase
  //     .from("orders")
  //     .select("history")
  //     .eq("order_id", 0)
  //     .single();

  //   if (!zeroOrderError) {
  //     const zeroHistory: string[] = Array.isArray(zeroOrder?.history)
  //       ? zeroOrder.history.filter((h: unknown): h is string => typeof h === "string")
  //       : [];
  //     zeroHistory.push(`Updated at ${timestamp}`);
  //     await supabase
  //       .from("orders")
  //       .update({ history: zeroHistory })
  //       .eq("order_id", 0);
  //   }
  // }

  // Run both in parallel
  await Promise.all([addHistoryPromise, updateOrderPromise]);
  // const readyForZendeskUpdate = await getSiblingOrders(order.order_id, newStatus);
  // // Send webhook async (non-blocking)
  // if (readyForZendeskUpdate && !ignoreZendesk) {
  //   console.log("Triggering Zendesk webhook…");
  //   void updateZendeskStatus(order.order_id, newStatus); // don't block
  // }
}

export async function addOrderViewer(name_ids: string[]) {
  if (!name_ids || name_ids.length === 0) {
    console.warn("No name_ids provided for order viewers");
    return false;
  }
  const supabase = await getServerClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User is not logged in");

  // 1. Delete any existing rows for this user
  const { error: deleteError } = await supabase.from("order_viewers").delete().eq("user_id", user.id);

  // console.log(deleteError?.code);
  if (deleteError && deleteError.code !== "PGRST116") {
    // PGRST116 = No rows found (Supabase/PostgREST)
    // Log or rethrow only if error is not "no rows found"
    console.error("Error clearing previous order viewers", deleteError);
    throw new Error("Error clearing previous order viewers: " + deleteError.message);
  }

  // 2. Insert the new ones (if there are any)
  if (name_ids.length > 0) {
    const inserts = name_ids.map((name_id) => ({
      user_id: user.id,
      user_email: user.email || "",
      name_id,
    }));

    const { error: insertError } = await supabase
      .from("order_viewers")
      .upsert(inserts, { onConflict: "user_id,name_id" });

    if (insertError) {
      console.error("Error adding order viewers", insertError);
      throw new Error("Error adding order viewers: " + insertError.message);
    }
    // console.log("Order viewers added successfully");
  }
  return true;
}

export async function updateOrderNotes(order: Order, newNotes: string) {
  // const ignore_zendesk = process.env.IGNORE_ZENDESK || false;
  const supabase = await getServerClient();
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
  updateZendeskNotes(order.order_id, "[ @ " + timeStamp + " by " + userEmail + " ] : \n" + newNotes);
  // if (!ignore_zendesk || ignore_zendesk == "false") {

  // }
  console.log("Order updated successfully");
}

export async function deleteAllOrders() {
  // console.log("Deleting all orders");
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = await requireAdmin(user ?? undefined);
  if (!isAdmin) {
    throw new Error("User is not an admin"); // not authorized
  }
  // if (true) return
  // const user = undefined;
  // const user =
  // const supabase = await requireAdmin();
  const { error } = await supabase.from("orders").delete().neq("order_id", 0);
  if (error) {
    console.error("Error deleting all orders:", error.message);
    return false;
  }
  console.log("All orders deleted successfully");
  return true;
}
/**
 * Create a custom order using the values submitted from the OrderInputter.
 * @param values - a Record of header keys to input values
 */

export async function createCustomOrder(
  values: Array<{ name_id: string; lamination: string; material: string; quantity: number }>,
  order_id: number,
  due_date: string,
  ihd_date: string
) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User is not logged in");
  }

  // Check for duplicate name_id
  const nameIds = values.map((val) => val.name_id);
  const { data: existing, error: checkError } = await supabase.from("orders").select("name_id").in("name_id", nameIds);

  if (checkError) {
    console.error("Error checking for duplicate name_id", checkError);
    return { result: false, message: checkError.message };
  }
  if (existing && existing.length > 0) {
    return { result: false, message: "duplicate name_id already exists, chose another" };
  }

  // Prepare all order objects with the same order_id, due_date, ihd_date
  const ordersToInsert = values.map((val) => ({
    ...val,
    order_id,
    due_date,
    ihd_date,
    orderType: "2",
    production_status: "print",
  }));
  console.log("Orders to insert:", ordersToInsert);
  const { error } = await supabase.from("orders").insert(ordersToInsert);
  if (error) {
    console.error("Error creating custom orders", error);
    return { result: false, message: error.message };
  }
  return { result: true, message: "Orders created successfully" };
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

//   revalidatePath("/database/toprint"); // * Revalidate any of the data should be refreshed
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

//     revalidatePath("/database/toprint"); // * Revalidate any of the data should be refreshed
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
//   revalidatePath("/database/toprint"); // * Revalidate any of the data should be refreshed
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
