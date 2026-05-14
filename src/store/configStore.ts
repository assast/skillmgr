import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { ConfigStore } from "../types/config";

export const useConfigStore = create<ConfigStore>((set) => ({
  basePath: null,
  isLoading: false,
  error: null,

  getBasePath: async () => {
    set({ isLoading: true, error: null });
    try {
      const basePath = await invoke<string | null>("get_base_path_command");
      set({ basePath, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to get base path",
        isLoading: false,
      });
    }
  },

  setBasePath: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("set_base_path_command", { path });
      set({ basePath: path, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to set base path",
        isLoading: false,
      });
      throw error;
    }
  },

  initBaseDirectory: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("init_base_directory_command", { path });
      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize directory",
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
