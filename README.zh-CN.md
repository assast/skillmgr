# Skill Vaults

[English](README.md) | **中文**

跨平台桌面应用，用于管理和分发 AI 技能库。支持从 GitHub、私有 Git 仓库和本地文件夹导入技能，并一键部署到任意项目目录。

## 核心功能

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

## 安装

从 [Releases](https://github.com/assast/skillmgr/releases) 页面下载对应平台的安装包：

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows | `.msi` | 双击安装 |
| macOS (Apple Silicon) | `aarch64.dmg` | M1/M2/M3 芯片 |
| macOS (Intel) | `x86_64.dmg` | 旧款 Intel Mac |

> **macOS 用户注意**：首次打开未签名的应用时，需要在「系统设置 → 隐私与安全性」中点击「仍要打开」。

## 首次使用

1. **启动应用** — 首次启动会进入引导界面
2. **设置基础目录** — 选择技能库的本地存储位置
3. **添加仓库** — 添加 Git 仓库 URL 或本地文件夹路径
4. **自动扫描** — 应用会自动扫描并索引仓库中的技能
5. **分发技能** — 进入「Dispatches」页面 → 添加目标项目目录 → 选择技能进行分发

## 页面说明

### Skills（技能库）

浏览所有已发现的技能，支持搜索和过滤。可查看 AI 生成的摘要、标签和质量评分。支持勾选多个技能进行批量分发。

### Repositories（仓库管理）

管理技能来源仓库。支持添加远程 Git 或本地目录，同步拉取最新变更，查看同步状态。

### Dispatches（分发管理）

管理目标项目目录和已部署的技能。支持单个或批量同步，追踪状态并解决冲突。

### Templates（分发模板）

创建分发模板 — 将常用技能组合保存为命名模板，快速部署到新项目。

### Settings（设置）

- **基础目录** — 修改技能库存储路径
- **LLM 提供商** — 配置 AI 分析所需的 API（支持多个提供商切换）
- **Git 配置** — 自定义 Git 可执行文件路径

## 开发

### 环境要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)（最新 stable）
- OS: Windows 10+, macOS 10.15+, 或 Linux

### 启动

```bash
# 克隆仓库
git clone https://github.com/assast/skillmgr.git
cd skillmgr

# 安装前端依赖
npm install

# 启动开发服务器
npm run tauri dev
```

### 构建

```bash
# 构建生产版本
npm run tauri build
```

### 测试

```bash
# 前端测试 (vitest)
npm run test:run

# Rust 测试
cd src-tauri && cargo test
```

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19、TypeScript、Tailwind CSS、shadcn/ui、Zustand、Vite |
| **后端** | Rust、Tauri 2.x、sqlx + SQLite、git2-rs、reqwest |
| **构建** | Vite、Cargo、Tauri CLI |

## 架构

```
前端 (React)                    后端 (Rust)
┌──────────────────┐           ┌──────────────────┐
│  React 页面      │  invoke() │  Tauri 命令       │
│  Zustand 状态    │ ────────► │  Git 操作         │
│  shadcn/ui       │           │  LLM 客户端       │
│  Tailwind CSS    │           │  SQLite 数据库    │
└──────────────────┘           └──────────────────┘
```

## 项目结构

```
├── src/                    # React 前端
│   ├── pages/              # 页面组件（Skills, Repositories, Dispatches, Settings）
│   ├── components/         # 可复用 UI 组件（含 ui/ 目录为 shadcn 组件）
│   ├── store/              # Zustand 状态管理
│   ├── types/              # TypeScript 类型定义
│   ├── lib/                # 工具函数
│   └── test/               # 测试配置与工具
├── src-tauri/              # Rust 后端
│   └── src/
│       ├── main.rs         # Tauri 命令处理 & 入口
│       ├── db/             # 数据库 schema 和 CRUD
│       ├── git/            # Git clone、pull、认证
│       ├── skills/         # 技能发现、CRUD、分析
│       ├── dispatch/       # 分发方法、同步、批量分发
│       ├── llm/            # OpenAI 兼容客户端（多提供商）
│       ├── config/         # 基础路径配置
│       └── error.rs        # 错误类型与脱敏
└── LICENSE                 # MIT 许可证
```

## 许可证

[MIT](LICENSE)
