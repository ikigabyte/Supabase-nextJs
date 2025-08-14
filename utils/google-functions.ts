'use server'

const googleFunctionUrl = process.env.GOOGLE_ZENDESK_FUNCTION_URL;

export async function updateZendeskStatus(orderId: number, newStatus: string): Promise<void> {
  // if (!googleFunctionUrl) {
  //   throw new Error("Missing GOOGLE_ZENDESK_FUNCTION_URL env variable");
  // }
  const response = await fetch(googleFunctionUrl + "/updateZendesk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: orderId, status: newStatus }),
  });
  if (!response.ok) {
    // const errorText = await response.text();
    // console.error("Zendesk function error", response.status, errorText);
    // throw new Error(`Zendesk function failed: ${response.status}`);
  }
  console.log("Zendesk function response", response.status);
}

export async function updateZendeskNotes(orderId: number, notes: string): Promise<void> {
  // check to make sure 
  if (!googleFunctionUrl) {
    throw new Error("Missing GOOGLE_ZENDESK_FUNCTION_URL env variable");
  }
  const response = await fetch(googleFunctionUrl + "/updateNotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: orderId, notes: notes }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Zendesk function error", response.status, errorText);
    throw new Error(`Zendesk function failed: ${response.status}`);
  }
  console.log("Zendesk function response", response.status);
}
