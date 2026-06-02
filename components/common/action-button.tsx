//teleCRM/telecrm-frontend/components/common/action-button.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActionButtonProps = React.ComponentProps<typeof Button>;

/**
 * ActionButton
 * -------------------------
 * Wrapper over shadcn Button that:
 * - avoids variant bg conflicts
 * - allows full Tailwind control via className
 * - safe to use for actions (Call, Edit, Delete, etc.)
 */
export function ActionButton({
  className,
  variant,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      {...props}
      // force a neutral base so custom classes win
      variant={variant ?? "ghost"}
      className={cn(className)}
    />
  );
}
