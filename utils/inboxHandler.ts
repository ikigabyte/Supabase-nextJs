"use server";

import { getServerClient } from "@/utils/supabase/server";

export async function enqueueZendeskStatusForOrder(ticketId: number): Promise<void> {
  const supabase = await getServerClient();
  const { error } = await supabase.rpc("enqueue_zendesk_status_outbox_for_order", {
    p_ticket_id: ticketId,
  });

  if (error) {
    console.error("Failed to enqueue Zendesk status for order", { ticketId, error });
    throw new Error("Failed to enqueue Zendesk status");
  }
}

export async function enqueueZendeskStatus(ticketId: number, targetStatus: "shipped"): Promise<void> {
  const supabase = await getServerClient();
  const { error } = await supabase.rpc("enqueue_zendesk_status_outbox", {
    p_ticket_id: ticketId,
    p_target_status: targetStatus,
  });

  if (error) {
    console.error("Failed to enqueue Zendesk status", { ticketId, targetStatus, error });
    throw new Error("Failed to enqueue Zendesk status");
  }
}
