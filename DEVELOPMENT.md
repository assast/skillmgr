# Development Guide

This guide covers how to set up the development environment, run the app locally, and build for production.

## Prerequisites

- **Node.js**: 18.0.0 or higher
- **Rust**: 1.70.0 or higher (required for Tauri)
- **System dependencies**: For your specific OS, see [Tauri prerequisites](https://tauri.app/v2/guides/getting-started/prerequisites/)

## Local Development

```bash
# Clone
git clone https://github.com/zengym-sally/skill-vaults.git
cd skill-vaults

# Install dependencies
npm install

# Start development (Vite + Rust backend)
npm run tauri dev

# Frontend-only (browser at http://localhost:1420, no native features)
npm run dev
```

## Building for Production

```bash
# Full app (frontend + Tauri)
npm run tauri build

# Frontend only
npm run build
```

Output: `src-tauri/target/release/`

## Project Structure

```
skill-vault/
├── src/                          # Frontend source code
│   ├── pages/                    # Page components (Skills, Repositories, Dispatches, Settings)
│   ├── components/               # Reusable UI components
│   │   └── ui/                   # shadcn/ui components
│   ├── store/                    # Zustand state stores
│   ├── types/                    # TypeScript type definitions
│   ├── lib/                      # Utility functions
│   ├── App.tsx                   # Root application component
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Global styles
├── src-tauri/                    # Tauri/Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri command handlers & entry point
│   │   ├── db/                   # Database schema and CRUD
│   │   ├── git/                  # Git clone, pull, auth
│   │   ├── skills/               # Skill discovery, CRUD, analysis
│   │   ├── dispatch/             # Dispatch methods, sync, bulk dispatch
│   │   ├── llm/                  # OpenAI-compatible client (multi-provider)
│   │   ├── config/               # Base path configuration
│   │   └── error.rs              # Error types and sanitization
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── public/                        # Public static files
├── dist/                          # Build output (generated)
├── index.html                     # HTML entry point
├── package.json                   # Node dependencies
├── tsconfig.json                  # TypeScript configuration
├── vite.config.ts                # Vite configuration
├── tailwind.config.js            # Tailwind CSS configuration
└── postcss.config.js             # PostCSS configuration
```

## Development Workflow

### Frontend

- React 19 with TypeScript
- Tailwind CSS for styling
- shadcn/ui components (Radix UI based)
- Zustand for state management
- React Router v7 (HashRouter)

### Backend (Rust)

- All file system operations happen in Rust backend
- SQLite via sqlx for storing skill metadata
- Tauri commands exposed to the frontend via `invoke()`
- `git2-rs` for Git operations, with `which` fallback to system git CLI
- `reqwest` for HTTP client (LLM API calls)
- `tracing` + `tracing-subscriber` for structured logging
- Background operations concurrency-limited via semaphore (max 4 concurrent)

### Database

SQLite database at `$APPDATA/.skillvault/vault.db`

## Testing

```bash
# Frontend tests (vitest)
npm run test:run

# Rust tests
cd src-tauri && cargo test
```

## Code Style

- Frontend: TypeScript conventions, ESLint for linting
- Backend: `cargo fmt`

```bash
cd src-tauri && cargo fmt
```

## Troubleshooting

### Rust compilation errors

```bash
rustup update
```

### Node module errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### Tauri build fails on macOS

```bash
xcode-select --install
```
