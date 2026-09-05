export interface ExternalRepository {
    owner: string;
    repo: string;
}

export interface NormalizedLanguages {
    principalLanguage: string | null;
    principalLanguagePercentage: number;
    languages: Record<string, number>;
}

export interface RepositorySourceFile {
    path: string;
    content: string;
}
