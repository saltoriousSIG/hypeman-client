import { useCallback, useMemo } from "react";
import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { config } from "@/wagmi";
import { DIAMOND_ADDRESS } from "@/lib/utils";
import AcceptPromotion from "../abis/AcceptPromotion.json";
import Claim from "../abis/Claim.json";
import CreatePromotion from "../abis/CreatePromotion.json";
import PromotionData from "../abis/PromotionData.json";
import RefundPromotion from "../abis/RefundPromotion.json";
import RejectPromotion from "../abis/RefundPromotion.json";
import ERC20 from "../abis/ERC20.json";

type Facets =
  | "Create"
  | "Accept"
  | "Claim"
  | "Data"
  | "Reject"
  | "Refund"
  | "ERC20";

export enum ExecutionType {
  READABLE,
  WRITABLE,
}

type ExecutionResult<
  T extends ExecutionType,
  R = any,
> = T extends ExecutionType.READABLE
  ? (args: Array<any>) => Promise<R>
  : (args: Array<any>) => Promise<`0x${string}`>;

const useContract = <T extends ExecutionType, R = any>(
  type: T,
  facet: Facets,
  functionName: string,
  contractAddress: `0x${string}` = "0x0"
): ExecutionResult<T, R> => {
  const abi = useMemo(() => {
    switch (facet) {
      case "Claim":
        return Claim;
        break;
      case "Accept":
        return AcceptPromotion;
        break;
      case "Create":
        return CreatePromotion;
        break;
      case "Data":
        return PromotionData;
        break;
      case "Reject":
        return RejectPromotion;
        break;
      case "Refund":
        return RefundPromotion;
        break;
      case "ERC20":
        return ERC20;
        break;
      default:
        return ERC20;
    }
  }, [facet]);

  const execute = useCallback(
    async (args: Array<any>) => {
      try {
        let res;
        switch (type) {
          case ExecutionType.READABLE:
            res = await readContract(config as any, {
              abi,
              address: facet === "ERC20" ? contractAddress : DIAMOND_ADDRESS,
              functionName,
              args,
            });
            break;
          case ExecutionType.WRITABLE:
            const hash = await writeContract(config as any, {
              abi,
              address: facet === "ERC20" ? contractAddress : DIAMOND_ADDRESS,
              functionName,
              args,
            });
            const receipt = await waitForTransactionReceipt(config as any, {
              hash,
            });
            res = { hash, receipt };
            break;
        }
        return res as any;
      } catch (e: any) {
        throw new Error(e.message);
      }
    },
    [abi, functionName, contractAddress]
  );

  return execute;
};

export default useContract;
