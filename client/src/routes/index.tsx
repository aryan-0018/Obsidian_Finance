import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import {
  authenticationRoutePaths,
  protectedRoutePaths,
} from "./common/routes";
import AppLayout from "@/layouts/app-layout";
import BaseLayout from "@/layouts/base-layout";
import AuthRoute from "./authRoute";
import ProtectedRoute from "./protectedRoute";
import useAuthExpiration from "@/hooks/use-auth-expiration";
import { Loader2 } from "lucide-react";

const NotFound = lazy(() => import("@/pages/not-found"));

const RouteFallback = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-[#070709] text-[#fcfcfc]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-7 w-7 animate-spin text-[#e5c158]" />
      <span className="text-xs tracking-widest uppercase text-[#8e8e93]">
        Loading Obsidian
      </span>
    </div>
  </div>
);

function AppRoutes() {
  useAuthExpiration();
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<AuthRoute />}>
            <Route element={<BaseLayout />}>
              {authenticationRoutePaths.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={route.element}
                />
              ))}
            </Route>
          </Route>
          {/* Protected Route */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {protectedRoutePaths.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={route.element}
                >
                  {route.children?.map((childRoute) => (
                    <Route
                      key={childRoute.path || 'index'}
                      index={childRoute.index}
                      path={childRoute.path}
                      element={childRoute.element}
                    />
                  ))}
                </Route>
              ))}
            </Route>
          </Route>

          {/* Catch-all for undefined routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default AppRoutes;