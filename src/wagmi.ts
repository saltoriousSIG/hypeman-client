import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { http, createConfig } from "wagmi";
import { base, mainnet } from "wagmi/chains";

export const config = createConfig({
  chains: [base, mainnet],
  connectors: [farcasterFrame()],
  transports: {
    [base.id]: http(
      "https://yolo-fabled-wave.base-mainnet.quiknode.pro/89d0417479d5e2b5f8749f7f76ec159e9e378aba/"
    ),
    [mainnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
