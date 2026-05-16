import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { DispatchMethod, SyncStatus, type Dispatch } from "@/types/dispatch";
import { Skill } from "@/types/skill";

export const getStatusColor = (status: SyncStatus) => {
  switch (status) {
    case SyncStatus.Synced:
      return "bg-teal-500/10 text-teal-600 border-teal-500/20";
    case SyncStatus.Outdated:
      return "bg-teal-500/8 text-teal-500 border-teal-500/15";
    case SyncStatus.Conflict:
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case SyncStatus.Error:
      return "bg-red-500/10 text-red-600 border-red-500/20";
  }
};

export const getStatusIcon = (status: SyncStatus) => {
  switch (status) {
    case SyncStatus.Synced:
      return <CheckCircle2 className="h-3 w-3 mr-1" />;
    case SyncStatus.Outdated:
      return <Clock className="h-3 w-3 mr-1" />;
    case SyncStatus.Conflict:
      return <AlertTriangle className="h-3 w-3 mr-1" />;
    case SyncStatus.Error:
      return <AlertCircle className="h-3 w-3 mr-1" />;
  }
};

export const getMethodColor = (method: DispatchMethod) => {
  switch (method) {
    case DispatchMethod.Symlink:
      return "bg-teal-500/10 text-teal-600 border-teal-500/20";
    case DispatchMethod.Copy:
      return "bg-teal-500/8 text-teal-500 border-teal-500/15";
  }
};

export function DispatchSkillRow({
  dispatch,
  skill,
  onSync,
  onRemove,
  onDetail,
  loading,
}: {
  dispatch: Dispatch;
  skill: Skill | undefined;
  onSync: () => void;
  onRemove: () => void;
  onDetail: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/40 transition-colors group">
      <span
        className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium min-w-[72px] justify-center ${getStatusColor(dispatch.sync_status)}`}
      >
        {getStatusIcon(dispatch.sync_status)}
        {dispatch.sync_status}
      </span>
      <span
        className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium ${getMethodColor(dispatch.method)}`}
      >
        {dispatch.method}
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-medium shrink-0">
          {skill?.name ?? "Unknown Skill"}
        </span>
        {skill?.aiSummary && (
          <span
            className="text-xs text-muted-foreground/70 truncate"
            title={skill.aiSummary}
          >
            {skill.aiSummary}
          </span>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onDetail}
          title="View skill detail"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          disabled={
            loading ||
            dispatch.sync_status === SyncStatus.Conflict ||
            dispatch.sync_status === SyncStatus.Error
          }
          onClick={onSync}
          title="Sync this skill"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
          disabled={loading}
          onClick={onRemove}
          title="Remove dispatch"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
