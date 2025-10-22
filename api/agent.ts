import { VercelRequest, VercelResponse } from "@vercel/node";
import { withHost } from "../middleware/withHost.js";

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Log the entire POST request
    console.log("=== AGENT WEBHOOK REQUEST ===");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("Query:", JSON.stringify(req.query, null, 2));
    console.log("Method:", req.method);
    console.log("URL:", req.url);
    console.log("=============================");

    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: "Webhook received successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error processing agent webhook:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withHost(handler);
