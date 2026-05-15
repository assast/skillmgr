export interface LLMProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  isDefault: boolean;
}

export interface LLMModel {
  id: string;
  ownedBy?: string;
}

export interface SkillAnalysisResult {
  skillType: string;
  description: string;
  usageInstructions: string;
  tags: string[];
  dependencies: string[];
  qualityScore: number;
}
