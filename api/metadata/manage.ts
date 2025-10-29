// api/post/[postId].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cwd = process.cwd();

  console.log("=== DEBUG INFO ===");
  console.log("CWD:", cwd);
  console.log("CWD contents:", fs.readdirSync(cwd));
  console.log("dist/ exists?", fs.existsSync(path.join(cwd, "dist")));

  if (fs.existsSync(path.join(cwd, "dist"))) {
    console.log("dist/ contents:", fs.readdirSync(path.join(cwd, "dist")));
  }

  console.log(
    "Root index.html exists?",
    fs.existsSync(path.join(cwd, "index.html"))
  );
  console.log(
    "dist/index.html exists?",
    fs.existsSync(path.join(cwd, "dist", "index.html"))
  );

  if (fs.existsSync(path.join(cwd, "index.html"))) {
    const rootHtml = fs.readFileSync(path.join(cwd, "index.html"), "utf-8");
    console.log("Root index.html preview:", rootHtml.substring(0, 500));
  }

  if (fs.existsSync(path.join(cwd, "dist", "index.html"))) {
    const distHtml = fs.readFileSync(
      path.join(cwd, "dist", "index.html"),
      "utf-8"
    );
    console.log("dist/index.html preview:", distHtml.substring(0, 500));
  }

  console.log("===================");
  const frameConfig = {
    version: "next",
    imageUrl:
      "https://supervictorious-laurel-idyllically.ngrok-free.dev/api/frame_image/saltorious.eth?pfp=https%3A%2F%2Fimagedelivery.net%2FBXluQx4ige9GuW0Ia56BHw%2F78b78620-e1f7-4631-6f5a-04720f113700%2Foriginal",
    button: {
      title: "View Post",
      action: {
        type: "launch_frame",
        name: "Hypeman",
        url: `https://hypeman.social/manage`,
      },
    },
  };

  // Check both locations
  const possiblePaths = [
    path.join(process.cwd(), "dist", "index.html"), // Production
  ];

  let htmlPath = possiblePaths.find((p) => fs.existsSync(p));

  if (!htmlPath) {
    return res.status(500).send("index.html not found");
  }

  let html = fs.readFileSync(htmlPath, "utf-8");

  console.log(html);

  // Inject the frame meta tag
  const metaTag = `<meta name="fc:frame" content='${JSON.stringify(frameConfig)}'>`;
  html = html.replace("</head>", `${metaTag}\n</head>`);

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
}
