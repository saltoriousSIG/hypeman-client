import { VercelRequest, VercelResponse } from "@vercel/node";
import { mnemonicToAccount } from "viem/accounts";
import { ViemLocalEip712Signer } from "@farcaster/hub-nodejs";
import { bytesToHex, hexToBytes } from "viem";
import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";
import { RedisClient } from "../src/clients/RedisClient.js";
import axios from "axios";

const redis = new RedisClient(process.env.REDIS_URL as string);

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY as string,
});

const neynarClient = new NeynarAPIClient(config);

export const getFid = async () => {
  if (!process.env.FARCASTER_DEVELOPER_MNEMONIC) {
    throw new Error("FARCASTER_DEVELOPER_MNEMONIC is not set.");
  }

  const account = mnemonicToAccount(process.env.FARCASTER_DEVELOPER_MNEMONIC);

  const { user: farcasterDeveloper } =
    await neynarClient.lookupUserByCustodyAddress({
      custodyAddress: account.address,
    });

  return Number(farcasterDeveloper.fid);
};

export const getSignedKey = async () => {
  const createSigner = await neynarClient.createSigner();
  const { deadline, signature } = await generate_signature(
    createSigner.public_key
  );

  if (deadline === 0 || signature === "") {
    throw new Error("Failed to generate signature");
  }

  const fid = await getFid();
  const signedKey = await neynarClient.registerSignedKey({
    signerUuid: createSigner.signer_uuid,
    appFid: fid,
    deadline,
    signature,
    sponsor: {
      sponsored_by_neynar: true,
    },
  });

  return signedKey;
};

const generate_signature = async function (public_key: string) {
  if (typeof process.env.FARCASTER_DEVELOPER_MNEMONIC === "undefined") {
    throw new Error("FARCASTER_DEVELOPER_MNEMONIC is not defined");
  }

  const FARCASTER_DEVELOPER_MNEMONIC = process.env.FARCASTER_DEVELOPER_MNEMONIC;
  const FID = await getFid();

  const account = mnemonicToAccount(FARCASTER_DEVELOPER_MNEMONIC);
  const appAccountKey = new ViemLocalEip712Signer(account);

  const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours
  const uintAddress = hexToBytes(public_key as `0x${string}`);

  const signature = await appAccountKey.signKeyRequest({
    requestFid: BigInt(FID),
    key: uintAddress,
    deadline: BigInt(deadline),
  });

  if (signature.isErr()) {
    return {
      deadline,
      signature: "",
    };
  }

  const sigHex = bytesToHex(signature.value);

  return { deadline, signature: sigHex };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { u_fid } = req.body;
    if (!u_fid) {
      res.status(400).json({ error: "u_fid is required" });
    }

    const signer_uuid = await redis.get(`signer_uuid:${u_fid}`);
    if (signer_uuid) {
      const { data } = await axios.get(
        "https://api.neynar.com/v2/farcaster/signer?signer_uuid=" + signer_uuid,
        {
          headers: {
            "x-api-key": process.env.NEYNAR_API_KEY as string,
          },
        }
      );
      if (data.status === "revoked") {
        const signedKey = await getSignedKey();
        await redis.set(`signer_uuid:${u_fid}`, signedKey.signer_uuid); // Store for 24 hours)
        return res.status(200).json({
          ...signedKey,
        });
      }
      return res.status(200).json({
        ...data,
      });
    } else {
      const signedKey = await getSignedKey();
      await redis.set(`signer_uuid:${u_fid}`, signedKey.signer_uuid); // Store for 24 hours)
      return res.status(200).json({
        ...signedKey,
      });
    }

    // const signedKey = await getSignedKey();
  } catch (e: any) {
    console.error("Error in get_signer handler:", e);
    res.status(500).json({ error: "Error fetching signer" });
  }
}
