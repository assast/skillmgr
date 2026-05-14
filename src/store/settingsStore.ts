import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { LLMConfig } from "../types/llm";
import { GitConfig } from "../types/git";

interface SettingsState {
  llmConfig: LLMConfig | null;
  gitConfig: GitConfig | null;
  isLoading: boolean;
  error: string | null;
  loadLLMConfig: () => Promise<void>;
  saveLLMConfig: (config: LLMConfig) => Promise<void>;
  loadGitConfig: () => Promise<void>;
  saveGitConfig: (config: GitConfig) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  llmConfig: null,
  gitConfig: null,
  isLoading: false,
  error: null,

  loadLLMConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const apiKey = await invoke<string>("get_config", {
        key: "llm.openai.api_key",
      }).catch(() => null);
      const baseUrl = await invoke<string>("get_config", {
        key: "llm.openai.base_url",
      }).catch(() => null);
      const model = await invoke<string>("get_config", {
        key: "llm.openai.model",
      }).catch(() => "gpt-4o");

      if (apiKey) {
        set({
          llmConfig: {
            apiKey,
            baseUrl: baseUrl || undefined,
            model: model || "gpt-4o",
          },
        });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  saveLLMConfig: async (config: LLMConfig) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("set_config", {
        key: "llm.openai.api_key",
        value: config.apiKey,
      });
      if (config.baseUrl) {
        await invoke("set_config", {
          key: "llm.openai.base_url",
          value: config.baseUrl,
        });
      } else {
        await invoke("delete_config", { key: "llm.openai.base_url" });
      }
      await invoke("set_config", {
        key: "llm.openai.model",
        value: config.model,
      });

      set({ llmConfig: config });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  loadGitConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await invoke<{
        username: string | null;
        email: string | null;
        sshKeyPath: string | null;
      }>("get_git_config");

      set({
        gitConfig: {
          username: config.username || "",
          email: config.email || "",
          sshKeyPath: config.sshKeyPath || undefined,
        },
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  saveGitConfig: async (config: GitConfig) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("save_git_config", {
        username: config.username,
        email: config.email,
        sshKeyPath: config.sshKeyPath,
      });

      set({ gitConfig: config });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
