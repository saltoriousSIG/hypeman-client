import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import path from "path";
import { config } from "./src/config";

function fcFrameMeta(): Plugin {
  return {
    name: "inject-fc-miniapp-meta",
    transformIndexHtml(html: string) {
      const embedJson = JSON.stringify(config.embed);
      const metaTag = `<meta name="fc:miniapp" content='${embedJson}'>`;
      return html.replace("</head>", `${metaTag}\n</head>`);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), fcFrameMeta()],
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      api: "/api",
    },
  },
});
