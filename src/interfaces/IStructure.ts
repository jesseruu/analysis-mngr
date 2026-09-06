export interface RepositoryTreeEntry {
    path: string;
    type: 'blob' | 'tree' | string;
    mode?: string;
    sha?: string;
    url?: string;
}

export interface RepositoryStructure {
    directories: string[];
    sourcePaths: string[];
    files: string[];
    frameworks: string[];
}
