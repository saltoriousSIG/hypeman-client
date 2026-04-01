import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { http, createConfig } from "wagmi";
import { base, mainnet } from "wagmi/chains";

export const config = createConfig({
  chains: [base, mainnet],
  connectors: [farcasterFrame()],
  transports: {
    [base.id]: http(
      "https://lasso.sh/rpc/profile/default/load-balanced/base?key=lasso_2jUd3eZhGjDJ73sFYZQ3FRbdMIh1EHKCl"
    ),
    [mainnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
