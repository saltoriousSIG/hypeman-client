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
      "https://res.cloudinary.com/dsrjjqkjs/image/upload/v1729498306/HYOEZC09_output_0_1_nwbhlj.png",
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
