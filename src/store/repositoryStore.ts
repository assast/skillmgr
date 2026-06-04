import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Repository, CreateRepositoryRequest } from "../types/repository";

interface RepositoryStore {
  repositories: Repository[];
  loading: boolean;
  error: string | null;
  skillCounts: Record<string, number>;
  fetchRepositories: () => Promise<void>;
  fetchRepository: (id: string) => Promise<Repository | null>;
  addRepository: (data: CreateRepositoryRequest) => Promise<Repository>;
  updateRepository: (id: string, data: {
    name: string;
    skillsPath: string;
    url?: string;
    branch?: string;
    authType?: string;
    authConfig?: string;
  }) => Promise<void>;
  deleteRepository: (id: string) => Promise<void>;
  syncRepository: (id: string) => Promise<Repository>;
  syncAllRepositories: () => Promise<Repository[]>;
  getSkillCounts: () => Promise<void>;
  clearError: () => void;
}

export const useRepositoryStore = create<RepositoryStore>((set, get) => ({
  repositories: [],
  loading: false,
  error: null,
  skillCounts: {},

  fetchRepositories: async () => {
    set({ loading: true, error: null });
    try {
      const repositories = await invoke<Repository[]>("list_repositories");
      set({ repositories, loading: false });
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      toast.error(message);
      throw error;
    }
  },

  fetchRepository: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const repository = await invoke<Repository | null>("get_repository", {
        id,
      });
      set({ loading: false });
      return repository;
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      toast.error(message);
      throw error;
    }
  },

  addRepository: async (data: CreateRepositoryRequest) => {
    set({ loading: true, error: null });
    try {
      const repository = await invoke<Repository>("add_repository", {
        ...data,
      });
      set((state) => ({
        repositories: [...state.repositories, repository],
        loading: false,
      }));
      return repository;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateRepository: async (id: string, data: {
    name: string;
    skillsPath: string;
    url?: string;
    branch?: string;
    authType?: string;
    authConfig?: string;
  }) => {
    set({ loading: true, error: null });
    try {
      await invoke("update_repository", {
        id,
        name: data.name,
        skillsPath: data.skillsPath,
        url: data.url,
        branch: data.branch,
        authType: data.authType,
        authConfig: data.authConfig,
      });
      await get().fetchRepositories();
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteRepository: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await invoke("delete_repository", { id });
      set((state) => ({
        repositories: state.repositories.filter((repo) => repo.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  syncRepository: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const updatedRepo = await invoke<Repository>("sync_repository", { id });
      set((state) => ({
        repositories: state.repositories.map((repo) =>
          repo.id === id ? updatedRepo : repo,
        ),
        loading: false,
      }));
      return updatedRepo;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  syncAllRepositories: async () => {
    set({ loading: true, error: null });
    try {
      const updatedRepos = await invoke<Repository[]>("sync_all_repositories");
      set({ repositories: updatedRepos, loading: false });
      return updatedRepos;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  getSkillCounts: async () => {
    try {
      const counts = await invoke<Record<string, number>>(
        "get_repository_skill_counts",
      );
      set({ skillCounts: counts });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  clearError: () => set({ error: null }),
}));
