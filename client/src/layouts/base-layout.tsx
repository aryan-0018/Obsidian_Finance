import { Outlet } from "react-router-dom";

const BaseLayout = () => {
  return (
    <div className="w-full h-screen max-h-screen overflow-hidden bg-[#0a0a0a]">
      <Outlet />
    </div>
  );
};

export default BaseLayout;
