import { useTypedSelector } from "@/app/hook";
import { Navigate, Outlet } from "react-router-dom";
import { AUTH_ROUTES } from "./common/routePath";

const ProtectedRoute = () => {
  const { accessToken, user } = useTypedSelector((state) => state.auth);
  const isAuthenticated = Boolean(accessToken && user);

  if (isAuthenticated) return <Outlet />;

  return <Navigate to={AUTH_ROUTES.SIGN_IN} replace />;
};

export default ProtectedRoute;
