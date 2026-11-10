import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { CalendarIcon, XIcon } from "lucide-react";
import { useState } from "react";
import ScheduleReportForm from "./schedule-report-form";

const ScheduleReportDrawer = () => {
  const [open, setOpen] = useState(false);
  const onCloseDrawer = () => {
    setOpen(false);
  };
  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button className="cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)]">
          <CalendarIcon className="h-4 w-4" />
          <span>Report Settings</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="inset-y-0 right-0 h-full w-full sm:max-w-md overflow-y-auto bg-[#0e0e13]/95 backdrop-blur-2xl border-l border-white/[0.09]">
        <DrawerHeader className="relative pb-3 pt-5 border-b border-white/[0.06]">
          <div>
            <DrawerTitle className="text-xl font-semibold tracking-tight text-white">
              Report Settings
            </DrawerTitle>
            <DrawerDescription className="text-xs text-[#8e8e93]">
              Enable or disable monthly financial report emails
            </DrawerDescription>
          </div>
          <DrawerClose className="absolute top-5 right-4 h-7 w-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#8e8e93] hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95">
            <XIcon className="h-4 w-4" />
          </DrawerClose>
        </DrawerHeader>

        <ScheduleReportForm  {...{onCloseDrawer}} />
      </DrawerContent>
    </Drawer>
  );
};

export default ScheduleReportDrawer;
