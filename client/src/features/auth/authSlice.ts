import { createSlice } from "@reduxjs/toolkit";

interface AuthState {
  accessToken: string | null;
  expiresAt: number | null;
  user: User | null;
  reportSetting: ReportSetting | null;
  portfolioBalance: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  profilePicture: string;
  currency?: string;
}

interface ReportSetting {
  userId: string;
  frequency?: string;
  isEnabled: boolean;
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
      state.reportSetting = action.payload.reportSetting;
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
        state.user = { ...state.user, ...user };
        if (user.portfolioBalance !== undefined) {
          state.portfolioBalance = user.portfolioBalance;
        }
      }
      if (reportSetting !== undefined)
        state.reportSetting = { ...state.reportSetting, ...reportSetting };
    },
    logout: (state) => {
      state.accessToken = null;
      state.expiresAt = null;
      state.user = null;
      state.reportSetting = null;
    },
  },
});

export const { setCredentials, updateCredentials, logout, setPortfolioBalance } = authSlice.actions;
export default authSlice.reducer;
