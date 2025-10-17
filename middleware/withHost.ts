import { VercelRequest, VercelResponse } from "@vercel/node";

const allowedHosts = [
  "https://supervictorious-laurel-idyllically.ngrok-free.dev",
  "https://hypeman-client.vercel.app",
  'https://harder-conversion-decent-discussion.trycloudflare.com'
];

export function withHost(handler: any) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const origin = req.headers.origin || req.headers.referer || "";
    const userAgent = req.headers["user-agent"] || "";

    console.log(userAgent, "userAgent");
    console.log(origin, "origin");

    // Extract just the origin (protocol + domain) from the full URL
    let baseOrigin = origin;
    try {
      if (origin) {
        const url = new URL(origin);
        baseOrigin = `${url.protocol}//${url.host}`;
      }
    } catch (e) {
      // If URL parsing fails, use original value
      baseOrigin = origin;
    }

    console.log(baseOrigin, "baseOrigin after parsing");

    if (!allowedHosts.includes(baseOrigin)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return handler(req, res);
  };
}
