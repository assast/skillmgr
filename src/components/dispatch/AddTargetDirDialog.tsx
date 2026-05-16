import { useState } from "react";
import { useDispatchStore } from "@/store/dispatchStore";
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
import { FolderPlus } from "lucide-react";
import { open as openFolderPicker } from "@tauri-apps/plugin-dialog";

export function AddTargetDirDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addTargetDir } = useDispatchStore();
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [skillsSubdir, setSkillsSubdir] = useState("");
  const [description, setDescription] = useState("");

  const handlePickFolder = async () => {
    const selected = await openFolderPicker({
      directory: true,
      multiple: false,
    });
    if (selected) {
      setPath(selected);
      if (!name) {
        const parts = selected.split("/");
        setName(parts[parts.length - 1] || "New Project");
      }
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !path.trim()) {
      toast.error("Name and path are required");
      return;
    }
    try {
      await addTargetDir({
        name: name.trim(),
        path: path.trim(),
        skillsSubdir: skillsSubdir.trim() || undefined,
        description: description.trim() || null,
      });
      toast.success("Project directory added");
      onOpenChange(false);
      setName("");
      setPath("");
      setSkillsSubdir("");
      setDescription("");
    } catch (error) {
      toast.error(
        `Failed to add directory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Project Directory</DialogTitle>
          <DialogDescription>
            Add a target directory to dispatch skills to.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Directory Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Frontend Project"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Directory Path</label>
            <div className="flex gap-2">
              <Input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/path/to/project"
                className="flex-1"
              />
              <Button variant="outline" onClick={handlePickFolder}>
                <FolderPlus className="h-4 w-4 mr-1" />
                Browse
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Skills Subdirectory (optional)
            </label>
            <Input
              value={skillsSubdir}
              onChange={(e) => setSkillsSubdir(e.target.value)}
              placeholder="e.g., .claude/skills"
            />
            <p className="text-xs text-muted-foreground">
              Skills will be dispatched to [path]/[subdirectory]. Leave empty to
              use the root path.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this project..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !path.trim()}
          >
            Add Directory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
