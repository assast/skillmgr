import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Brain,
  GitBranch,
  RefreshCw,
  Palette,
  Database,
  Download,
  Upload,
  Save,
} from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { LLMConfig } from "@/types/llm";

export function SettingsPage() {
  const { llmConfig, isLoading, loadLLMConfig, saveLLMConfig } =
    useSettingsStore();
  const [formData, setFormData] = useState<LLMConfig>({
    apiKey: "",
    baseUrl: "",
    model: "gpt-4o",
  });

  useEffect(() => {
    loadLLMConfig();
  }, [loadLLMConfig]);

  useEffect(() => {
    if (llmConfig) {
      setFormData(llmConfig);
    }
  }, [llmConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveLLMConfig(formData);
      toast.success("LLM configuration saved successfully");
    } catch (error) {
      toast.error(`Failed to save configuration: ${(error as Error).message}`);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-500">Configure your SkillVault preferences</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <CardTitle>LLM Configuration</CardTitle>
            </div>
            <CardDescription>
              Configure your language model providers and API keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select defaultValue="openai" disabled>
                  <SelectTrigger id="provider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI / Compatible</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Currently only OpenAI-compatible APIs are supported
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-..."
                  value={formData.apiKey}
                  onChange={(e) =>
                    setFormData({ ...formData, apiKey: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL (Optional)</Label>
                <Input
                  id="baseUrl"
                  placeholder="https://api.openai.com/v1"
                  value={formData.baseUrl || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      baseUrl: e.target.value || undefined,
                    })
                  }
                />
                <p className="text-xs text-gray-500">
                  Leave empty for default OpenAI API, or enter your custom
                  endpoint for other providers
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="gpt-4o"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-gray-500">
                  e.g. gpt-4o, gpt-3.5-turbo, claude-3-opus (for compatible
                  providers)
                </p>
              </div>

              <Button type="submit" disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Saving..." : "Save Configuration"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-500" />
              <CardTitle>Git Configuration</CardTitle>
            </div>
            <CardDescription>
              Set up Git credentials and repository settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Git settings will be available here in a future update.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-green-500" />
              <CardTitle>Sync Strategy</CardTitle>
            </div>
            <CardDescription>
              Configure how skills are synced and updated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Sync strategy settings will be available here in a future update.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-orange-500" />
              <CardTitle>Theme & Language</CardTitle>
            </div>
            <CardDescription>
              Customize the appearance and language of SkillVault
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Theme and language settings will be available here in a future
              update.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-red-500" />
              <CardTitle>Backup & Restore</CardTitle>
            </div>
            <CardDescription>
              Backup your skill library and restore from backups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Create Backup
              </Button>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Restore Backup
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Full backup and restore functionality coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
