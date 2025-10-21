import { VercelRequest, VercelResponse } from "@vercel/node";

interface ExtendedVercelRequest extends VercelRequest {
  body: {
    warpcastUrl: string;
  };
}

export default async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { warpcastUrl } = req.body;

    if (!warpcastUrl) {
      return res.status(400).json({ error: "Warpcast URL is required" });
    }

    // Use Neynar API to get the cast data and extract the proper hash
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/cast?identifier=${encodeURIComponent(warpcastUrl)}&type=url`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch cast data: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return res.status(200).json({ 
      success: true, 
      castHash: data.cast.hash 
    });
  } catch (error: any) {
    console.error("Error converting Warpcast URL to cast hash:", error);
    return res.status(500).json({ 
      error: "Failed to convert Warpcast URL to cast hash",
      details: error.message 
    });
  }
}
