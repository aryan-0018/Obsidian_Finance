import { Outlet } from "react-router-dom";

const BaseLayout = () => {
  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-[#0a0a0a]">
      <Outlet />
    </div>
  );
};

export default BaseLayout;
