import { Helmet } from "react-helmet-async";
import { Promotion } from "@/types/promotion.type";

interface PromotionFrameMetadataProps {
    promotion: Promotion & {
        cast_data?: {
            text: string;
            embeds: any[];
            author: {
                username: string;
                pfp_url?: string;
            };
        };
    };
}

export default function PromotionFrameMetadata({ promotion }: PromotionFrameMetadataProps) {
    const promotionUrl = `https://hypeman.social/promotion/${promotion.id}`;
    const imageUrl = promotion.cast_data?.embeds?.[0]?.url ||
                     "https://res.cloudinary.com/dsrjjqkjs/image/upload/v1760928637/replicate-prediction-ppnmz3g0yxrme0cssvhtx2r54w_alqowu.jpg";

    return (
        <Helmet>
            {/* Open Graph / Farcaster Frame Meta Tags */}
            <meta property="og:title" content={promotion.name || "Promotion"} />
            <meta property="og:description" content={promotion.description || "View this promotion on Hypeman"} />
            <meta property="og:image" content={imageUrl} />
            <meta property="og:url" content={promotionUrl} />

            {/* Farcaster Frame Specific */}
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content={imageUrl} />
            <meta property="fc:frame:button:1" content="View Promotion" />
            <meta property="fc:frame:button:1:action" content="link" />
            <meta property="fc:frame:button:1:target" content={promotionUrl} />

            {/* Additional metadata */}
            <title>{promotion.name || "Promotion"} - Hypeman</title>
            <meta name="description" content={promotion.description || "View this promotion on Hypeman"} />
        </Helmet>
    );
}
