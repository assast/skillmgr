import { useEffect, useState } from "react";
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

export function EditTemplateDialog({
  templateId,
  open,
  onOpenChange,
}: {
  templateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { templates, updateTemplate } = useDispatchStore();
  const { skills } = useSkillStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (open && templateId) {
      const tpl = templates.find((t) => t.id === templateId);
      if (tpl) {
        setName(tpl.name);
        setDescription(tpl.description ?? "");
        try {
          setSelectedSkills(new Set(JSON.parse(tpl.skill_ids)));
        } catch {
          setSelectedSkills(new Set());
        }
      }
    }
  }, [open, templateId, templates]);

  const handleSave = async () => {
    if (!templateId || !name.trim()) return;
    try {
      await updateTemplate(templateId, {
        name: name.trim(),
        description: description.trim() || null,
        skillIds: Array.from(selectedSkills),
      });
      toast.success("Template updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        `Failed to update template: ${error instanceof Error ? error.message : String(error)}`,
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
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Modify template skills and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Template description..."
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
            <Button onClick={handleSave} disabled={!name.trim()}>
              Save Changes
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
        title="Edit Template Skills"
        description="Update the skills included in this template."
        confirmLabel="Done"
        onConfirm={() => setShowPicker(false)}
      />
    </>
  );
}
