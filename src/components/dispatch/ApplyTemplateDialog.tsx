import { useEffect, useState } from "react";
import { useDispatchStore } from "@/store/dispatchStore";
import { toast } from "sonner";
import { DispatchMethod, parseDispatchMethod } from "@/types/dispatch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send } from "lucide-react";

export function ApplyTemplateDialog({
  templateId,
  open,
  onOpenChange,
}: {
  templateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { targetDirs, dispatchTemplate } = useDispatchStore();
  const [targetDirId, setTargetDirId] = useState("");
  const [method, setMethod] = useState<DispatchMethod>(DispatchMethod.Symlink);

  useEffect(() => {
    if (!open) {
      setTargetDirId("");
      setMethod(DispatchMethod.Symlink);
    }
  }, [open]);

  const handleApply = async () => {
    if (!templateId || !targetDirId) {
      toast.error("Please select a target directory");
      return;
    }
    try {
      const result = await dispatchTemplate(templateId, targetDirId, method);
      if (result.errors.length > 0) {
        toast.warning(
          `Dispatched ${result.successful.length} skills, ${result.errors.length} failed`,
        );
      } else {
        toast.success(
          `Successfully dispatched ${result.successful.length} skills`,
        );
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        `Dispatch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Template</DialogTitle>
          <DialogDescription>
            Select target directory and dispatch method.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Directory</label>
            <Select value={targetDirId} onValueChange={setTargetDirId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a target directory" />
              </SelectTrigger>
              <SelectContent>
                {targetDirs.map((dir) => (
                  <SelectItem key={dir.id} value={dir.id}>
                    {dir.name} ({dir.path})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetDirs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No target directories. Add one first.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dispatch Method</label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(parseDispatchMethod(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DispatchMethod.Symlink}>Symlink</SelectItem>
                <SelectItem value={DispatchMethod.Copy}>Copy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!targetDirId}>
            <Send className="mr-2 h-4 w-4" />
            Dispatch All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
