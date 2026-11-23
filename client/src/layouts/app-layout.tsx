import { useEffect } from "react";
import Navbar from "@/components/navbar";
import { Outlet } from "react-router-dom";
import EditTransactionDrawer from "@/components/transaction/edit-transaction-drawer";
import { CommandPalette } from "@/components/command-palette";
import AddTransactionDrawer from "@/components/transaction/add-transaction-drawer";
import ImportTransactionModal from "@/components/transaction/import-transaction-modal";
import ExportTransactionModal from "@/components/transaction/export-transaction-modal";
import LedgerAuditModal from "@/components/transaction/ledger-audit-modal";
import { TelegramCopilotButton } from "@/components/telegram-copilot-modal";
import { useGetCurrentUserQuery } from "@/features/user/userAPI";
import { updateCredentials } from "@/features/auth/authSlice";
import { useAppDispatch } from "@/app/hook";

const AppLayout = () => {
  const dispatch = useAppDispatch();
  const { data: userData } = useGetCurrentUserQuery();

  useEffect(() => {
    if (userData?.user) {
      dispatch(updateCredentials({ user: userData.user }));
    }
  }, [userData, dispatch]);

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
      <AddTransactionDrawer headless listenGlobal />
      <ImportTransactionModal headless listenGlobal />
      <ExportTransactionModal headless listenGlobal />
      <LedgerAuditModal headless listenGlobal />
      <TelegramCopilotButton headless listenGlobal />
    </>
  );
};

export default AppLayout;
