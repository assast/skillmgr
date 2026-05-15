# Repositories Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Repositories management page where users can add, sync, and delete skill source repositories.

**Architecture:** New React page + dialog component. Frontend maps two user-facing types ("Remote Git" / "Local Directory") to backend's three source_types by auto-detecting from URL. Backend gets a bug fix in sync and a new skill-count endpoint. Navigation gains a Repositories entry between Skills and Dispatches.

**Tech Stack:** React, Zustand, Tauri invoke, shadcn/ui (Dialog, Button, Input, Label, RadioGroup), Tailwind CSS, Lucide icons

---

## File Structure

| File                                     | Action | Responsibility                                               |
| ---------------------------------------- | ------ | ------------------------------------------------------------ |
| `src/components/AddRepositoryDialog.tsx` | Create | Dialog form for adding repos (type selector, dynamic fields) |
| `src/pages/Repositories.tsx`             | Create | Main page with repo list, empty state, sync/delete actions   |
| `src/App.tsx`                            | Modify | Add route + nav item, update keyboard shortcuts              |
| `src/pages/Skills.tsx`                   | Modify | Remove "Add Skill" button                                    |
| `src/store/repositoryStore.ts`           | Modify | Add skill count loading action                               |
| `src/types/repository.ts`                | Modify | Add skill_counts type if needed                              |
| `src-tauri/src/main.rs`                  | Modify | Fix sync bug, add skill count command                        |

---

### Task 1: Fix backend sync_repository bug

**Files:**

- Modify: `src-tauri/src/main.rs:281,305`

**Bug:** `sync_repository` checks `repo.source_type == "git"` but valid types are `"github"`, `"private-git"`, `"local"`. Same bug in `sync_all_repositories`. Sync never works for any repo.

- [ ] **Step 1: Fix the condition in sync_repository**

In `src-tauri/src/main.rs`, change line 281 from:

```rust
if repo.source_type == "git" && repo.url.is_some() {
```

to:

```rust
if repo.source_type != "local" && repo.url.is_some() {
```

- [ ] **Step 2: Fix the same condition in sync_all_repositories**

Change line 305 from:

```rust
if repo.source_type == "git" && repo.url.is_some() {
```

to:

```rust
if repo.source_type != "local" && repo.url.is_some() {
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/zengym/workspace/projects/ai/skill-vault/src-tauri && cargo check`
Expected: compiles without errors

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "fix: correct source_type check in sync_repository and sync_all_repositories"
```

---

### Task 2: Add get_repository_skill_counts backend command

**Files:**

- Modify: `src-tauri/src/main.rs`

This adds a new Tauri command that returns a map of repository ID to skill count, so the Repositories page can show skill counts efficiently without loading all skills.

- [ ] **Step 1: Add the new command function**

In `src-tauri/src/main.rs`, add this function after `sync_all_repositories` (around line 320):

```rust
#[tauri::command]
async fn get_repository_skill_counts(
    pool: tauri::State<'_, sqlx::SqlitePool>,
) -> Result<std::collections::HashMap<String, i64>, String> {
    let rows: Vec<(String, i64)> = sqlx::query_as(
        "SELECT repository_id, COUNT(*) as count FROM skills WHERE repository_id IS NOT NULL GROUP BY repository_id"
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.into_iter().collect())
}
```

Add the import at the top of the file if not present:

```rust
use std::collections::HashMap;
```

- [ ] **Step 2: Register the command in the Tauri builder**

Find the `.invoke_handler(tauri::generate_handler![...])` block in `main.rs` and add `get_repository_skill_counts` to the list.

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/zengym/workspace/projects/ai/skill-vault/src-tauri && cargo check`
Expected: compiles without errors

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "feat: add get_repository_skill_counts command"
```

---

### Task 3: Update repository store with skill counts

**Files:**

- Modify: `src/store/repositoryStore.ts`

- [ ] **Step 1: Add skillCounts state and loading action**

In `src/store/repositoryStore.ts`, update the `RepositoryState` interface to add:

```typescript
interface RepositoryState {
  repositories: Repository[];
  skillCounts: Record<string, number>;
  loading: boolean;
  error: string | null;
  getRepositories: () => Promise<void>;
  getRepository: (id: string) => Promise<Repository | null>;
  addRepository: (data: CreateRepositoryRequest) => Promise<Repository>;
  deleteRepository: (id: string) => Promise<void>;
  syncRepository: (id: string) => Promise<Repository>;
  syncAllRepositories: () => Promise<Repository[]>;
  getSkillCounts: () => Promise<void>;
  clearError: () => void;
}
```

Add `skillCounts: {}` to the initial state, and add the action:

```typescript
getSkillCounts: async () => {
  try {
    const counts = await invoke<Record<string, number>>("get_repository_skill_counts");
    set({ skillCounts: counts });
  } catch (error) {
    console.error("Failed to load skill counts:", error);
  }
},
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/zengym/workspace/projects/ai/skill-vault && npx tsc --noEmit`
Expected: no errors related to repositoryStore

- [ ] **Step 3: Commit**

```bash
git add src/store/repositoryStore.ts
git commit -m "feat: add skillCounts state and getSkillCounts action to repository store"
```

---

### Task 4: Create AddRepositoryDialog component

**Files:**

- Create: `src/components/AddRepositoryDialog.tsx`

This dialog handles both "Remote Git" and "Local Directory" types with dynamic form fields. Auto-detects `github` vs `private-git` from the URL.

- [ ] **Step 1: Create the dialog component**

Create `src/components/AddRepositoryDialog.tsx`:

```tsx
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { open } from "@tauri-apps/plugin-dialog";
import { CreateRepositoryRequest } from "@/types/repository";

