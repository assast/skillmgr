import { useState } from "react";
import { useDispatchStore } from "@/store/dispatchStore";
import { useSkillStore } from "@/store/skillStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { SkillPicker } from "@/components/skills/SkillPicker";

export function CreateTemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { createTemplate } = useDispatchStore();
  const { skills } = useSkillStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (selectedSkills.size === 0) {
      toast.error("Select at least one skill");
      return;
    }
    try {
      await createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        skillIds: Array.from(selectedSkills),
      });
      toast.success("Template created");
      onOpenChange(false);
      setName("");
      setDescription("");
      setSelectedSkills(new Set());
    } catch (error) {
      toast.error(
        `Failed to create template: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return (
    <>
      <Dialog
        open={open && !showPicker}
        onOpenChange={(v) => {
          if (!v) onOpenChange(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Dispatch Template</DialogTitle>
            <DialogDescription>
              Save a group of skills to dispatch together later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Frontend Project Setup"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description (optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this template is used for..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Skills ({selectedSkills.size} selected)
              </label>
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setShowPicker(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {selectedSkills.size > 0
                  ? `${selectedSkills.size} skills selected`
                  : "Click to select skills..."}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || selectedSkills.size === 0}
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SkillPicker
        skills={skills}
        selected={selectedSkills}
        onSelectionChange={setSelectedSkills}
        open={showPicker}
        onOpenChange={(v) => {
          if (!v) setShowPicker(false);
        }}
        title="Select Skills for Template"
        description="Choose the skills to include in this template."
        confirmLabel="Done"
        onConfirm={() => setShowPicker(false)}
      />
    </>
  );
}
