"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default", // default, danger, warning, success
  loading = false,
  children,
}) {
  const variants = {
    default: {
      icon: Info,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
      buttonClass: "",
    },
    danger: {
      icon: XCircle,
      iconColor: "text-red-600",
      iconBg: "bg-red-100",
      buttonClass: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      icon: AlertTriangle,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-100",
      buttonClass: "bg-orange-600 hover:bg-orange-700",
    },
    success: {
      icon: CheckCircle,
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
      buttonClass: "bg-green-600 hover:bg-green-700",
    },
  };

  const config = variants[variant] || variants.default;
  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={`grid h-12 w-12 place-items-center rounded-full ${config.iconBg} flex-shrink-0`}
            >
              <Icon className={`h-6 w-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-left">{title}</DialogTitle>
              {description && (
                <DialogDescription className="text-left mt-2">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {children && <div className="py-4">{children}</div>}

        <DialogFooter className="sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={config.buttonClass}
          >
            {loading ? "Processing..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
