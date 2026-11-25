export const isAuthRoute = (pathname: string): boolean => {
  return Object.values(AUTH_ROUTES).includes(pathname);
};

export const AUTH_ROUTES = {
  SIGN_IN: "/",
  SIGN_UP: "/sign-up",
};

export const PROTECTED_ROUTES = {
  OVERVIEW: "/overview",
  TRANSACTIONS: "/transactions",
  ACCOUNTS: "/accounts",
  PLANNING: "/planning",
  REPORTS: "/reports",
  ANALYTICS: "/analytics",
  SETTINGS: "/settings",
  ABOUT: "/about",
  HELP: "/help",
  SETTINGS_BILLING: "/settings/billing",
  SETTINGS_COPILOT: "/settings/copilot",
  SETTINGS_SECURITY: "/settings/security",
  SETTINGS_SMS: "/settings/sms",
};
