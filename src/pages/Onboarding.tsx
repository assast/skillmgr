import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useConfigStore } from "../store/configStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { FolderOpen, Loader2, Vault } from "lucide-react";

export default function Onboarding() {
  const { setBasePath, isLoading, error, clearError } = useConfigStore();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const handleSelectDirectory = async () => {
    clearError();
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择基础目录",
      });

      if (selected && typeof selected === "string") {
        setSelectedPath(selected);
        await setBasePath(selected);
      }
    } catch (err) {
      console.error("Failed to select directory:", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/20">
            <Vault className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            欢迎使用 Skill Vaults
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            请先选择一个基础目录来存储你的技能和知识内容
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedPath && (
            <div className="p-3 bg-teal-50/80 border border-teal-200/60 rounded-xl">
              <p className="text-sm text-teal-800 font-medium">已选择目录:</p>
              <p className="text-xs text-teal-700 mt-1 font-mono break-all">
                {selectedPath}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50/80 border border-red-200/60 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            onClick={handleSelectDirectory}
            disabled={isLoading}
            className="w-full h-12 text-base font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <FolderOpen className="w-4 h-4 mr-2" />
                选择基础目录
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            我们会在你选择的目录中创建 Skill Vaults 文件夹来存储所有内容
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
