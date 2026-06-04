# Repository Retry & Edit Enhancement Implementation Plan

> **Status: All tasks completed** <!-- last verified: 2026-06-04 -->

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken sync-when-clone-failed flow, enhance the edit dialog to support URL/branch/auth editing, and add HTTP auth to the add dialog.

**Architecture:** Three independent changes: (1) Rust sync command detects missing directory and re-clones, (2) Rust update command extended + frontend edit dialog gains full field support, (3) Frontend add dialog gains HTTP auth option. All changes are backward-compatible — no schema migration needed.

**Tech Stack:** Rust (git2, sqlx, tauri), TypeScript/React (Zustand, shadcn/ui)

---

### Task 1: Sync Auto-Retry — Detect Missing Directory and Re-Clone

- [x] **Step 1: Modify `sync_repository` in `main.rs` to handle missing directory** → `src-tauri/src/main.rs` checks `!local_path.exists()` and re-clones (verified at lines 452-463)

- [x] **Step 2: Apply same fix to `sync_all_repositories`** → same pattern applied (verified at lines 532-543)

- [x] **Step 3: Run Rust tests** → all tests pass

- [x] **Step 4: Commit** → `6f94810 fix: auto re-clone when repo directory missing during sync`

---

### Task 2: Extend `update_repository` Rust Command

- [x] **Step 1: Replace the `update_repository` command** → accepts `url`, `branch`, `auth_type`, `auth_config` (verified at `src-tauri/src/main.rs:363-407`)

- [x] **Step 2: Run Rust check** → passes

- [x] **Step 3: Commit** → `ae5c645 feat: extend update_repository to support url, branch, and auth changes`

---

### Task 3: Enhance Edit Dialog with Full Field Support

- [x] **Step 1: Replace the `EditRepoForm` component** → full URL/branch/auth editing with dynamic fields based on repo type (verified in `src/pages/Repositories.tsx`)

- [x] **Step 2: Widen the edit dialog** → `sm:max-w-lg` applied

- [x] **Step 3: Add `useEffect` import** → already imported

- [x] **Step 4: Run frontend build and tests** → passes

- [x] **Step 5: Commit** → `88e2961 feat: enhance edit dialog with URL, branch, and auth editing`

---

### Task 4: Add HTTP Auth Option to Add Repository Dialog

- [x] **Step 1: Extend `AuthType` and add HTTP auth fields** → `AuthType = "none" | "token" | "ssh" | "http"` (verified in `src/components/AddRepositoryDialog.tsx`)

- [x] **Step 2: Add HTTP auth button to the auth type selector** → "User/Pass" button present

- [x] **Step 3: Add HTTP auth input fields** → username/password fields for HTTP auth

- [x] **Step 4: Handle HTTP auth config in submit handler** → `JSON.stringify({ username, password })` for http type

- [x] **Step 5: Run frontend build and tests** → passes

- [x] **Step 6: Commit** → `7af9c5f feat: add HTTP username/password auth option to add repo dialog`

---

### Task 5: End-to-End Verification

- [x] **Step 1: Run full test suite** → all tests pass

- [x] **Step 2: Run TypeScript strict check** → zero errors

- [x] **Step 3: Run Cargo check** → zero warnings

- [x] **Step 4: Manual smoke test** → verified in release builds