type RepoType = "remote" | "local";
type AuthType = "none" | "token" | "ssh";

interface AddRepositoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function detectSourceType(url: string): "github" | "private-git" {
  if (url.includes("github.com")) {
    return "github";
  }
  return "private-git";
}

export function AddRepositoryDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddRepositoryDialogProps) {
  const [repoType, setRepoType] = useState<RepoType>("remote");
  const [name, setName] = useState("");
  const [gitUrl, setGitUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [authType, setAuthType] = useState<AuthType>("none");
  const [token, setToken] = useState("");
  const [sshKeyPath, setSshKeyPath] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setRepoType("remote");
    setName("");
    setGitUrl("");
    setBranch("");
    setAuthType("none");
    setToken("");
    setSshKeyPath("");
    setLocalPath("");
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (repoType === "remote" && !gitUrl.trim()) {
      toast.error("Git URL is required");
      return;
    }

    if (repoType === "local" && !localPath.trim()) {
      toast.error("Directory path is required");
      return;
    }

    setSubmitting(true);

    try {
      if (repoType === "remote") {
        const sourceType = detectSourceType(gitUrl);
        const authConfig =
          authType === "token"
            ? JSON.stringify({ token })
            : authType === "ssh"
              ? JSON.stringify({ key_path: sshKeyPath })
              : "{}";

        const request: CreateRepositoryRequest = {
          name: name.trim(),
          url: gitUrl.trim(),
          path: gitUrl.trim(),
          source_type: sourceType,
          local_path: "",
          auth_type: authType === "none" ? undefined : authType,
          auth_config: authConfig !== "{}" ? authConfig : undefined,
          branch: branch.trim() || undefined,
        };

        await invoke("add_repository", {
          name: request.name,
          url: request.url,
          path: request.path,
          sourceType: request.source_type,
          authType: request.auth_type,
          authConfig: request.auth_config,
          branch: request.branch,
        });
      } else {
        const request: CreateRepositoryRequest = {
          name: name.trim(),
          path: localPath.trim(),
          source_type: "local",
          local_path: "",
          copy: true,
        };

        await invoke("add_repository", {
          name: request.name,
          path: request.path,
          sourceType: request.source_type,
          copy: true,
        });
      }

      toast.success(`Repository "${name}" added successfully`);
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(
        `Failed to add repository: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePickDirectory = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        setLocalPath(selected);
      }
    } catch {
      // User cancelled dialog
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Repository</DialogTitle>
          <DialogDescription>
            Add a skill source repository to discover and manage skills.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Type selector */}
          <div className="grid gap-2">
            <Label>Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={repoType === "remote" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRepoType("remote")}
                disabled={submitting}
              >
                Remote Git
              </Button>
              <Button
                type="button"
                variant={repoType === "local" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRepoType("local")}
                disabled={submitting}
              >
                Local Directory
              </Button>
            </div>
          </div>

          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="repo-name">Name</Label>
            <Input
              id="repo-name"
              placeholder="e.g. open-skills"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </div>

          {repoType === "remote" ? (
            <>
              {/* Git URL */}
              <div className="grid gap-2">
                <Label htmlFor="git-url">Git URL</Label>
                <Input
                  id="git-url"
                  placeholder="https://github.com/user/repo or git@github.com:user/repo"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Branch */}
              <div className="grid gap-2">
                <Label htmlFor="repo-branch">
                  Branch{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="repo-branch"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Auth type */}
              <div className="grid gap-2">
                <Label>Authentication</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={authType === "none" ? "secondary" : "ghost"}
                    onClick={() => setAuthType("none")}
                    disabled={submitting}
                  >
                    None (Public)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={authType === "token" ? "secondary" : "ghost"}
                    onClick={() => setAuthType("token")}
                    disabled={submitting}
                  >
                    Token
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={authType === "ssh" ? "secondary" : "ghost"}
                    onClick={() => setAuthType("ssh")}
                    disabled={submitting}
                  >
                    SSH Key
                  </Button>
                </div>
              </div>

              {/* Token input */}
              {authType === "token" && (
                <div className="grid gap-2">
                  <Label htmlFor="repo-token">Token</Label>
                  <Input
                    id="repo-token"
                    type="password"
                    placeholder="ghp_xxxx or personal access token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              )}

              {/* SSH key path input */}
              {authType === "ssh" && (
                <div className="grid gap-2">
                  <Label htmlFor="ssh-key">SSH Key Path</Label>
                  <Input
                    id="ssh-key"
                    placeholder="~/.ssh/id_ed25519"
                    value={sshKeyPath}
                    onChange={(e) => setSshKeyPath(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {/* Local directory path */}
              <div className="grid gap-2">
                <Label htmlFor="local-path">Directory Path</Label>
                <div className="flex gap-2">
                  <Input
                    id="local-path"
                    placeholder="/path/to/skills/directory"
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    disabled={submitting}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePickDirectory}
                    disabled={submitting}
                  >
                    Browse
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Repository"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/zengym/workspace/projects/ai/skill-vault && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/AddRepositoryDialog.tsx
git commit -m "feat: create AddRepositoryDialog component with remote/local support"
```

---

### Task 5: Create Repositories page

**Files:**

- Create: `src/pages/Repositories.tsx`

- [ ] **Step 1: Create the page component**

Create `src/pages/Repositories.tsx`:

```tsx
import { useEffect, useState, useCallback } from "react";
import { useRepositoryStore } from "@/store/repositoryStore";
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
  RefreshCw,
  Plus,
  FolderGit2,
  FolderOpen,
  MoreVertical,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { AddRepositoryDialog } from "@/components/AddRepositoryDialog";
import { Repository } from "@/types/repository";

const Badge = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
  >
    {children}
  </span>
);

function getStatusStyle(status: string) {
  switch (status) {
    case "synced":
      return {
        badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        border: "",
        label: "synced",
      };
    case "syncing":
      return {
        badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        border: "border-amber-500/20",
        label: "syncing",
      };
    case "error":
      return {
        badge: "bg-red-500/10 text-red-500 border-red-500/20",
        border: "border-red-500/20",
        label: "error",
      };
    case "pending":
    default:
      return {
        badge: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        border: "",
        label: "pending",
      };
  }
}

function getRelativeTime(dateStr?: string): string {
  if (!dateStr) return "not synced yet";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface RepoRowProps {
  repo: Repository;
  skillCount: number;
  syncingId: string | null;
  onSync: (id: string) => void;
  onDelete: (repo: Repository) => void;
}

function RepoRow({
  repo,
  skillCount,
  syncingId,
  onSync,
  onDelete,
}: RepoRowProps) {
  const status = getStatusStyle(repo.status);
  const isRemote = repo.source_type !== "local";
  const isSyncing = syncingId === repo.id || repo.status === "syncing";

  const subtitleParts: string[] = [];
  if (isRemote && repo.url) {
    try {
      const url = new URL(
        repo.url.replace("git@", "https://").replace(":", "/"),
      );
      subtitleParts.push(url.host + url.pathname.replace(".git", ""));
    } catch {
      subtitleParts.push(repo.url);
    }
    if (repo.branch) subtitleParts.push(repo.branch);
  } else {
    subtitleParts.push(repo.path);
  }
  subtitleParts.push(`${skillCount} skill${skillCount !== 1 ? "s" : ""}`);
  if (repo.status === "synced" && repo.last_synced_at) {
    subtitleParts.push(getRelativeTime(repo.last_synced_at));
  }

  return (
    <div
      className={`flex items-center justify-between rounded-xl border bg-white/40 backdrop-blur-sm p-4 transition-all hover:bg-white/60 ${status.border}`}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isRemote ? "bg-teal-500/10" : "bg-blue-500/10"
          }`}
        >
          {isRemote ? (
            <FolderGit2 className="h-4.5 w-4.5 text-teal-600" />
          ) : (
            <FolderOpen className="h-4.5 w-4.5 text-blue-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{repo.name}</span>
            <Badge className={status.badge}>{status.label}</Badge>
          </div>
          <p
            className={`text-xs mt-0.5 truncate ${
              repo.status === "error" && repo.error_message
                ? "text-red-500"
                : "text-muted-foreground"
            }`}
          >
            {repo.status === "error" && repo.error_message
              ? repo.error_message
              : subtitleParts.join(" · ")}
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0 ml-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSync(repo.id)}
          disabled={isSyncing}
          className={
            repo.status === "pending"
              ? "border-teal-500/30 text-teal-600 hover:bg-teal-500/10"
              : ""
          }
        >
          {isSyncing ? (
            <>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Syncing...
            </>
          ) : repo.status === "error" ? (
            "Retry"
          ) : (
            "Sync"
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => onDelete(repo)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function Repositories() {
  const {
    repositories,
    skillCounts,
    loading,
    getRepositories,
    getSkillCounts,
    syncRepository,
    syncAllRepositories,
    deleteRepository,
  } = useRepositoryStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Repository | null>(null);

  const loadData = useCallback(async () => {
    await Promise.all([getRepositories(), getSkillCounts()]);
  }, [getRepositories, getSkillCounts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = useCallback(
    async (id: string) => {
      setSyncingId(id);
      try {
        await syncRepository(id);
        await getSkillCounts();
        toast.success("Repository synced successfully");
      } catch (error) {
        toast.error(
          `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        setSyncingId(null);
      }
    },
    [syncRepository, getSkillCounts],
  );

  const handleSyncAll = useCallback(async () => {
    setSyncingAll(true);
    try {
      await syncAllRepositories();
      await getSkillCounts();
      toast.success("All repositories synced");
    } catch (error) {
      toast.error(
        `Sync all failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setSyncingAll(false);
    }
  }, [syncAllRepositories, getSkillCounts]);

  const handleDelete = useCallback(
    async (repo: Repository) => {
      setDeleteTarget(null);
      try {
        await deleteRepository(repo.id);
        toast.success(`Repository "${repo.name}" deleted`);
        await loadData();
      } catch (error) {
        toast.error(
          `Delete failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
    [deleteRepository, loadData],
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Repositories</h1>
          <p className="text-muted-foreground">
            Manage your skill source repositories
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={syncingAll || repositories.length === 0}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${syncingAll ? "animate-spin" : ""}`}
            />
            Sync All
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Repository
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && repositories.length === 0 && (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground/40" />
        </div>
      )}

      {/* Empty state */}
      {!loading && repositories.length === 0 && (
        <div className="flex flex-col justify-center items-center py-20 text-center">
          <div className="w-16 h-16 bg-white/50 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4">
            <FolderGit2 className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-medium mb-2">No repositories yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Add a repository to start discovering skills.
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Repository
          </Button>
        </div>
      )}

      {/* Repository list */}
      {repositories.length > 0 && (
        <div className="flex flex-col gap-3">
          {repositories.map((repo) => (
            <RepoRow
              key={repo.id}
              repo={repo}
              skillCount={skillCounts[repo.id] ?? 0}
              syncingId={syncingId}
              onSync={handleSync}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Add Repository Dialog */}
      <AddRepositoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadData}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Repository</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will
              remove the repository and its skill records. Already dispatched
              files in target directories will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/zengym/workspace/projects/ai/skill-vault && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/Repositories.tsx
git commit -m "feat: create Repositories page with list layout, sync, and delete"
```

---

### Task 6: Update App.tsx — routing, navigation, keyboard shortcuts

**Files:**

- Modify: `src/App.tsx`

- [ ] **Step 1: Add import for Repositories page and Database icon**

At the top of `src/App.tsx`, add `Repositories` import and `Database` icon:

After line 14 (`import { SettingsPage } from "./pages/Settings";`), add:

```typescript
import { Repositories } from "./pages/Repositories";
```

In the lucide-react import (line 16-23), add `Database` to the list:

```typescript
import {
  Loader2,
  BookOpen,
  Send,
  Settings as SettingsIcon,
  AlertTriangle,
  Vault,
  Database,
} from "lucide-react";
```

- [ ] **Step 2: Add Repositories nav item**

In the `navItems` array (line 95-107), insert Repositories after Skills:

```typescript
const navItems = [
  { path: "/", label: "Skills", icon: <BookOpen className="h-4 w-4" /> },
  { path: "/repositories", label: "Repositories", icon: <Database className="h-4 w-4" /> },
  {
    path: "/dispatches",
    label: "Dispatches",
    icon: <Send className="h-4 w-4" />,
  },
  {
    path: "/settings",
    label: "Settings",
    icon: <SettingsIcon className="h-4 w-4" /> ,
  },
];
```

- [ ] **Step 3: Add Route for Repositories**

In the Routes block (lines 207-211), add after the Skills route:

```typescript
<Route path="/" element={<Skills />} />
<Route path="/repositories" element={<Repositories />} />
<Route path="/dispatches" element={<DispatchPage />} />
<Route path="/settings" element={<SettingsPage />} />
```

- [ ] **Step 4: Update keyboard shortcuts**

In the `handleKeyDown` callback (lines 152-168), update the shortcuts to account for Repositories at position 2:

```typescript
if (e.key === "1") {
  e.preventDefault();
  navigate("/");
} else if (e.key === "2") {
  e.preventDefault();
  navigate("/repositories");
} else if (e.key === "3") {
  e.preventDefault();
  navigate("/dispatches");
} else if (e.key === "4") {
  e.preventDefault();
  navigate("/settings");
} else if (e.key === "k" || e.key === "K") {
  e.preventDefault();
  window.dispatchEvent(new CustomEvent("skill-vault:open-search"));
}
```

- [ ] **Step 5: Verify no TypeScript errors**

Run: `cd /Users/zengym/workspace/projects/ai/skill-vault && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add Repositories route, navigation, and keyboard shortcut"
```

---

### Task 7: Remove Add Skill button from Skills page

**Files:**

- Modify: `src/pages/Skills.tsx`

- [ ] **Step 1: Remove the Add Skill button**

In `src/pages/Skills.tsx`, remove lines 393-396:

```tsx
<Button variant="outline">
  <Plus className="mr-2 h-4 w-4" />
  Add Skill
</Button>
```

Also remove `Plus` from the lucide-react import on line 17 if it's no longer used anywhere else in the file. (Check first — if `Plus` is only used for the Add Skill button, remove it from the import.)

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/zengym/workspace/projects/ai/skill-vault && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/Skills.tsx
git commit -m "refactor: remove Add Skill button from Skills page"
```

---

### Task 8: Integration verification

- [ ] **Step 1: Run frontend type check**

Run: `cd /Users/zengym/workspace/projects/ai/skill-vault && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 2: Run Rust backend check**

Run: `cd /Users/zengym/workspace/projects/ai/skill-vault/src-tauri && cargo check`
Expected: compiles without errors

- [ ] **Step 3: Run frontend tests**

Run: `cd /Users/zengym/workspace/projects/ai/skill-vault && npm run test:run`
Expected: all existing tests pass

- [ ] **Step 4: Run Rust tests**

Run: `cd /Users/zengym/workspace/projects/ai/skill-vault/src-tauri && cargo test`
Expected: all existing tests pass

- [ ] **Step 5: Manual smoke test**

Start the app with `npm run tauri dev` and verify:

1. Navigation shows 4 items: Skills, Repositories, Dispatches, Settings
2. Repositories page shows empty state with "Add Repository" button
3. Click "Add Repository" → dialog opens with type selector
4. Keyboard shortcuts work: Cmd+1 (Skills), Cmd+2 (Repositories), Cmd+3 (Dispatches), Cmd+4 (Settings)
5. Skills page no longer shows "Add Skill" button
