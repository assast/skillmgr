import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { LLMProvider, LLMModel } from "../types/llm";
import { GitConfig } from "../types/git";

export interface ThemeConfig {
  theme: "light" | "dark";
}

interface SettingsState {
  providers: LLMProvider[];
  availableModels: LLMModel[];
  gitConfig: GitConfig | null;
  themeConfig: ThemeConfig | null;
  isLoading: boolean;
  error: string | null;
  loadLLMProviders: () => Promise<void>;
  saveLLMProviders: (providers: LLMProvider[]) => Promise<void>;
  fetchModels: (baseUrl: string, apiKey: string) => Promise<LLMModel[]>;
  loadGitConfig: () => Promise<void>;
  saveGitConfig: (path: string) => Promise<void>;
  loadThemeConfig: () => Promise<void>;
  saveThemeConfig: (config: ThemeConfig) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  providers: [],
  availableModels: [],
  gitConfig: null,
  themeConfig: null,
  isLoading: false,
  error: null,

  loadLLMProviders: async () => {
    set({ isLoading: true, error: null });
    try {
      const providers = await invoke<LLMProvider[]>("list_llm_providers");
      set({ providers: providers || [], isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  saveLLMProviders: async (providers: LLMProvider[]) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("save_llm_providers", { providers });
      set({ providers, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  fetchModels: async (baseUrl: string, apiKey: string) => {
    set({ isLoading: true, error: null });
    try {
      const models = await invoke<LLMModel[]>("fetch_llm_models", {
        baseUrl,
        apiKey,
      });
      set({ availableModels: models || [], isLoading: false });
      return models || [];
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  loadGitConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const [detectedPath, executablePath] = await Promise.all([
        invoke<string | null>("detect_git_path"),
        invoke<string | null>("get_git_executable_path"),
      ]);
      set({
        gitConfig: { detectedPath, executablePath },
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  saveGitConfig: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("set_git_executable_path", { path });
      const gitConfig = get().gitConfig;
      set({
        gitConfig: {
          detectedPath: gitConfig?.detectedPath ?? null,
          executablePath: path,
        },
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  loadThemeConfig: async () => {
    set({ isLoading: true, error: null });
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
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  saveThemeConfig: async (config: ThemeConfig) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("set_config", {
        key: "app.theme",
        value: config.theme,
      });

      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(config.theme);

      set({ themeConfig: config, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
}));
