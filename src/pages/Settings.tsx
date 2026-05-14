import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain,
  GitBranch,
  RefreshCw,
  Palette,
  Database,
  Download,
  Upload,
} from "lucide-react";

export function SettingsPage() {
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
            <p className="text-sm text-gray-500">
              LLM settings will be available here in a future update.
            </p>
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
