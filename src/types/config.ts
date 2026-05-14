export interface ConfigState {
  basePath: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ConfigActions {
  getBasePath: () => Promise<void>;
  setBasePath: (path: string) => Promise<void>;
  initBaseDirectory: (path: string) => Promise<void>;
  clearError: () => void;
}

export type ConfigStore = ConfigState & ConfigActions;
