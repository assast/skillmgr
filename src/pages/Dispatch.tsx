import { useEffect, useState, useMemo } from "react";
import { useDispatchStore } from "@/store/dispatchStore";
import { useSkillStore } from "@/store/skillStore";
import { toast } from "sonner";
import { DispatchMethod, SyncStatus, type TargetDir } from "@/types/dispatch";
import { Skill } from "@/types/skill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  Plus,
  Trash2,
  Send,
  FolderOpen,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Search,
  Pencil,
} from "lucide-react";
import { SkillDetailDialog } from "@/components/skills/SkillDetailDialog";
import { SkillPicker } from "@/components/skills/SkillPicker";
import { DispatchSkillRow } from "@/components/dispatch/DispatchSkillRow";
import { AddTargetDirDialog } from "@/components/dispatch/AddTargetDirDialog";
import { CreateTemplateDialog } from "@/components/dispatch/CreateTemplateDialog";
import { EditTemplateDialog } from "@/components/dispatch/EditTemplateDialog";
import { ApplyTemplateDialog } from "@/components/dispatch/ApplyTemplateDialog";

export function DispatchPage() {
  const {
    targetDirs,
    dispatches,
    templates,
    loading,
    fetchTargetDirs,
    fetchDispatches,
    fetchTemplates,
    syncTargetDirDispatches,
    syncDispatchedSkill,
    bulkDispatch,
    deleteDispatch,
    deleteTargetDir,
    deleteTemplate,
  } = useDispatchStore();
  const { skills, fetchSkills } = useSkillStore();

  const [selectedDirId, setSelectedDirId] = useState<string | null>(null);
  const [showAddDir, setShowAddDir] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(
    null,
  );
  const [templatesExpanded, setTemplatesExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showDispatchPicker, setShowDispatchPicker] = useState(false);
  const [dispatchPickerSelected, setDispatchPickerSelected] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    fetchTargetDirs().catch(() =>
      toast.error("Failed to load project directories"),
    );
    fetchSkills().catch(() => toast.error("Failed to load skills"));
    fetchDispatches().catch(() => toast.error("Failed to load dispatches"));
    fetchTemplates().catch(() => toast.error("Failed to load templates"));
  }, [fetchTargetDirs, fetchSkills, fetchDispatches, fetchTemplates]);

  const selectedDir = targetDirs.find((d) => d.id === selectedDirId) ?? null;
  const skillMap = useMemo(() => {
    const map = new Map<string, Skill>();
    for (const s of skills) map.set(s.id, s);
    return map;
  }, [skills]);

  const dirDispatches = useMemo(() => {
    if (!selectedDirId) return [];
    return dispatches.filter((d) => d.target_dir === selectedDirId);
  }, [dispatches, selectedDirId]);

  const filteredDispatches = useMemo(() => {
    if (!searchQuery) return dirDispatches;
    const q = searchQuery.toLowerCase();
    return dirDispatches.filter((d) => {
      const skill = skillMap.get(d.skill_id);
      return skill?.name.toLowerCase().includes(q);
    });
  }, [dirDispatches, searchQuery, skillMap]);

  const getSkillName = (skillId: string) =>
    skillMap.get(skillId)?.name ?? "Unknown Skill";

  const getDirStats = (dirId: string) => {
    const dirDs = dispatches.filter((d) => d.target_dir === dirId);
    const synced = dirDs.filter(
      (d) => d.sync_status === SyncStatus.Synced,
    ).length;
    const outdated = dirDs.filter(
      (d) => d.sync_status === SyncStatus.Outdated,
    ).length;
    const errors = dirDs.filter(
      (d) =>
        d.sync_status === SyncStatus.Error ||
        d.sync_status === SyncStatus.Conflict,
    ).length;
    return { total: dirDs.length, synced, outdated, errors };
  };

  const handleSyncAll = async () => {
    if (!selectedDirId) return;
    try {
      const result = await syncTargetDirDispatches(selectedDirId);
      if (result.failed.length > 0) {
        toast.warning(
          `Synced ${result.synced.length} skills, ${result.failed.length} failed`,
        );
      } else {
        toast.success(`All ${result.synced.length} skills synced`);
      }
    } catch (error) {
      toast.error(
        `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const handleSyncOne = async (dispatchId: string) => {
    try {
      await syncDispatchedSkill(dispatchId);
    } catch (error) {
      toast.error(
        `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const handleDeleteDir = async (dir: TargetDir) => {
    const dirDs = dispatches.filter((d) => d.target_dir === dir.id);
    const msg =
      dirDs.length > 0
        ? `Delete "${dir.name}"? ${dirDs.length} dispatched skills will be removed from the list (files kept on disk).`
        : `Delete "${dir.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      await deleteTargetDir(dir.id);
      if (selectedDirId === dir.id) setSelectedDirId(null);
    } catch (error) {
      toast.error(
        `Failed to delete: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const handleRemoveDispatch = async (dispatchId: string) => {
    try {
      await deleteDispatch(dispatchId);
    } catch (error) {
      toast.error(
        `Failed to remove: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const handleSkillDetail = (skillId: string) => {
    const skill = skillMap.get(skillId);
    if (skill) {
      setDetailSkill(skill);
      setShowDetail(true);
    }
  };

  const handleDispatchSkills = async () => {
    if (!selectedDirId || dispatchPickerSelected.size === 0) return;
    try {
      const result = await bulkDispatch(
        Array.from(dispatchPickerSelected),
        selectedDirId,
        DispatchMethod.Symlink,
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
      setShowDispatchPicker(false);
      setDispatchPickerSelected(new Set());
    } catch (error) {
      toast.error(
        `Dispatch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const alreadyDispatchedSkillIds = useMemo(() => {
    if (!selectedDirId) return new Set<string>();
    return new Set(
      dispatches
        .filter((d) => d.target_dir === selectedDirId)
        .map((d) => d.skill_id),
    );
  }, [dispatches, selectedDirId]);

  return (
    <div className="container mx-auto py-8 px-4 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dispatches</h1>
          <p className="text-muted-foreground">
            Manage skills across your project directories
          </p>
        </div>
        <Button onClick={() => setShowAddDir(true)}>
          <FolderPlus className="mr-2 h-4 w-4" />
          Add Project Directory
        </Button>
      </div>

      {/* Main Content: Sidebar + Detail */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Sidebar: Target Directories */}
        <div className="w-72 shrink-0 border rounded-2xl bg-white/30 backdrop-blur-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Project Directories
          </div>
          <div className="flex-1 overflow-y-auto">
            {targetDirs.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No directories yet
              </div>
            ) : (
              targetDirs.map((dir) => {
                const stats = getDirStats(dir.id);
                const isActive = selectedDirId === dir.id;
                return (
                  <button
                    key={dir.id}
                    className={`w-full text-left px-4 py-3 border-b transition-colors ${
                      isActive
                        ? "bg-teal-500/10 border-l-2 border-l-teal-500"
                        : "hover:bg-white/40 border-l-2 border-l-transparent"
                    }`}
                    onClick={() => setSelectedDirId(dir.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">
                        {dir.name}
                      </span>
                      <button
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDir(dir);
                        }}
                        title="Delete directory"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {dir.path}
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground">
                        {stats.total} skills
                      </span>
                      {stats.outdated > 0 && (
                        <span className="text-xs text-amber-600">
                          {stats.outdated} outdated
                        </span>
                      )}
                      {stats.errors > 0 && (
                        <span className="text-xs text-red-600">
                          {stats.errors} error
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Skills for selected directory */}
        <div className="flex-1 flex flex-col min-h-0 border rounded-2xl bg-white/30 backdrop-blur-sm overflow-hidden">
          {selectedDir ? (
            <>
              {/* Directory Header */}
              <div className="px-6 py-4 border-b shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selectedDir.name}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedDir.path}
                      {selectedDir.description &&
                        ` — ${selectedDir.description}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      title="Dispatch Skills"
                      onClick={() => {
                        setDispatchPickerSelected(new Set());
                        setShowDispatchPicker(true);
                      }}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-9 w-9"
                      title="Sync All"
                      onClick={handleSyncAll}
                      disabled={loading || dirDispatches.length === 0}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </div>
                {/* Search */}
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    placeholder="Search skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 glass-input rounded-xl"
                  />
                </div>
              </div>

              {/* Skills List */}
              <div className="flex-1 overflow-y-auto px-2 py-2">
                {filteredDispatches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FolderOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">
                      {dirDispatches.length === 0
                        ? "No skills dispatched to this directory"
                        : "No skills match your search"}
                    </p>
                    {dirDispatches.length === 0 && (
                      <p className="text-sm text-muted-foreground/60 mt-1">
                        Click "Dispatch Skills" above or use templates below
                      </p>
                    )}
                  </div>
                ) : (
                  filteredDispatches.map((dispatch) => (
                    <DispatchSkillRow
                      key={dispatch.id}
                      dispatch={dispatch}
                      skill={skillMap.get(dispatch.skill_id)}
                      onSync={() => handleSyncOne(dispatch.id)}
                      onRemove={() => handleRemoveDispatch(dispatch.id)}
                      onDetail={() => handleSkillDetail(dispatch.skill_id)}
                      loading={loading}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-medium mb-1">
                Select a project directory
              </h3>
              <p className="text-muted-foreground max-w-sm">
                Choose a directory from the left panel to view and manage its
                dispatched skills.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Templates Section (bottom, collapsible) */}
      <div className="mt-6 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            onClick={() => setTemplatesExpanded(!templatesExpanded)}
          >
            {templatesExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Dispatch Templates ({templates.length})
          </button>
          <Button size="sm" onClick={() => setShowCreateTemplate(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Template
          </Button>
        </div>

        {templatesExpanded && (
          <div>
            {templates.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center">
                <p className="text-muted-foreground">
                  No templates yet. Create one to save groups of skills for
                  quick dispatch.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((tpl) => {
                  let tplSkillIds: string[];
                  try {
                    tplSkillIds = JSON.parse(tpl.skill_ids);
                  } catch {
                    tplSkillIds = [];
                  }
                  return (
                    <div
                      key={tpl.id}
                      className="border rounded-xl p-4 hover:bg-white/40 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-sm">{tpl.name}</h4>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setEditingTemplateId(tpl.id)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                            onClick={() => deleteTemplate(tpl.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {tpl.description && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {tpl.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mb-3">
                        {tplSkillIds.length} skills:{" "}
                        {tplSkillIds
                          .slice(0, 3)
                          .map((id) => getSkillName(id))
                          .join(", ")}
                        {tplSkillIds.length > 3 &&
                          ` +${tplSkillIds.length - 3} more`}
                      </p>
                      <Button
                        size="sm"
                        className="w-full h-8"
                        onClick={() => setApplyingTemplateId(tpl.id)}
                      >
                        <Send className="mr-1 h-3.5 w-3.5" />
                        Apply to Directory
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddTargetDirDialog open={showAddDir} onOpenChange={setShowAddDir} />
      <CreateTemplateDialog
        open={showCreateTemplate}
        onOpenChange={setShowCreateTemplate}
      />
      <EditTemplateDialog
        templateId={editingTemplateId}
        open={!!editingTemplateId}
        onOpenChange={(open) => {
          if (!open) setEditingTemplateId(null);
        }}
      />
      <ApplyTemplateDialog
        templateId={applyingTemplateId}
        open={!!applyingTemplateId}
        onOpenChange={(open) => {
          if (!open) setApplyingTemplateId(null);
        }}
      />
      <SkillDetailDialog
        skill={detailSkill}
        open={showDetail}
        onOpenChange={setShowDetail}
      />

      {/* Dispatch Skills Picker */}
      <SkillPicker
        skills={skills.filter((s) => !alreadyDispatchedSkillIds.has(s.id))}
        selected={dispatchPickerSelected}
        onSelectionChange={setDispatchPickerSelected}
        open={showDispatchPicker}
        onOpenChange={(v) => {
          if (!v) setShowDispatchPicker(false);
        }}
        title="Dispatch Skills to Directory"
        description={`Select skills to dispatch to "${selectedDir?.name ?? "directory"}".`}
        confirmLabel="Dispatch"
        onConfirm={handleDispatchSkills}
      />
    </div>
  );
}
