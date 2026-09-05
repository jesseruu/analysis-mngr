import config from '../../config';
import { AppError } from '../utilities/ErrorService';
import { StructureService } from './StructureService';
import { NormalizedLanguages, ExternalRepository, RepositorySourceFile } from '../interfaces/IRemote';
import { RepositoryTreeEntry } from '../interfaces/IStructure';
import debugLib from 'debug';

const debug = debugLib('api:GitHubService');

const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${config.githubToken}`,
};

export class RemoteRepositoryService {
    public static async validateRepository(owner: string, repoName: string, rquid: string) {
        debug('<%s> Validating GitHub repository owner=%s repo=%s', rquid, owner, repoName);
        try {
            const repo = await fetch(`${config.githubApi}/${owner}/${repoName}`, {
                headers,
                method: 'GET',
            });

            if (repo.status === 404) {
                throw new AppError('Repository does not exist or do not have access', repo.status);
            }

            if (repo.status === 403) {
                throw new AppError('Do not have access to repository', repo.status);
            }

            if (!repo.ok) {
                throw new AppError('Error getting repository', repo.status);
            }

            const response = await repo.json();
            debug(
                '<%s> GitHub repository validated owner=%s repo=%s defaultBranch=%s',
                rquid,
                owner,
                repoName,
                response.default_branch,
            );
            return {
                name: response.name,
                fullName: response.full_name,
                description: response.description,
                private: response.private,
                defaultBranch: response.default_branch,
                visibility: response.visibility,
            };
        } catch (error: any) {
            debug(
                '<%s> GitHub repository validation failed owner=%s repo=%s status=%s name=%s message=%s',
                rquid,
                owner,
                repoName,
                error?.status,
                error?.name,
                error?.message,
            );
            throw error;
        }
    }

    public static async getRepositoryStructure(
        owner: string,
        repoName: string,
        defaultBranch: string,
        rquid: string,
    ) {
        debug(
            '<%s> Fetching GitHub tree owner=%s repo=%s branch=%s',
            rquid,
            owner,
            repoName,
            defaultBranch,
        );
        try {
            const repo = await fetch(
                `
                ${config.githubApi}/${owner}/${repoName}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
                {
                    headers,
                    method: 'GET',
                },
            );

            if (repo.status === 404) {
                throw new AppError('Repository does not exist or do not have access', repo.status);
            }

            if (repo.status === 403) {
                throw new AppError('Do not have access to repository', repo.status);
            }

            if (!repo.ok) {
                throw new AppError('Error getting repository', repo.status);
            }

            const response = (await repo.json()) as { tree?: RepositoryTreeEntry[] };
            const structure = StructureService.analyzeEntries(response.tree ?? [], rquid);
            debug(
                '<%s> GitHub tree analyzed owner=%s repo=%s files=%d frameworks=%j',
                rquid,
                owner,
                repoName,
                structure.files.length,
                structure.frameworks,
            );
            return structure;
        } catch (error: any) {
            debug(
                '<%s> GitHub tree request failed owner=%s repo=%s name=%s message=%s',
                rquid,
                owner,
                repoName,
                error?.name,
                error?.message,
            );
            throw error;
        }
    }

    public static async getLanguages(owner: string, repoName: string, rquid: string) {
        debug('<%s> Fetching GitHub languages owner=%s repo=%s', rquid, owner, repoName);
        try {
            const lenguages = await fetch(`${config.githubApi}/${owner}/${repoName}/languages`, {
                headers,
                method: 'GET',
            });
            if (lenguages.status === 403) {
                throw new AppError('Do not have access to lenguages', lenguages.status);
            }

            if (!lenguages.ok) {
                throw new AppError('Error getting lenguages', lenguages.status);
            }

            const languageBytes = (await lenguages.json()) as Record<string, number>;
            const languages = RemoteRepositoryService.normalizeLanguages(languageBytes);
            debug(
                '<%s> GitHub languages normalized owner=%s repo=%s principal=%s languageCount=%d',
                rquid,
                owner,
                repoName,
                languages.principalLanguage,
                Object.keys(languages.languages).length,
            );
            return languages;
        } catch (error: any) {
            debug(
                '<%s> GitHub languages request failed owner=%s repo=%s name=%s message=%s',
                rquid,
                owner,
                repoName,
                error?.name,
                error?.message,
            );
            throw error;
        }
    }

    public static async getSourceFiles(
        owner: string,
        repoName: string,
        defaultBranch: string,
        filePaths: string[],
        rquid: string,
        maxFiles = 30,
        maxFileCharacters = 12000,
    ): Promise<RepositorySourceFile[]> {
        debug(
            '<%s> Fetching GitHub source files owner=%s repo=%s candidateFiles=%d maxFiles=%d',
            rquid,
            owner,
            repoName,
            filePaths.length,
            maxFiles,
        );
        const sourceFiles: RepositorySourceFile[] = [];
        const pathsToFetch = filePaths
            .filter((filePath) => RemoteRepositoryService.isTextSourceFile(filePath))
            .slice(0, maxFiles);

        for (const filePath of pathsToFetch) {
            const response = await fetch(
                `${config.githubApi}/${owner}/${repoName}/contents/${filePath}?ref=${encodeURIComponent(defaultBranch)}`,
                { headers, method: 'GET' },
            );

            if (!response.ok) {
                debug(
                    '<%s> Skipping GitHub source file path=%s status=%d',
                    rquid,
                    filePath,
                    response.status,
                );
                continue;
            }

            const payload = (await response.json()) as { content?: string; encoding?: string };
            if (payload.encoding !== 'base64' || !payload.content) {
                continue;
            }

            const content = Buffer.from(payload.content.replace(/\s/g, ''), 'base64')
                .toString('utf8')
                .slice(0, maxFileCharacters);
            sourceFiles.push({ path: filePath, content });
        }

        return sourceFiles;
    }

    private static isTextSourceFile(filePath: string): boolean {
        return (
            !/(^|\/)(node_modules|vendor|dist|build|coverage|\.git)(\/|$)/i.test(filePath) &&
            !/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|lock)$/i.test(filePath)
        );
    }

    public static normalizeLanguages(languageBytes: Record<string, number>): NormalizedLanguages {
        const totalBytes = Object.values(languageBytes).reduce((total, bytes) => total + bytes, 0);

        if (totalBytes === 0) {
            return {
                principalLanguage: null,
                principalLanguagePercentage: 0,
                languages: {},
            };
        }

        const languages = Object.fromEntries(
            Object.entries(languageBytes).map(([language, bytes]) => [
                language,
                Number(((bytes / totalBytes) * 100).toFixed(2)),
            ]),
        );
        const principalLanguage =
            Object.entries(languageBytes).sort(
                ([, firstBytes], [, secondBytes]) => secondBytes - firstBytes,
            )[0]?.[0] ?? null;

        return {
            principalLanguage,
            principalLanguagePercentage: principalLanguage
                ? (languages[principalLanguage] ?? 0)
                : 0,
            languages,
        };
    }

    public static validateUrl(url: string): ExternalRepository | null {
        try {
            const parsedUrl = new URL(url);
            const hostname = parsedUrl.hostname.toLowerCase();
            const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

            if (
                parsedUrl.protocol !== 'https:' ||
                !['github.com', 'www.github.com'].includes(hostname) ||
                parsedUrl.username ||
                parsedUrl.password ||
                parsedUrl.port ||
                parsedUrl.search ||
                parsedUrl.hash ||
                pathParts.length !== 2
            ) {
                return null;
            }

            const owner = pathParts.at(0);
            const repositoryName = pathParts.at(1)?.replace(/\.git$/, '');

            if (!owner || !repositoryName) {
                return null;
            }

            return { owner, repo: repositoryName };
        } catch {
            return null;
        }
    }
}
