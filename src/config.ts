export const embedConfig = {
  version: "next",
  imageUrl:
    "https://res.cloudinary.com/dsrjjqkjs/image/upload/v1758053572/cropped-Screenshot_2025-09-15_at_4.59.20_PM_gvvmjo.png",
  button: {
    title: "HYPE",
    action: {
      type: "launch_frame",
      name: "Hypeman",
      url: "",
    },
  },
} as const;

/**
 * Main App Configuration
 */
export const config = {
  embed: embedConfig,
} as const;
