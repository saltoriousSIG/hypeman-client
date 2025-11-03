import { createHmac, timingSafeEqual } from "crypto";

export function verifySignature(
  secretKey: string,
  payload: string,
  nonce: string,
  timestamp: string,
  givenSignature: string
) {
  // First concatenate as strings
  const signatureData = nonce + timestamp + payload;

  // Convert to bytes
  const signatureBytes = Buffer.from(signatureData);

  // Create HMAC with secret key converted to bytes
  const hmac = createHmac("sha256", Buffer.from(secretKey));
  hmac.update(signatureBytes);
  const computedSignature = hmac.digest("hex");

  return timingSafeEqual(
    Buffer.from(computedSignature, "hex"),
    Buffer.from(givenSignature, "hex")
  );
}
