import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader } from "lucide-react";
import { Button } from "../ui/button";
import { useState } from "react";
import { useAppDispatch } from "@/app/hook";
import { apiClient } from "@/app/api-client";
import { logout } from "@/features/auth/authSlice";
import { useLogoutMutation } from "@/features/auth/authAPI";
import { useNavigate } from "react-router-dom";
import { AUTH_ROUTES } from "@/routes/common/routePath";

interface LogoutDialogProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

const LogoutDialog = ({ isOpen, setIsOpen }: LogoutDialogProps) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutMutation] = useLogoutMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutMutation().unwrap();
    } catch {
      // Proceed with local session teardown even if server logout fails
    } finally {
      try {
        localStorage.removeItem("obsidian_ai_chat_history_v1");
      } catch {
        // ignore storage errors
      }
      dispatch(logout());
      dispatch(apiClient.util.resetApiState());
      setIsOpen(false);
      setIsLoggingOut(false);
      navigate(AUTH_ROUTES.SIGN_IN, { replace: true });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-sm rounded-2xl obsidian-card bg-[#0e0e12] border border-white/[0.10] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <DialogHeader className="text-center sm:text-center pb-2">
          <DialogTitle className="text-base font-semibold text-white">
            Log Out of Obsidian?
          </DialogTitle>
          <DialogDescription className="text-xs text-[#a1a1aa] leading-relaxed">
            Your active session will be securely terminated. You can log back in
            at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoggingOut}
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex-1 text-xs border-white/[0.10]"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={isLoggingOut}
            type="button"
            onClick={handleLogout}
            className="flex-1 text-xs"
          >
            {isLoggingOut && <Loader className="h-3.5 w-3.5 animate-spin mr-1" />}
            Log Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutDialog;
