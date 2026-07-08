import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ManusDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onLogin?: () => void;
  onClose?: () => void;
  logo?: string;
  title?: string;
}

export function ManusDialog({
  open,
  onOpenChange,
  onLogin,
  onClose,
  logo,
  title,
}: ManusDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) onOpenChange(nextOpen);
    else setInternalOpen(nextOpen);
    if (!nextOpen) onClose?.();
  };

  return (
    <Dialog open={onOpenChange ? open : internalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="py-5 bg-[#f8f8f7] rounded-[20px] w-[400px] shadow-lg border border-[rgba(0,0,0,0.08)] p-0 gap-0 text-center">
        <div className="flex flex-col items-center gap-2 p-5 pt-12">
          {logo && (
            <div className="w-16 h-16 bg-white rounded-xl border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
              <img src={logo} alt="Dialog graphic" className="w-10 h-10 rounded-md" />
            </div>
          )}
          {title && (
            <DialogTitle className="text-xl font-semibold text-[#34322d]">{title}</DialogTitle>
          )}
          <DialogDescription className="text-sm text-[#858481]">
            الرجاء تسجيل الدخول للمتابعة
          </DialogDescription>
        </div>
        <DialogFooter className="px-5 py-5">
          <Button
            onClick={onLogin}
            className="w-full h-10 bg-[#1a1a19] hover:bg-[#1a1a19]/90 text-white rounded-[10px] text-sm font-medium"
          >
            تسجيل الدخول
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
