export const embedConfig = {
  version: "next",
  imageUrl:
    "https://hypeman.social/hypeman.png",
  button: {
    title: "Find your Hypeman",
    action: {
      type: "launch_frame",
      name: "Hypeman",
      url: "https://hypeman.social",
    },
  },
} as const;

/**
 * Main App Configuration
 */
export const config = {
  embed: embedConfig,
} as const;
