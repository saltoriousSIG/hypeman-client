// api/post/[postId].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";
import setupAdminWallet from "../../../src/lib/setupAdminWallet.js";
import { DIAMOND_ADDRESS } from "../../../src/lib/utils.js";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  const dataAbiFilePath = path.join(
    process.cwd(),
    "/src/abis",
    `PromotionData.json`
  );
  const dataAbiFileContents = fs.readFileSync(dataAbiFilePath, "utf8");
  const data_abi = JSON.parse(dataAbiFileContents);
  const { publicClient } = await setupAdminWallet();

  const promotion: any = await publicClient.readContract({
    address: DIAMOND_ADDRESS as `0x${string}`,
    abi: data_abi,
    functionName: "getPromotion",
    args: [id],
  });

  const {
    data: { users },
  } = await axios.get(
    `https://api.neynar.com/v2/farcaster/user/bulk/?fids=${promotion.creator_fid.toString()}`,
    {
      headers: {
        "x-api-key": process.env.NEYNAR_API_KEY as string,
      },
    }
  );

  const { username, pfp_url } = users[0];

  const frameConfig = {
    version: "next",
    imageUrl: `https://hypeman.social/api/frame_image/${username}?pfp=${encodeURIComponent(pfp_url)}`,
    button: {
      title: "View Post",
      action: {
        type: "launch_frame",
        name: "Hypeman",
        url: `https://hypeman.social/promotion/${id}`,
      },
    },
  };

  // Check both locations
  const htmlPath = path.join(process.cwd(), "dist", "index.html"); // Productio

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
