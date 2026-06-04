# Repositories Page Implementation Plan

> **Status: All tasks completed** <!-- last verified: 2026-06-04 -->

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

- [x] **Step 1: Fix the condition in sync_repository** → `src-tauri/src/main.rs` now uses `repo.source_type != "local"` (verified in `sync_repository` and `sync_all_repositories`)

- [x] **Step 2: Fix the same condition in sync_all_repositories** → same fix applied

- [x] **Step 3: Verify compilation** → `cargo check` passes

- [x] **Step 4: Commit** → `3568a79 fix: correct source_type check in sync_repository and sync_all_repositories`

---

### Task 2: Add get_repository_skill_counts backend command

**Files:**

- Modify: `src-tauri/src/main.rs`

- [x] **Step 1: Add the new command function** → `get_repository_skill_counts` at `src-tauri/src/main.rs:572`

- [x] **Step 2: Register the command in the Tauri builder** → registered in `invoke_handler!` at line 731

- [x] **Step 3: Verify compilation** → `cargo check` passes

- [x] **Step 4: Commit** → included in sync bug fix commit

---

### Task 3: Update repository store with skill counts

**Files:**

- Modify: `src/store/repositoryStore.ts`

- [x] **Step 1: Add skillCounts state and loading action** → `skillCounts` state and `getSkillCounts` action exist in `repositoryStore.ts`

- [x] **Step 2: Verify no TypeScript errors** → `npx tsc --noEmit` passes

- [x] **Step 3: Commit** → included in feature commit

---

### Task 4: Create AddRepositoryDialog component

**Files:**

- Create: `src/components/AddRepositoryDialog.tsx`

- [x] **Step 1: Create the dialog component** → `src/components/AddRepositoryDialog.tsx` exists with full remote/local support

- [x] **Step 2: Verify no TypeScript errors** → passes

- [x] **Step 3: Commit** → feature commit

---

### Task 5: Create Repositories page

**Files:**

- Create: `src/pages/Repositories.tsx`

- [x] **Step 1: Create the page component** → `src/pages/Repositories.tsx` exists with repo list, sync, delete, edit

- [x] **Step 2: Verify no TypeScript errors** → passes

- [x] **Step 3: Commit** → feature commit

---

### Task 6: Update App.tsx — routing, navigation, keyboard shortcuts

**Files:**

- Modify: `src/App.tsx`

- [x] **Step 1: Add import for Repositories page and Database icon** → `Repositories` imported at `src/App.tsx:24`, `Database` icon imported at line 28

- [x] **Step 2: Add Repositories nav item** → nav item at `src/App.tsx:158-162`

- [x] **Step 3: Add Route for Repositories** → route in `Routes` block

- [x] **Step 4: Update keyboard shortcuts** → Cmd+2 for Repositories at `src/App.tsx:157`

- [x] **Step 5: Verify no TypeScript errors** → passes

- [x] **Step 6: Commit** → feature commit

---

### Task 7: Remove Add Skill button from Skills page

**Files:**

- Modify: `src/pages/Skills.tsx`

- [x] **Step 1: Remove the Add Skill button** → button removed

- [x] **Step 2: Verify no TypeScript errors** → passes

- [x] **Step 3: Commit** → refactor commit

---

### Task 8: Integration verification

- [x] **Step 1: Run frontend type check** → passes

- [x] **Step 2: Run Rust backend check** → passes

- [x] **Step 3: Run frontend tests** → all tests pass

- [x] **Step 4: Run Rust tests** → all tests pass

- [x] **Step 5: Manual smoke test** → verified in release builds
