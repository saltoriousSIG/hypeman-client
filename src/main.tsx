import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { FrameSDKProvider } from "./providers/FrameProvider.tsx";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner"
import { DataProvider } from "./providers/DataProvider.tsx";


import App from "./App.tsx";
import { config } from "./wagmi.ts";

import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FrameSDKProvider>
          <DataProvider>
            <App />
            <Toaster />
          </DataProvider>
        </FrameSDKProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </WagmiProvider>
);
