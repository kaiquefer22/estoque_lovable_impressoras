import { getDb } from "./db";
import { emailEvents, purchaseRequestSummary } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface SendGridWebhookEvent {
  email: string;
  timestamp: number;
  event: "sent" | "delivered" | "open" | "click" | "bounce" | "unsubscribe" | "spamreport";
  sg_event_id?: string;
  sg_message_id?: string;
  useragent?: string;
  ip?: string;
  url?: string;
}

/**
 * Process SendGrid webhook event and store in database
 */
export async function processEmailEvent(
  requestId: number,
  event: SendGridWebhookEvent
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const eventType = mapSendGridEventType(event.event);
    
    // Insert email event
    await db.insert(emailEvents).values({
      requestId,
      recipientEmail: event.email,
      eventType,
      timestamp: new Date(event.timestamp * 1000),
      metadata: JSON.stringify({
        useragent: event.useragent,
        ip: event.ip,
        url: event.url,
        sg_event_id: event.sg_event_id,
        sg_message_id: event.sg_message_id,
      }),
      sendgridEventId: event.sg_event_id,
    });

    // Update purchase request summary
    await updateRequestSummary(requestId);

    console.log(`[EmailTracking] Event ${eventType} recorded for request ${requestId}, email ${event.email}`);
    return true;
  } catch (error) {
    console.error("[EmailTracking] Error processing email event:", error);
    return false;
  }
}

/**
 * Map SendGrid event type to our enum
 */
function mapSendGridEventType(
  sgEvent: string
): "sent" | "delivered" | "open" | "click" | "bounce" | "unsubscribe" | "spam_report" {
  const mapping: Record<string, any> = {
    sent: "sent",
    delivered: "delivered",
    open: "open",
    click: "click",
    bounce: "bounce",
    unsubscribe: "unsubscribe",
    spamreport: "spam_report",
  };
  return mapping[sgEvent] || "sent";
}

/**
 * Update purchase request summary with latest event counts
 */
export async function updateRequestSummary(requestId: number): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    // Get all events for this request
    const events = await db
      .select()
      .from(emailEvents)
      .where(eq(emailEvents.requestId, requestId));

    // Count unique recipients and events
    const uniqueRecipients = new Set(events.map((e: typeof events[0]) => e.recipientEmail));
    const deliveredCount = events.filter((e: typeof events[0]) => e.eventType === "delivered").length;
    const openedCount = new Set(
      events.filter((e: typeof events[0]) => e.eventType === "open").map((e: typeof events[0]) => e.recipientEmail)
    ).size;
    const clickedCount = new Set(
      events.filter((e: typeof events[0]) => e.eventType === "click").map((e: typeof events[0]) => e.recipientEmail)
    ).size;
    const bounceCount = events.filter((e: typeof events[0]) => e.eventType === "bounce").length;
    const lastEvent = events.sort((a: typeof events[0], b: typeof events[0]) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

    // Upsert summary
    const existing = await db
      .select()
      .from(purchaseRequestSummary)
      .where(eq(purchaseRequestSummary.requestId, requestId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(purchaseRequestSummary)
        .set({
          totalRecipients: uniqueRecipients.size,
          deliveredCount,
          openedCount,
          clickedCount,
          bounceCount,
          lastEventAt: lastEvent?.timestamp || new Date(),
          updatedAt: new Date(),
        })
        .where(eq(purchaseRequestSummary.requestId, requestId));
    } else {
      await db.insert(purchaseRequestSummary).values({
        requestId,
        totalRecipients: uniqueRecipients.size,
        deliveredCount,
        openedCount,
        clickedCount,
        bounceCount,
        lastEventAt: lastEvent?.timestamp || new Date(),
      });
    }

    console.log(`[EmailTracking] Summary updated for request ${requestId}`);
  } catch (error) {
    console.error("[EmailTracking] Error updating request summary:", error);
  }
}

/**
 * Get email tracking summary for a request
 */
export async function getRequestEmailSummary(requestId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const summary = await db
      .select()
      .from(purchaseRequestSummary)
      .where(eq(purchaseRequestSummary.requestId, requestId))
      .limit(1);

    return summary[0] || null;
  } catch (error) {
    console.error("[EmailTracking] Error fetching request summary:", error);
    return null;
  }
}

/**
 * Get all email events for a request
 */
export async function getRequestEmailEvents(requestId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    return await db
      .select()
      .from(emailEvents)
      .where(eq(emailEvents.requestId, requestId))
      .orderBy(emailEvents.timestamp);
  } catch (error) {
    console.error("[EmailTracking] Error fetching email events:", error);
    return [];
  }
}
