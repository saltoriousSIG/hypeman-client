import { useMemo } from "react";
import axios from "axios";
import { useFrameContext } from "@/providers/FrameProvider";

const useAxios = () => {
  const { address, fUser } = useFrameContext();

  return useMemo(() => {
    if (!fUser || !address) return axios;

    const instance = axios.create();

    instance.interceptors.request.use((config) => {
      config.headers["x-fc-message"] = btoa(
        sessionStorage.getItem(`message:${fUser.fid}`) || ""
      );
      config.headers["x-fc-signature"] =
        sessionStorage.getItem(`signature:${fUser.fid}`) || "";
      config.headers["x-fc-nonce"] = address || "";
      return config;
    });

    return instance;
  }, [address, fUser]); // Recreate when address changes
};

export default useAxios;
