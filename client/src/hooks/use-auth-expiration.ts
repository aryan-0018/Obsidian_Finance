import { useEffect } from "react";
import { useAppDispatch, useTypedSelector } from "@/app/hook";
import { apiClient } from "@/app/api-client";
import { logout, updateCredentials } from "@/features/auth/authSlice";
import { useRefreshMutation } from "@/features/auth/authAPI";

const MAX_TIMEOUT_MS = 2_147_483_647;
const REFRESH_LEEWAY_MS = 30_000;

const useAuthExpiration = () => {
  const { accessToken, expiresAt } = useTypedSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [refreshToken] = useRefreshMutation();

  useEffect(() => {
    let cancelled = false;

    const handleLogout = () => {
      dispatch(logout());
      dispatch(apiClient.util.resetApiState());
    };

    const handleTokenRefresh = async () => {
      try {
        const res = await refreshToken().unwrap();
        if (!cancelled) {
          dispatch(
            updateCredentials({
              accessToken: res.accessToken,
              expiresAt: res.expiresAt,
            })
          );
        }
      } catch {
        if (!cancelled) {
          handleLogout();
        }
      }
    };

    if (accessToken && expiresAt) {
      const currentTime = Date.now();
      const timeUntilExpiration = expiresAt - currentTime;
      if (timeUntilExpiration <= REFRESH_LEEWAY_MS) {
        handleTokenRefresh();
      } else {
        const waitMs = Math.min(
          Math.max(timeUntilExpiration - REFRESH_LEEWAY_MS, 1000),
          MAX_TIMEOUT_MS
        );
        const timer = setTimeout(handleTokenRefresh, waitMs);
        return () => {
          cancelled = true;
          clearTimeout(timer);
        };
      }
    }

    return () => {
      cancelled = true;
    };
  }, [accessToken, dispatch, expiresAt, refreshToken]);
};

export default useAuthExpiration;
