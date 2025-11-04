// api/post/[postId].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const frameConfig = {
    version: "next",
    imageUrl:
      "https://res.cloudinary.com/dsrjjqkjs/image/upload/v1760928636/replicate-prediction-p4j99sygpsrm80csxfarber1s4_qgict1.jpg",
    button: {
      title: "View Post",
      action: {
        type: "launch_frame",
        name: "Hypeman",
        url: `https://hypeman.social/`,
      },
    },
  };

  const htmlPath = path.join(process.cwd(), "dist", "index.html"); // Production

  console.log(htmlPath)

  if (!htmlPath) {
    return res.status(500).send("index.html not found");
  }

  let html = fs.readFileSync(htmlPath, "utf-8");

  // Inject the frame meta tag
  const metaTag = `<meta name="fc:frame" content='${JSON.stringify(frameConfig)}'>`;
  html = html.replace("</head>", `${metaTag}\n</head>`);
  console.log(metaTag)

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
}
