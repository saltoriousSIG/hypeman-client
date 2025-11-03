import sharp from "sharp";
import { VercelRequest, VercelResponse } from "@vercel/node";
import path from "path";
import { createCanvas, registerFont } from "canvas";


export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { username, pfp } = req.query;
    const imageBuffer = await createFrameImage({
        profileImageUrl: decodeURIComponent(pfp as string),
        username: username as string,
    });
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(imageBuffer);
}

const positions: Record<number, { profile: { size: number; top: number; left: number } }> = {
    0: {
        profile: {
            size: 250,
            top: 44,
            left: 813
        },
    },
    1: {
        profile: {
            size: 275,
            top: 52,
            left: 803
        },
    },
    2: {
        profile: {
            size: 250,
            top: 79,
            left: 810
        },
    },
    3: {
        profile: {
            size: 290,
            top: 37,
            left: 799
        }
    },
    4: {
        profile: {
            size: 280,
            top: 43,
            left: 788
        }
    }
}

async function createFrameImage({
    profileImageUrl,
    username,
}: {
    profileImageUrl: string;
    username: string;
}) {
    const randomNumber = Math.floor(Math.random() * 5);
    const width = 1200;
    const height = 760;

    const profileSize = positions[randomNumber].profile.size;
    const profileTop = positions[randomNumber].profile.top;
    const profileLeft = positions[randomNumber].profile.left;

    // Register custom font
    const fontPath = path.join(
        process.cwd(),
        "public",
        "fonts",
        "RubikGlitch-Regular.ttf"
    );
    registerFont(fontPath, { family: "Rubik Glitch" });

    // Fetch and process profile picture
    let profileBuffer;
    if (profileImageUrl.startsWith("http")) {
        const response = await fetch(profileImageUrl);
        profileBuffer = Buffer.from(await response.arrayBuffer());
    } else {
        profileBuffer = profileImageUrl;
    }
    const circleMask = Buffer.from(`
  <svg width="${profileSize}" height="${profileSize}">
    <circle cx="${profileSize / 2}" cy="${profileSize / 2}" r="${profileSize / 2}" fill="white"/>
  </svg>
`);

    const profileImage = await sharp(profileBuffer)
        .resize(profileSize, profileSize, {
            fit: "cover",
            position: "center"
        })
        .composite([
            {
                input: circleMask,
                blend: "dest-in",
            },
        ])
        .png() // ← Important! PNG preserves transparency
        .toBuffer();
    // Create text using canvas with custom font
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.font = 'bold 52px "Rubik Glitch"';
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFF8DC";
    ctx.shadowColor = "#FFD700"; // gold glow
    ctx.shadowBlur = 20;
    ctx.strokeStyle = "black";

    const text = `Hype up ${username}`;
    ctx.strokeText(text, width / 1.4, 600);
    ctx.fillText(text, width / 1.4, 600);

    const textBuffer = canvas.toBuffer("image/png");

    const bgPath = path.join(process.cwd(), "public", "promotion_share_bgs", `share_${randomNumber}.jpeg`);
    const scaleFactor = 1.2;

    // Composite everything
    const image = await sharp(bgPath)
        .resize(Math.round(width * scaleFactor), Math.round(height * scaleFactor), {
            fit: "cover",
            position: "center",
        })
        .resize(width, height, {
            fit: "cover",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .composite([
            {
                input: profileImage,
                top: profileTop,
                left: profileLeft,
            },
            {
                input: textBuffer,
                top: 0,
                left: 0,
            },
        ])
        .jpeg({ quality: 90 })
        .toBuffer();

    return image;
}
