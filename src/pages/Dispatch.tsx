import { useEffect, useState } from "react";
import { useDispatchStore } from "@/store/dispatchStore";
import { toast } from "sonner";
import { useSkillStore } from "@/store/skillStore";
import {
  DispatchMethod,
  SyncStatus,
  parseDispatchMethod,
} from "@/types/dispatch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Plus,
  Send,
  Edit,
} from "lucide-react";

const Badge = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium transition-colors ${className}`}
  >
    {children}
  </span>
);

const getStatusColor = (status: SyncStatus) => {
  switch (status) {
    case SyncStatus.Synced:
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case SyncStatus.Outdated:
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case SyncStatus.Conflict:
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case SyncStatus.Error:
      return "bg-red-500/10 text-red-600 border-red-500/20";
  }
};

const getStatusIcon = (status: SyncStatus) => {
  switch (status) {
    case SyncStatus.Synced:
      return <CheckCircle2 className="h-3 w-3 mr-1" />;
    case SyncStatus.Outdated:
      return <Clock className="h-3 w-3 mr-1" />;
    case SyncStatus.Conflict:
      return <AlertTriangle className="h-3 w-3 mr-1" />;
    case SyncStatus.Error:
      return <AlertCircle className="h-3 w-3 mr-1" />;
  }
};

const getMethodColor = (method: DispatchMethod) => {
  switch (method) {
    case DispatchMethod.Symlink:
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case DispatchMethod.Copy:
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
  }
};

export function DispatchPage() {
  const {
    targetDirs,
    dispatches,
    templates,
    loading,
    fetchTargetDirs,
    fetchDispatches,
    fetchTemplates,
    checkDispatchSync,
    syncDispatchedSkill,
    deleteDispatch,
    deleteTemplate,
    createTemplate,
    dispatchTemplate: dispatchTemplateAction,
  } = useDispatchStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { skills, fetchSkills } = useSkillStore();
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [newTemplateSkills, setNewTemplateSkills] = useState<Set<string>>(
    new Set(),
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [dispatchingTemplateId, setDispatchingTemplateId] = useState<
    string | null
  >(null);
  const [dispatchTargetDir, setDispatchTargetDir] = useState("");
  const [dispatchMethod, setDispatchMethod] = useState<DispatchMethod>(
    DispatchMethod.Symlink,
  );

  useEffect(() => {
    fetchTargetDirs().catch(() => {});
    fetchSkills().catch(() => {});
    fetchDispatches().catch(() => {});
    fetchTemplates().catch(() => {});
  }, [fetchTargetDirs, fetchSkills, fetchDispatches, fetchTemplates]);

  const getSkillName = (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    return skill?.name || "Unknown Skill";
  };

  const getTargetDirName = (targetDirId: string) => {
    const dir = targetDirs.find((d) => d.id === targetDirId);
    return dir?.name || "Unknown Directory";
  };

  const handleSync = async (dispatchId: string) => {
    try {
      await checkDispatchSync(dispatchId);
      await syncDispatchedSkill(dispatchId);
      await fetchDispatches();
    } catch (error) {
      console.error("Failed to sync dispatch:", error);
    }
  };

  const handleDelete = async (dispatchId: string) => {
    setDeletingId(dispatchId);
    try {
      await deleteDispatch(dispatchId);
    } catch (error) {
      console.error("Failed to delete dispatch:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (newTemplateSkills.size === 0) {
      toast.error("Select at least one skill");
      return;
    }
    try {
      await createTemplate({
        name: newTemplateName.trim(),
        description: newTemplateDesc.trim() || undefined,
        skill_ids: Array.from(newTemplateSkills),
      });
      toast.success("Template created");
      setShowCreateDialog(false);
      setNewTemplateName("");
      setNewTemplateDesc("");
      setNewTemplateSkills(new Set());
    } catch (error) {
      toast.error(`Failed to create template: ${(error as Error).message}`);
    }
  };

  const handleDispatchTemplate = async () => {
    if (!dispatchingTemplateId) return;
    if (!dispatchTargetDir) {
      toast.error("Please select a target directory");
      return;
    }
    try {
      const result = await dispatchTemplateAction(
        dispatchingTemplateId,
        dispatchTargetDir,
        dispatchMethod,
      );
      if (result.errors.length > 0) {
        toast.warning(
          `Dispatched ${result.successful.length} skills, ${result.errors.length} failed`,
        );
      } else {
        toast.success(
          `Successfully dispatched ${result.successful.length} skills`,
        );
      }
      setDispatchingTemplateId(null);
      setDispatchTargetDir("");
      setDispatchMethod(DispatchMethod.Symlink);
    } catch (error) {
      toast.error(`Dispatch failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dispatches</h1>
          <p className="text-muted-foreground">Manage your dispatched skills</p>
        </div>
        <Button onClick={fetchDispatches} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Templates Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Dispatch Templates</h2>
            <p className="text-muted-foreground">
              Save and reuse groups of skills for quick dispatch
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Frontend Project Setup"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Description (optional)
                  </label>
                  <Textarea
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    placeholder="Describe what this template is used for..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Select Skills ({newTemplateSkills.size} selected)
                  </label>
                  <div className="border border-white/30 rounded-xl bg-white/30 backdrop-blur-sm p-4 max-h-60 overflow-y-auto space-y-2">
                    {skills.map((skill) => (
                      <div key={skill.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`skill-${skill.id}`}
                          className="h-4 w-4 rounded border-gray-300"
                          checked={newTemplateSkills.has(skill.id)}
                          onChange={(e) => {
                            setNewTemplateSkills((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) {
                                next.add(skill.id);
                              } else {
                                next.delete(skill.id);
                              }
                              return next;
                            });
                          }}
                        />
                        <label
                          htmlFor={`skill-${skill.id}`}
                          className="text-sm"
                        >
                          {skill.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateTemplate}>Create Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {templates.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first template to save groups of skills for quick
              dispatch.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => {
              let skillIds: string[];
              try {
                skillIds = JSON.parse(template.skill_ids);
              } catch {
                skillIds = [];
              }
              return (
                <Card key={template.id} className="hover:scale-[1.01]">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl font-semibold">
                        {template.name}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50/50"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {template.description && (
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-2">
                        Skills ({skillIds.length}):
                      </p>
                      <ul className="space-y-1 max-h-24 overflow-y-auto">
                        {skillIds.map((skillId) => (
                          <li key={skillId} className="text-xs">
                            • {getSkillName(skillId)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Dialog
                      open={dispatchingTemplateId === template.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setDispatchingTemplateId(template.id);
                        } else {
                          setDispatchingTemplateId(null);
                          setDispatchTargetDir("");
                          setDispatchMethod(DispatchMethod.Symlink);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button className="w-full">
                          <Send className="mr-2 h-4 w-4" />
                          Dispatch Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Dispatch Template: {template.name}
                          </DialogTitle>
                          <DialogDescription>
                            Select target directory and dispatch method to
                            deploy all skills in this template.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Target Directory
                            </label>
                            <Select
                              value={dispatchTargetDir}
                              onValueChange={setDispatchTargetDir}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select target directory" />
                              </SelectTrigger>
                              <SelectContent>
                                {targetDirs.map((dir) => (
                                  <SelectItem key={dir.id} value={dir.id}>
                                    {dir.name} ({dir.path})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Dispatch Method
                            </label>
                            <Select
                              value={dispatchMethod}
                              onValueChange={(v) =>
                                setDispatchMethod(parseDispatchMethod(v))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={DispatchMethod.Symlink}>
                                  Symlink
                                </SelectItem>
                                <SelectItem value={DispatchMethod.Copy}>
                                  Copy
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleDispatchTemplate}>
                            Dispatch All Skills
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {loading && dispatches.length === 0 && (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground/40" />
        </div>
      )}

      {!loading && dispatches.length === 0 && (
        <div className="flex flex-col justify-center items-center py-20 text-center">
          <div className="w-16 h-16 bg-white/50 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-medium mb-2">No dispatches yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            You haven't dispatched any skills yet. Go to the Skills page and
            click "Dispatch" on any skill to get started.
          </p>
        </div>
      )}

      {dispatches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dispatches.map((dispatch) => (
            <Card
              key={dispatch.id}
              className="overflow-hidden hover:scale-[1.01]"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-semibold">
                    {getSkillName(dispatch.skill_id)}
                  </CardTitle>
                  <Badge className={getStatusColor(dispatch.sync_status)}>
                    {getStatusIcon(dispatch.sync_status)}
                    {dispatch.sync_status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge className={getMethodColor(dispatch.method)}>
                    {dispatch.method}
                  </Badge>
                  <Badge className="bg-white/60 text-foreground/70 border-white/30">
                    {getTargetDirName(dispatch.target_dir)}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Target:</span>
                    <code className="bg-white/40 backdrop-blur-sm px-1.5 py-0.5 rounded-lg text-xs break-all">
                      {dispatch.dest_path}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Source:</span>
                    <code className="bg-white/40 backdrop-blur-sm px-1.5 py-0.5 rounded-lg text-xs break-all">
                      {dispatch.source_path}
                    </code>
                  </div>
                  {dispatch.error_message && (
                    <div className="p-2 bg-red-50/80 border border-red-200/60 rounded-xl mt-2">
                      <p className="text-xs text-red-600">
                        {dispatch.error_message}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-xs text-muted-foreground">
                  Dispatched{" "}
                  {new Date(dispatch.dispatched_at).toLocaleDateString()}
                  {dispatch.last_synced_at && (
                    <span className="block mt-1">
                      Last synced{" "}
                      {new Date(dispatch.last_synced_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      loading ||
                      dispatch.sync_status === SyncStatus.Conflict ||
                      dispatch.sync_status === SyncStatus.Error
                    }
                    onClick={() => handleSync(dispatch.id)}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`}
                    />
                    Sync
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50/50"
                    disabled={loading || deletingId === dispatch.id}
                    onClick={() => handleDelete(dispatch.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
