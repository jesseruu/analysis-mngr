import { RepositorySourceFile } from './IRemote';

export interface CodeAnalysisPromptInput {
    repositoryName: string;
    description?: string | null;
    frameworks: string[];
    languages: Record<string, number>;
    sourceFiles: RepositorySourceFile[];
}

export interface CodeAnalysisResult {
    summary: string;
    detectedArchitecture: string;
    risks: string[];
    recommendations: string[];
    detectedPatterns: string[];
}
