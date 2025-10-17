import { Cast } from "@neynar/nodejs-sdk/build/api";
export enum PromotionState {
  ACTIVE, // Promotion is live and can receive posts
  COMPLETED, // Budget exhausted or manually completed
  EJECTED,
}

export type Promotion = {
  amount_paid_out: bigint;
  cast_text?: string;
  created_time: bigint;
  creator: string;
  creator_fid: bigint;
  description: string;
  id: string;
  is_open_promotion: boolean;
  name: string;
  project_url: string;
  refund_requested: boolean;
  remaining_budget: bigint;
  state: number;
  token: string;
  total_budget: bigint;
  neynar_score: string;
  pro_user: boolean;
  claimable: boolean;
  cast_data: {
    text: string;
    author: Cast["author"];
    embeds: Cast["embeds"];
  };
};

export type PromotionCasts = {
  id: string;
  generated_cast: string;
  author: string;
  cast_text: string;
  cast_embed_context: Array<{ type: string; value: string }>;
};
