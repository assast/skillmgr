# Skill Vaults

A cross-platform desktop application for managing and dispatching AI skill libraries. Discover skills from GitHub, private Git, and local directories — then deploy them to any project with one click.

## Features

- **Multi-source Management** — Add skills from GitHub, private Git, or local directories
- **Auto Discovery** — Scan repositories and automatically identify skill files (SKILL.md, skill.json, etc.)
- **AI Analysis** — Connect OpenAI-compatible APIs to auto-generate skill descriptions, tags, and quality scores
- **Multi Provider LLM** — Save and switch between multiple LLM provider configurations (API key, base URL, model)
- **Smart Dispatch** — Deploy skills to project directories via Symlink, Copy, or Hardlink
- **Dispatch Templates** — Save groups of skills as templates for one-click bulk deployment
- **Sync Tracking** — Monitor dispatch status (Synced / Outdated / Conflict / Error) with one-click re-sync
- **Search & Filter** — Full-text search with filtering by name, tags, type, and source
- **Local First** — All data stored in local SQLite, no cloud account required
- **Cross Platform** — Built with Tauri 2.x, runs on Windows, macOS, and Linux
- **Auto Update** — Built-in application updater via Tauri plugin

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (latest stable)
- OS: Windows 10+, macOS 10.15+, or Linux

### Development

```bash
# Clone the repository
git clone https://github.com/assast/skillmgr.git
cd skillmgr

# Install frontend dependencies
npm install

# Start development server (Vite + Rust backend)
npm run tauri dev
```

### Build

```bash
# Build production app
npm run tauri build
```

### First Run

1. Launch the app — you'll be guided through onboarding
2. Set your skill repository base path (where skills will be stored locally)
3. Add a Git repository URL (e.g., a GitHub repo containing skills)
4. Skills are automatically scanned and indexed
5. Go to **Dispatches** → add a target project directory → dispatch skills

## Usage

### Skills Page

Browse all discovered skills with search and filtering. View AI-generated summaries, tags, and quality scores. Select skills for bulk dispatch.

### Repositories Page

Manage skill source repositories. Add remote Git or local directory sources, sync to pull latest changes, and view sync status.

### Dispatches Page

Manage target project directories and deployed skills. Sync individual or all skills. Track status and resolve conflicts.

### Templates

Create dispatch templates — named groups of skills for quick deployment to new projects.

## Tech Stack

| Layer        | Technologies                                                 |
| ------------ | ------------------------------------------------------------ |
| **Frontend** | React 19, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Vite |
| **Backend**  | Rust, Tauri 2.x, sqlx + SQLite, git2-rs, reqwest             |
| **Build**    | Vite, Cargo, Tauri CLI                                       |

## Architecture

```
Frontend (React)                Backend (Rust)
┌──────────────────┐           ┌──────────────────┐
│  React Pages     │  invoke() │  Tauri Commands   │
│  Zustand Stores  │ ────────► │  Git Operations   │
│  shadcn/ui       │           │  LLM Client       │
│  Tailwind CSS    │           │  SQLite Database   │
└──────────────────┘           └──────────────────┘
```

## Project Structure

```
├── src/                    # React frontend
│   ├── pages/              # Page components (Skills, Repositories, Dispatches, Settings)
│   ├── components/         # Reusable UI components (including ui/ for shadcn)
│   ├── store/              # Zustand state stores
│   ├── types/              # TypeScript type definitions
│   ├── lib/                # Utility functions
│   └── test/               # Test setup and utilities
├── src-tauri/              # Rust backend
│   └── src/
│       ├── main.rs         # Tauri command handlers & entry point
│       ├── db/             # Database schema and CRUD
│       ├── git/            # Git clone, pull, auth
│       ├── skills/         # Skill discovery, CRUD, analysis
│       ├── dispatch/       # Dispatch methods, sync, bulk dispatch
│       ├── llm/            # OpenAI-compatible client (multi-provider)
│       ├── config/         # Base path configuration
│       └── error.rs        # Error types and sanitization
├── CLAUDE.md               # AI assistant development guide
└── LICENSE                 # MIT License
```

