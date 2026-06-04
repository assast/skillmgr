import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { LLMProvider, LLMModel } from "../types/llm";
import { GitConfig } from "../types/git";

export interface ThemeConfig {
  theme: "light" | "dark";
}

interface SettingsStore {
  providers: LLMProvider[];
  availableModels: LLMModel[];
  gitConfig: GitConfig | null;
  themeConfig: ThemeConfig | null;
  loading: boolean;
  error: string | null;
  loadLLMProviders: () => Promise<void>;
  saveLLMProviders: (providers: LLMProvider[]) => Promise<void>;
  fetchModels: (baseUrl: string, apiKey: string) => Promise<LLMModel[]>;
  loadGitConfig: () => Promise<void>;
  saveGitConfig: (path: string) => Promise<void>;
  loadThemeConfig: () => Promise<void>;
  saveThemeConfig: (config: ThemeConfig) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  providers: [],
  availableModels: [],
  gitConfig: null,
  themeConfig: null,
  loading: false,
  error: null,

  loadLLMProviders: async () => {
    set({ loading: true, error: null });
    try {
      const providers = await invoke<LLMProvider[]>("list_llm_providers");
      set({ providers: providers || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  saveLLMProviders: async (providers: LLMProvider[]) => {
    set({ loading: true, error: null });
    try {
      await invoke("save_llm_providers", { providers });
      set({ providers, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  fetchModels: async (baseUrl: string, apiKey: string) => {
    set({ loading: true, error: null });
    try {
      const models = await invoke<LLMModel[]>("fetch_llm_models", {
        baseUrl,
        apiKey,
      });
      set({ availableModels: models || [], loading: false });
      return models || [];
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  loadGitConfig: async () => {
    set({ loading: true, error: null });
    try {
      const [detectedPath, executablePath] = await Promise.all([
        invoke<string | null>("detect_git_path"),
        invoke<string | null>("get_git_executable_path"),
      ]);
      set({
        gitConfig: { detectedPath, executablePath },
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  saveGitConfig: async (path: string) => {
    set({ loading: true, error: null });
    try {
      await invoke("set_git_executable_path", { path });
      const gitConfig = get().gitConfig;
      set({
        gitConfig: {
          detectedPath: gitConfig?.detectedPath ?? null,
          executablePath: path,
        },
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  loadThemeConfig: async () => {
    set({ loading: true, error: null });
    try {
      const theme = await invoke<string>("get_config", {
        key: "app.theme",
      }).catch(() => "light");

      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(theme || "light");

      set({
        themeConfig: {
          theme: (theme || "light") as "light" | "dark",
        },
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  saveThemeConfig: async (config: ThemeConfig) => {
    set({ loading: true, error: null });
    try {
      await invoke("set_config", {
        key: "app.theme",
        value: config.theme,
      });

      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(config.theme);

      set({ themeConfig: config, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
}));
