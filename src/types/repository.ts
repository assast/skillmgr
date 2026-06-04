export interface Repository {
  id: string;
  name: string;
  url?: string;
  path: string;
  sourceType: string;
  localPath: string;
  authType?: string;
  authConfig?: string;
  branch?: string;
  skillsPath: string;
  lastSyncedAt?: string;
  lastCheckedAt?: string;
  status: "pending" | "syncing" | "synced" | "error";
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRepositoryRequest {
  name: string;
  url?: string;
  path: string;
  sourceType: string;
  localPath: string;
  authType?: string;
  authConfig?: string;
  branch?: string;
  skillsPath?: string;
}
