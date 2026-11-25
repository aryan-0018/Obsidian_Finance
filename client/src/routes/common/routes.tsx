import { lazy } from "react";
import { AUTH_ROUTES, PROTECTED_ROUTES } from "./routePath";

const SignIn = lazy(() => import("@/pages/auth/sign-in"));
const SignUp = lazy(() => import("@/pages/auth/sign-up"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Transactions = lazy(() => import("@/pages/transactions"));
const Accounts = lazy(() => import("@/pages/accounts"));
const Planning = lazy(() => import("@/pages/planning"));
const Reports = lazy(() => import("@/pages/reports"));
const Analytics = lazy(() => import("@/pages/analytics"));
const About = lazy(() => import("@/pages/about"));
const Help = lazy(() => import("@/pages/help"));
const Settings = lazy(() => import("@/pages/settings"));
const Account = lazy(() => import("@/pages/settings/account"));
const Billing = lazy(() => import("@/pages/settings/billing"));
const TelegramCopilotSettings = lazy(() => import("@/pages/settings/copilot"));
const SecuritySettings = lazy(() => import("@/pages/settings/security"));
const SmsSyncSettings = lazy(() => import("@/pages/settings/sms-sync"));

export const authenticationRoutePaths = [
  { path: AUTH_ROUTES.SIGN_IN, element: <SignIn /> },
  { path: AUTH_ROUTES.SIGN_UP, element: <SignUp /> },
];

export const protectedRoutePaths = [
  { path: PROTECTED_ROUTES.OVERVIEW, element: <Dashboard /> },
  { path: PROTECTED_ROUTES.TRANSACTIONS, element: <Transactions /> },
  { path: PROTECTED_ROUTES.ACCOUNTS, element: <Accounts /> },
  { path: PROTECTED_ROUTES.PLANNING, element: <Planning /> },
  { path: PROTECTED_ROUTES.REPORTS, element: <Reports /> },
  { path: PROTECTED_ROUTES.ANALYTICS, element: <Analytics /> },
  { path: PROTECTED_ROUTES.ABOUT, element: <About /> },
  { path: PROTECTED_ROUTES.HELP, element: <Help /> },
  {
    path: PROTECTED_ROUTES.SETTINGS,
    element: <Settings />,
    children: [
      { index: true, element: <Account /> }, // Default route
      { path: PROTECTED_ROUTES.SETTINGS, element: <Account /> },
      { path: PROTECTED_ROUTES.SETTINGS_BILLING, element: <Billing /> },
      { path: PROTECTED_ROUTES.SETTINGS_COPILOT, element: <TelegramCopilotSettings /> },
      { path: PROTECTED_ROUTES.SETTINGS_SECURITY, element: <SecuritySettings /> },
      { path: PROTECTED_ROUTES.SETTINGS_SMS, element: <SmsSyncSettings /> },
    ]
  },
];
