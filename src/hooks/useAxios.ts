import { useMemo } from "react";
import axios from "axios";
import { useFrameContext } from "@/providers/FrameProvider";

const useAxios = () => {
  const { address } = useFrameContext();

  return useMemo(() => {
    const instance = axios.create();

    instance.interceptors.request.use((config) => {
      config.headers["x-fc-message"] = btoa(
        sessionStorage.getItem("message") || ""
      );
      config.headers["x-fc-signature"] =
        sessionStorage.getItem("signature") || "";
      config.headers["x-fc-nonce"] = address || "";
      return config;
    });

    return instance;
  }, [address]); // Recreate when address changes
};

export default useAxios;
