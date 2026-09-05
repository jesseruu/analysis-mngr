import { mkdtemp, readFile, readdir, rm, stat, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import unzipper from 'unzipper';
import { AppError } from '../utilities/ErrorService';
import { StructureService } from './StructureService';
import { RepositoryStructure } from '../interfaces/IStructure';
import { RemoteRepositoryService } from './RemoteRepositoryService';
import { RepositorySourceFile } from '../interfaces/IRemote';
import debugLib from 'debug';

const debug = debugLib('api:ExternalRepositoryService');

export class ExternalRepositoryService {
    public static async extractZip(body: unknown, rquid: string): Promise<string> {
        debug('<%s> Starting ZIP extraction', rquid);
        const zipBuffer = await ExternalRepositoryService.toBuffer(body);
        const extractionPath = await mkdtemp(path.join(tmpdir(), 'analysis-mngr-'));
        const directory = await unzipper.Open.buffer(zipBuffer);

        try {
            for (const entry of directory.files) {
                const targetPath = path.resolve(extractionPath, entry.path);
                const relativePath = path.relative(extractionPath, targetPath);

                if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
                    throw new AppError('ZIP contains an unsafe path', 422);
                }

                if (entry.type === 'Directory') {
                    await mkdir(targetPath, { recursive: true });
                    continue;
                }

                await mkdir(path.dirname(targetPath), { recursive: true });
                await writeFile(targetPath, await entry.buffer());
            }

            const rootEntries = await readdir(extractionPath, { withFileTypes: true });
            const rootDirectories = rootEntries.filter((entry) => entry.isDirectory());
            const rootFiles = rootEntries.filter((entry) => !entry.isDirectory());
            const rootDirectory = rootDirectories[0];

            if (rootDirectory && rootDirectories.length === 1 && rootFiles.length === 0) {
                debug('<%s> ZIP extracted with wrapper directory=%s', rquid, rootDirectory.name);
                return path.join(extractionPath, rootDirectory.name);
            }

            debug(
                '<%s> ZIP extracted path=%s rootDirectories=%d rootFiles=%d',
                rquid,
                extractionPath,
                rootDirectories.length,
                rootFiles.length,
            );
            return extractionPath;
        } catch (error) {
            debug(
                '<%s> ZIP extraction failed name=%s message=%s',
                rquid,
                (error as Error)?.name,
                (error as Error)?.message,
            );
            await rm(extractionPath, { recursive: true, force: true });
            throw error;
        }
    }

    public static async removeExtractedRepository(
        directoryPath: string,
        rquid: string,
    ): Promise<void> {
        const parentPath = path.dirname(directoryPath);
        const extractionRoot = path.basename(parentPath).startsWith('analysis-mngr-')
            ? parentPath
            : directoryPath;
        await rm(extractionRoot, { recursive: true, force: true });
        debug('<%s> Temporary repository removed path=%s', rquid, extractionRoot);
    }

    public static async validateRepository(directoryPath: string, rquid: string) {
        debug('<%s> Validating external repository path=%s', rquid, directoryPath);
        const repositoryPath = path.resolve(directoryPath);

        try {
            const repositoryStats = await stat(repositoryPath);
            if (!repositoryStats.isDirectory()) {
                throw new AppError('External repository path is not a directory', 422);
            }
            const name = path.basename(repositoryPath);
            return {
                name,
                fullName: name,
                description: null,
                private: true,
                defaultBranch: null,
                visibility: 'external',
                path: repositoryPath,
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError('External repository directory does not exist', 404);
        }
    }

    public static async getRepositoryStructure(
        directoryPath: string,
        rquid: string,
    ): Promise<RepositoryStructure> {
        debug('<%s> Getting external repository structure path=%s', rquid, directoryPath);
        return StructureService.analyzeDirectory(directoryPath, rquid);
    }

    public static async getLanguages(directoryPath: string, rquid: string) {
        debug('<%s> Getting external repository languages path=%s', rquid, directoryPath);
        const structure = await ExternalRepositoryService.getRepositoryStructure(
            directoryPath,
            rquid,
        );
        const languageBytes: Record<string, number> = {};

        for (const filePath of structure.files) {
            const language = ExternalRepositoryService.languageForPath(filePath);
            if (!language) {
                continue;
            }

            const absolutePath = path.join(directoryPath, filePath);
            const fileStats = await stat(absolutePath);
            languageBytes[language] = (languageBytes[language] ?? 0) + fileStats.size;
        }

        const languages = RemoteRepositoryService.normalizeLanguages(languageBytes);
        debug(
            '<%s> External languages normalized principal=%s languageCount=%d',
            rquid,
            languages.principalLanguage,
            Object.keys(languages.languages).length,
        );
        return languages;
    }

    public static async getSourceFiles(
        directoryPath: string,
        filePaths: string[],
        rquid: string,
        maxFiles = 30,
        maxFileCharacters = 12000,
    ): Promise<RepositorySourceFile[]> {
        debug(
            '<%s> Reading external source files path=%s candidateFiles=%d maxFiles=%d',
            rquid,
            directoryPath,
            filePaths.length,
            maxFiles,
        );
        const sourceFiles: RepositorySourceFile[] = [];
        const pathsToRead = filePaths
            .filter((filePath) => ExternalRepositoryService.isTextSourceFile(filePath))
            .slice(0, maxFiles);

        for (const filePath of pathsToRead) {
            try {
                const content = await readFile(path.join(directoryPath, filePath), 'utf8');
                sourceFiles.push({
                    path: filePath,
                    content: content.slice(0, maxFileCharacters),
                });
            } catch {
                // Ignore files that cannot be read as text.
            }
        }

        debug('<%s> External source files read count=%d', rquid, sourceFiles.length);
        return sourceFiles;
    }

    private static languageForPath(filePath: string): string | null {
        const extension = path.extname(filePath).toLowerCase();
        const languages: Record<string, string> = {
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.py': 'Python',
            '.java': 'Java',
            '.go': 'Go',
            '.rs': 'Rust',
            '.c': 'C',
            '.h': 'C',
            '.cc': 'C++',
            '.cpp': 'C++',
            '.cxx': 'C++',
            '.hpp': 'C++',
            '.cs': 'C#',
            '.php': 'PHP',
            '.rb': 'Ruby',
            '.swift': 'Swift',
            '.kt': 'Kotlin',
            '.html': 'HTML',
            '.css': 'CSS',
            '.scss': 'SCSS',
            '.sql': 'SQL',
        };
        return languages[extension] ?? null;
    }

    private static isTextSourceFile(filePath: string): boolean {
        return (
            !/(^|[\\/])(node_modules|vendor|dist|build|coverage|\.git)([\\/]|$)/i.test(filePath) &&
            !/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|lock|woff2?|ttf)$/i.test(filePath)
        );
    }

    private static async toBuffer(body: unknown): Promise<Buffer> {
        if (body instanceof Uint8Array) {
            return Buffer.from(body);
        }

        if (
            body &&
            typeof (body as { transformToByteArray?: unknown }).transformToByteArray === 'function'
        ) {
            const bytes = await (
                body as { transformToByteArray: () => Promise<Uint8Array> }
            ).transformToByteArray();
            return Buffer.from(bytes);
        }

        if (
            body &&
            typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === 'function'
        ) {
            const chunks: Buffer[] = [];
            for await (const chunk of body as AsyncIterable<Uint8Array>) {
                chunks.push(Buffer.from(chunk));
            }
            return Buffer.concat(chunks);
        }

        throw new AppError('S3 object does not contain a readable ZIP body', 422);
    }
}
