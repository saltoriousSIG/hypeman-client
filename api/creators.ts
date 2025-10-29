// api/post/[postId].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const frameConfig = {
    version: "next",
    imageUrl:
      "https://res.cloudinary.com/dsrjjqkjs/image/upload/v1760928636/replicate-prediction-t60cxw0m31rmc0csxfbbam7xgr_vlc51o.jpg",
    button: {
      title: "View Post",
      action: {
        type: "launch_frame",
        name: "Hypeman",
        url: `https://hypeman.social/creators`,
      },
    },
  };

  // Check both locations
  const possiblePaths = [
    path.join(process.cwd(), "index.html"), // Production
    path.join(process.cwd(), "dist", "index.html"), // Development
  ];

  let htmlPath = possiblePaths.find((p) => fs.existsSync(p));

  if (!htmlPath) {
    return res.status(500).send("index.html not found");
  }

  let html = fs.readFileSync(htmlPath, "utf-8");

  // Inject the frame meta tag
  const metaTag = `<meta name="fc:frame" content='${JSON.stringify(frameConfig)}'>`;
  html = html.replace("</head>", `${metaTag}\n</head>`);

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
}
