export const embedConfig = {
  version: "next",
  imageUrl:
    "https://res.cloudinary.com/dsrjjqkjs/image/upload/v1760928636/replicate-prediction-t60cxw0m31rmc0csxfbbam7xgr_vlc51o.jpg",
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