## Testing

```bash
# Frontend tests (vitest)
npm run test:run

# Rust tests
cd src-tauri && cargo test
```

---

## 中文使用说明

### 简介

Skill Vaults 是一款跨平台桌面应用，用于管理和分发 AI 技能库（Skill Libraries）。支持从 GitHub、私有 Git 仓库和本地文件夹导入技能，并一键部署到任意项目目录。

### 核心功能

- **多源管理** — 支持从 GitHub、私有 Git 或本地目录添加技能仓库
- **自动发现** — 扫描仓库并自动识别技能文件（SKILL.md、skill.json 等）
- **AI 分析** — 接入 OpenAI 兼容 API，自动生成技能描述、标签和质量评分
- **多 LLM 提供商** — 保存并切换多个 LLM 配置（API Key、Base URL、模型）
- **智能分发** — 通过 Symlink、Copy 或 Hardlink 将技能部署到项目目录
- **分发模板** — 将一组技能保存为模板，一键批量部署
- **同步追踪** — 监控分发状态（已同步 / 已过期 / 冲突 / 错误），一键重新同步
- **搜索与过滤** — 支持按名称、标签、类型和来源进行全文搜索和过滤
- **本地优先** — 所有数据存储在本地 SQLite，无需云账户
- **跨平台** — 基于 Tauri 2.x 构建，支持 Windows、macOS 和 Linux

### 安装

从 [Releases](https://github.com/assast/skillmgr/releases) 页面下载对应平台的安装包：

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows | `.msi` | 双击安装 |
| macOS (Apple Silicon) | `aarch64.dmg` | M1/M2/M3 芯片 |
| macOS (Intel) | `x86_64.dmg` | 旧款 Intel Mac |

> **macOS 用户注意**：首次打开未签名的应用时，需要在"系统设置 → 隐私与安全性"中点击"仍要打开"。

### 首次使用

1. **启动应用** — 首次启动会进入引导界面
2. **设置基础目录** — 选择技能库的本地存储位置
3. **添加仓库** — 添加 Git 仓库 URL 或本地文件夹路径
4. **自动扫描** — 应用会自动扫描并索引仓库中的技能
5. **分发技能** — 进入「Dispatches」页面 → 添加目标项目目录 → 选择技能进行分发

### 页面说明

#### Skills（技能库）

浏览所有已发现的技能，支持搜索和过滤。可查看 AI 生成的摘要、标签和质量评分。支持勾选多个技能进行批量分发。

#### Repositories（仓库管理）

管理技能来源仓库。支持添加远程 Git 或本地目录，同步拉取最新变更，查看同步状态。

#### Dispatches（分发管理）

管理目标项目目录和已部署的技能。支持单个或批量同步，追踪状态并解决冲突。

#### Templates（分发模板）

创建分发模板 — 将常用技能组合保存为命名模板，快速部署到新项目。

#### Settings（设置）

- **基础目录** — 修改技能库存储路径
- **LLM 提供商** — 配置 AI 分析所需的 API（支持多个提供商切换）
- **Git 配置** — 自定义 Git 可执行文件路径

### 开发

```bash
# 环境要求
# - Node.js 18+
# - Rust (最新 stable)

# 克隆仓库
git clone https://github.com/assast/skillmgr.git
cd skillmgr

# 安装前端依赖
npm install

# 启动开发服务器
npm run tauri dev

# 构建生产版本
npm run tauri build
```

### 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19、TypeScript、Tailwind CSS、shadcn/ui、Zustand、Vite |
| **后端** | Rust、Tauri 2.x、sqlx + SQLite、git2-rs、reqwest |
| **构建** | Vite、Cargo、Tauri CLI |

## License

[MIT](LICENSE)
