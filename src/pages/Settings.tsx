import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Brain,
  GitBranch,
  FolderOpen,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Star,
  AlertTriangle,
} from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useConfigStore } from "@/store/configStore";
import { LLMProvider, LLMModel } from "@/types/llm";
import { open } from "@tauri-apps/plugin-dialog";

export function SettingsPage() {
  const {
    providers,
    availableModels,
    gitConfig,
    isLoading,
    loadLLMProviders,
    saveLLMProviders,
    fetchModels,
    loadGitConfig,
    saveGitConfig,
  } = useSettingsStore();

  const { basePath, migrateBaseDirectory } = useConfigStore();

  const [isMigrating, setIsMigrating] = useState(false);
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);
  const [migrateTarget, setMigrateTarget] = useState<string | null>(null);
  const [requireRestart, setRequireRestart] = useState(false);

  // LLM provider editing state
  const [editingProviders, setEditingProviders] = useState<LLMProvider[]>([]);
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(
    null,
  );
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Git editing state
  const [gitPath, setGitPath] = useState("");

  useEffect(() => {
    loadLLMProviders();
    loadGitConfig();
  }, [loadLLMProviders, loadGitConfig]);

  useEffect(() => {
    setEditingProviders(providers);
  }, [providers]);

  useEffect(() => {
    if (gitConfig) {
      setGitPath(gitConfig.executablePath || "");
    }
  }, [gitConfig]);

  // --- Base Directory ---

  const handleChangeDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select New Base Directory",
      });
      if (selected && typeof selected === "string") {
        setMigrateTarget(selected);
        setShowMigrateDialog(true);
      }
    } catch (err) {
      console.error("Failed to select directory:", err);
    }
  };

  const handleMigrate = async () => {
    if (!migrateTarget) return;
    setIsMigrating(true);
    try {
      const restart = await migrateBaseDirectory(migrateTarget);
      setRequireRestart(restart);
      setShowMigrateDialog(false);
      if (restart) {
        toast.info("Migration completed. Please restart the application.");
      } else {
        toast.success("Base directory updated successfully.");
      }
    } catch (error) {
      toast.error(`Migration failed: ${(error as Error).message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  // --- LLM Providers ---

  const handleAddProvider = () => {
    const newProvider: LLMProvider = {
      id: crypto.randomUUID(),
      name: `Provider ${editingProviders.length + 1}`,
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
      isDefault: editingProviders.length === 0,
    };
    setEditingProviders([...editingProviders, newProvider]);
    setExpandedProviderId(newProvider.id);
    setHasUnsavedChanges(true);
  };

  const handleUpdateProvider = (id: string, updates: Partial<LLMProvider>) => {
    setEditingProviders(
      editingProviders.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
    setHasUnsavedChanges(true);
  };

  const handleDeleteProvider = (id: string) => {
    const updated = editingProviders.filter((p) => p.id !== id);
    if (updated.length > 0 && !updated.some((p) => p.isDefault)) {
      updated[0] = { ...updated[0], isDefault: true };
    }
    setEditingProviders(updated);
    if (expandedProviderId === id) setExpandedProviderId(null);
    setHasUnsavedChanges(true);
  };

  const handleSetDefault = (id: string) => {
    setEditingProviders(
      editingProviders.map((p) => ({
        ...p,
        isDefault: p.id === id,
      })),
    );
    setHasUnsavedChanges(true);
  };

  const handleSaveProviders = async () => {
    try {
      await saveLLMProviders(editingProviders);
      setHasUnsavedChanges(false);
      toast.success("LLM providers saved successfully");
    } catch (error) {
      toast.error(`Failed to save: ${(error as Error).message}`);
    }
  };

  const handleFetchModels = async (baseUrl: string, apiKey: string) => {
    if (!baseUrl || !apiKey) {
      toast.error("Base URL and API Key are required to fetch models");
      return;
    }
    setIsFetchingModels(true);
    try {
      const models = await fetchModels(baseUrl, apiKey);
      toast.success(`Fetched ${models.length} models`);
    } catch (error) {
      toast.error(`Failed to fetch models: ${(error as Error).message}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  // --- Git ---

  const handleSaveGit = async () => {
    try {
      await saveGitConfig(gitPath);
      toast.success("Git configuration saved");
    } catch (error) {
      toast.error(`Failed to save: ${(error as Error).message}`);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Configure your Skill Vaults preferences
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Base Directory */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-100/80 rounded-lg flex items-center justify-center">
                <FolderOpen className="h-4 w-4 text-teal-600" />
              </div>
              <CardTitle>Base Directory</CardTitle>
            </div>
            <CardDescription>Your skill vault storage location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-white/40 backdrop-blur-sm rounded-xl border border-white/30">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    Current Path
                  </p>
                  <p className="text-sm font-mono break-all">
                    {basePath || "Not configured"}
                  </p>
                </div>
                <Button
                  onClick={handleChangeDirectory}
                  disabled={isMigrating}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  {isMigrating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FolderOpen className="mr-2 h-4 w-4" />
                  )}
                  Change
                </Button>
              </div>
            </div>

            {requireRestart && (
              <div className="flex items-center gap-2 p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  Directory migrated. Please restart the application for changes
                  to take effect.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LLM Providers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100/80 rounded-lg flex items-center justify-center">
                  <Brain className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle>LLM Providers</CardTitle>
                  <CardDescription>
                    Configure language model providers for skill analysis
                  </CardDescription>
                </div>
              </div>
              <Button onClick={handleAddProvider} size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" />
                Add Provider
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {editingProviders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No LLM providers configured</p>
                <p className="text-xs mt-1">
                  Add a provider to enable AI-powered skill analysis
                </p>
              </div>
            ) : (
              editingProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="border border-white/30 rounded-xl overflow-hidden"
                >
                  {/* Provider Header */}
                  <button
                    className="w-full flex items-center justify-between p-3 hover:bg-white/20 transition-colors"
                    onClick={() =>
                      setExpandedProviderId(
                        expandedProviderId === provider.id ? null : provider.id,
                      )
                    }
                  >
                    <div className="flex items-center gap-2">
                      {expandedProviderId === provider.id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">
                        {provider.name}
                      </span>
                      {provider.isDefault && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100/80 text-blue-700 rounded-md">
                          <Star className="h-3 w-3" />
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {provider.model}
                    </span>
                  </button>

                  {/* Provider Editor */}
                  {expandedProviderId === provider.id && (
                    <div className="p-4 pt-0 space-y-3 border-t border-white/20">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={provider.name}
                            onChange={(e) =>
                              handleUpdateProvider(provider.id, {
                                name: e.target.value,
                              })
                            }
                            placeholder="OpenAI"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">API Key</Label>
                          <Input
                            type="password"
                            value={provider.apiKey}
                            onChange={(e) =>
                              handleUpdateProvider(provider.id, {
                                apiKey: e.target.value,
                              })
                            }
                            placeholder="sk-..."
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Base URL</Label>
                        <Input
                          value={provider.baseUrl}
                          onChange={(e) =>
                            handleUpdateProvider(provider.id, {
                              baseUrl: e.target.value,
                            })
                          }
                          placeholder="https://api.openai.com/v1"
                        />
                        <p className="text-xs text-muted-foreground">
                          OpenAI-compatible API endpoint
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Model</Label>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs"
                            disabled={
                              isFetchingModels ||
                              !provider.baseUrl ||
                              !provider.apiKey
                            }
                            onClick={() =>
                              handleFetchModels(
                                provider.baseUrl,
                                provider.apiKey,
                              )
                            }
                          >
                            {isFetchingModels ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-1 h-3 w-3" />
                            )}
                            Fetch Models
                          </Button>
                        </div>
                        {availableModels.length > 0 ? (
                          <Select
                            value={provider.model}
                            onValueChange={(value) =>
                              handleUpdateProvider(provider.id, {
                                model: value,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableModels.map((model: LLMModel) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={provider.model}
                            onChange={(e) =>
                              handleUpdateProvider(provider.id, {
                                model: e.target.value,
                              })
                            }
                            placeholder="gpt-4o"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        {!provider.isDefault && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetDefault(provider.id)}
                          >
                            <Star className="mr-1 h-3 w-3" />
                            Set Default
                          </Button>
                        )}
                        <div className="flex-1" />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50/80"
                          onClick={() => handleDeleteProvider(provider.id)}
                          disabled={editingProviders.length <= 1}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {editingProviders.length > 0 && (
              <div className="pt-2">
                <Button
                  onClick={handleSaveProviders}
                  disabled={isLoading || !hasUnsavedChanges}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Providers"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Git Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100/80 rounded-lg flex items-center justify-center">
                <GitBranch className="h-4 w-4 text-purple-600" />
              </div>
              <CardTitle>Git Configuration</CardTitle>
            </div>
            <CardDescription>
              Git executable path for repository operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white/40 backdrop-blur-sm rounded-xl border border-white/30">
              <div className="text-sm">
                <span className="text-muted-foreground">System Git: </span>
                <span className="font-mono text-xs">
                  {gitConfig?.detectedPath || "Not detected"}
                </span>
              </div>
              {gitConfig?.detectedPath ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gitPath">
                Custom Git Path{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="gitPath"
                value={gitPath}
                onChange={(e) => setGitPath(e.target.value)}
                placeholder={gitConfig?.detectedPath || "/usr/bin/git"}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the auto-detected system Git
              </p>
            </div>

            <Button onClick={handleSaveGit} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>

        {/* App Updates */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-100/80 rounded-lg flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-teal-600" />
              </div>
              <CardTitle>App Updates</CardTitle>
            </div>
            <CardDescription>
              Check for new versions and update Skill Vaults
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Current version: {__APP_VERSION__}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatic updates are coming soon
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Migration Confirmation Dialog */}
      <Dialog open={showMigrateDialog} onOpenChange={setShowMigrateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Migrate Base Directory</DialogTitle>
            <DialogDescription>
              This will move all your skill repositories, configurations, and
              database to the new location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-white/40 rounded-xl border border-white/30">
              <p className="text-xs text-muted-foreground">From</p>
              <p className="text-sm font-mono break-all">{basePath}</p>
            </div>
            <div className="text-center text-muted-foreground">↓</div>
            <div className="p-3 bg-white/40 rounded-xl border border-white/30">
              <p className="text-xs text-muted-foreground">To</p>
              <p className="text-sm font-mono break-all">{migrateTarget}</p>
            </div>
            <div className="flex items-start gap-2 p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-medium">This action requires app restart</p>
                <p className="mt-1">
                  Ensure you have a backup before migrating. The app will need
                  to restart after migration completes.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMigrateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleMigrate} disabled={isMigrating}>
              {isMigrating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FolderOpen className="mr-2 h-4 w-4" />
              )}
              Migrate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
