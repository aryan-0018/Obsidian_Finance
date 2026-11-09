import Navbar from "@/components/navbar";
import { Outlet } from "react-router-dom";
import EditTransactionDrawer from "@/components/transaction/edit-transaction-drawer";
import { CommandPalette } from "@/components/command-palette";

const AppLayout = () => {
  return (
    <>
    <div className="min-h-screen pb-10 w-full max-w-full overflow-x-hidden">
      <Navbar />
      <main className="w-full max-w-full overflow-x-hidden">
        <Outlet />
      </main>
    </div>
    <EditTransactionDrawer />
    <CommandPalette />
    </>
  );
};

export default AppLayout;
