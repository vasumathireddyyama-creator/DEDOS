import { TrafficLog } from "../components/TrafficMonitor";

export async function safeFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : (input as Request).url || "";
  
  if (url.includes("/api/")) {
    const start = Date.now();
    const method = init?.method || "GET";
    const requestPayload = init?.body ? String(init.body) : "{}";
    const endpoint = url.replace(window.location.origin, "");
    
    let message = `Intending outbound HTTP ${method} query.`;
    if (url.includes("/checkout/simulated")) {
      message = `Initiating simulated bypass checkout database ledger transaction.`;
    } else if (url.includes("/checkout/stripe")) {
      message = `Initiating Stripe secure endpoint checkout intent session...`;
    } else if (url.includes("/admin/inventory")) {
      message = `Dispatching instruction to modify item inventory quantity levels.`;
    } else if (url.includes("/admin/reset")) {
      message = `Dispatching backend administrator storage baseline restart request.`;
    }

    // Dispatch a custom event to update the traffic log
    window.dispatchEvent(
      new CustomEvent("stk-traffic-log", {
        detail: {
          type: "OUTBOUND",
          source: url.includes("stripe") ? "STRIPE-API" : "HTTP-CLIENT",
          method,
          endpoint,
          status: "PENDING",
          payload: requestPayload,
          message,
        },
      })
    );

    try {
      const response = await fetch(input, init);
      const latency = Date.now() - start;
      const clonedResponse = response.clone();
      let responsePayload = "";
      
      try {
        responsePayload = await clonedResponse.text();
      } catch (_) {}

      let responseMsg = `Received query response successfully.`;
      if (url.includes("/checkout/simulated") && response.ok) {
        responseMsg = `Simulated order processed & stocks accounted on backend!`;
      } else if (url.includes("/checkout/stripe") && response.ok) {
        responseMsg = `Stripe session URL token acquired successfully.`;
      } else if (url.includes("/admin/inventory") && response.ok) {
        responseMsg = `Inventory updated in backend dataset. SSE update propagated.`;
      } else if (url.includes("/admin/reset") && response.ok) {
        responseMsg = `Database baseline reset success! Broadcasting global clear frame.`;
      }

      window.dispatchEvent(
        new CustomEvent("stk-traffic-log", {
          detail: {
            type: "INBOUND",
            source: url.includes("stripe") ? "STRIPE-API" : "HTTP-CLIENT",
            method,
            endpoint,
            status: `${response.status} ${response.statusText}`,
            latency,
            payload: responsePayload,
            message: responseMsg,
          },
        })
      );

      return response;
    } catch (error: any) {
      const latency = Date.now() - start;
      window.dispatchEvent(
        new CustomEvent("stk-traffic-log", {
          detail: {
            type: "INBOUND",
            source: "HTTP-CLIENT",
            method,
            endpoint,
            status: "NET_ERROR",
            latency,
            payload: JSON.stringify({ error: error.message }),
            message: `External systems communication block / offline: ${error.message}`,
          },
        })
      );
      throw error;
    }
  }

  return fetch(input, init);
}
