import { createSlice } from "@reduxjs/toolkit";
import type { AuthReportSetting, AuthUser } from "./authType";

interface AuthState {
  accessToken: string | null;
  expiresAt: number | null;
  user: AuthUser | null;
  reportSetting: AuthReportSetting | null;
  portfolioBalance: number;
}

const initialState: AuthState = {
  accessToken: null,
  expiresAt: null,
  user: null,
  reportSetting: null,
  portfolioBalance: 0,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.expiresAt = action.payload.expiresAt;
      state.user = action.payload.user;
      state.reportSetting = action.payload.reportSetting ?? null;
      if (action.payload.user?.portfolioBalance !== undefined) {
        state.portfolioBalance = action.payload.user.portfolioBalance;
      }
    },
    setPortfolioBalance: (state, action) => {
      state.portfolioBalance = action.payload;
    },
    updateCredentials: (state, action) => {
      const { accessToken, expiresAt, user, reportSetting } = action.payload;

      if (accessToken !== undefined) state.accessToken = accessToken;
      if (expiresAt !== undefined) state.expiresAt = expiresAt;
      if (user !== undefined) {
        state.user = state.user ? { ...state.user, ...user } : user;
        if (user.portfolioBalance !== undefined) {
          state.portfolioBalance = user.portfolioBalance;
        }
      }
      if (reportSetting !== undefined) {
        state.reportSetting = state.reportSetting
          ? { ...state.reportSetting, ...reportSetting }
          : reportSetting;
      }
    },
    logout: (state) => {
      state.accessToken = null;
      state.expiresAt = null;
      state.user = null;
      state.reportSetting = null;
      state.portfolioBalance = 0;
    },
  },
});

export const { setCredentials, updateCredentials, logout, setPortfolioBalance } =
  authSlice.actions;
export default authSlice.reducer;
