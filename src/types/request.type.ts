import { VercelRequest } from "@vercel/node";

export type ExtendedVercelRequest = VercelRequest & {
  fid?: number;
  userData: any;
  address: string;
};

export type QuickNodeEventLogRequest = VercelRequest & {

}
