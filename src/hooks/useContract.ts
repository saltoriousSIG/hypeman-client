import { useCallback, useMemo } from "react";
import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
  simulateContract,
} from "@wagmi/core";
import { config } from "@/wagmi";
import { DIAMOND_ADDRESS } from "@/lib/utils";
import PromotionData from "../abis/PromotionData.json";
import PromotionClaim from "../abis/PromotionClaim.json";
import PromotionCreate from "../abis/PromotionCreate.json";
import PromotionManage from "../abis/PromotionManage.json";
import PromotionIntents from "../abis/PromotionIntents.json";
import ERC20 from "../abis/ERC20.json";

type Facets = "Create" | "Claim" | "Data" | "Manage" | "Intents" | "ERC20";

export enum ExecutionType {
  READABLE,
  WRITABLE,
}

type ExecutionResult<
  T extends ExecutionType,
  R = any,
> = T extends ExecutionType.READABLE
  ? (args: Array<any>) => Promise<R>
  : (args: Array<any>) => Promise<{ hash: `0x${string}`; receipt: any; result: string }>;

const useContract = <T extends ExecutionType, R = any>(
  type: T,
  facet: Facets,
  functionName: string,
  contractAddress: `0x${string}` = "0x0"
): ExecutionResult<T, R> => {
  const abi = useMemo(() => {
    switch (facet) {
      case "Claim":
        return PromotionClaim;
      case "Create":
        return PromotionCreate;
      case "Data":
        return PromotionData;
      case "Manage":
        return PromotionManage;
      case "Intents":
        return PromotionIntents;
      case "ERC20":
        return ERC20;
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
            const { result }: { result: bigint } = await simulateContract(config as any, {
              abi,
              address: facet === "ERC20" ? contractAddress : DIAMOND_ADDRESS,
              functionName,
              args,
            });

            const hash = await writeContract(config as any, {
              abi,
              address: facet === "ERC20" ? contractAddress : DIAMOND_ADDRESS,
              functionName,
              args,
            });
            const receipt = await waitForTransactionReceipt(config as any, {
              hash,
            });
            console.log(result);
            res = { hash, receipt, result: result?.toString() };
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
