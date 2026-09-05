import { readdir } from 'node:fs/promises';
import path from 'node:path';
import debugLib from 'debug';
import { RepositoryStructure, RepositoryTreeEntry } from '../interfaces/IStructure';

const debug = debugLib('api:StructureService');

export class StructureService {
    public static async analyzeDirectory(
        directoryPath: string,
        rquid: string,
    ): Promise<RepositoryStructure> {
        debug('<%s> Analyzing local directory path=%s', rquid, directoryPath);
        const entries: RepositoryTreeEntry[] = [];
        await StructureService.collectEntries(directoryPath, directoryPath, entries, rquid);
        const structure = StructureService.analyzeEntries(entries, rquid);
        debug(
            '<%s> Local directory analyzed entries=%d files=%d directories=%d frameworks=%j',
            rquid,
            entries.length,
            structure.files.length,
            structure.directories.length,
            structure.frameworks,
        );
        return structure;
    }

    public static analyzeEntries(
        entries: RepositoryTreeEntry[],
        rquid = 'unknown',
    ): RepositoryStructure {
        const files = entries.filter((entry) => entry.type === 'blob').map((entry) => entry.path);
        const directories = entries
            .filter((entry) => entry.type === 'tree')
            .map((entry) => entry.path);
        const rootDirectories = directories.filter((directoryPath) => !directoryPath.includes('/'));
        const sourcePaths = entries
            .filter((entry) => {
                if (!entry.path.startsWith('src/')) {
                    return false;
                }

                return !entry.path.slice('src/'.length).includes('/');
            })
            .map((entry) => entry.path);

        const paths = new Set(files.map((filePath) => filePath.toLowerCase()));
        const frameworks: string[] = [];

        if ([...paths].some((filePath) => /(^|\/)next\.config\.(js|mjs|ts)$/.test(filePath)))
            frameworks.push('Next.js');
        if (paths.has('angular.json')) frameworks.push('Angular');
        if ([...paths].some((filePath) => /(^|\/)vue\.config\.(js|ts)$/.test(filePath)))
            frameworks.push('Vue');
        if ([...paths].some((filePath) => /(^|\/)svelte\.config\.(js|ts)$/.test(filePath)))
            frameworks.push('Svelte');
        if ([...paths].some((filePath) => /(^|\/)manage\.py$/.test(filePath)))
            frameworks.push('Django');
        if (paths.has('artisan')) frameworks.push('Laravel');
        if (paths.has('pom.xml') || paths.has('build.gradle') || paths.has('build.gradle.kts'))
            frameworks.push('Java/JVM');
        if ([...paths].some((filePath) => /(^|\/)go\.mod$/.test(filePath))) frameworks.push('Go');
        if (
            [...paths].some((filePath) =>
                /(^|\/)(cmakelists\.txt|meson\.build|configure\.ac)$/.test(filePath),
            ) ||
            paths.has('makefile')
        )
            frameworks.push('C/C++');
        if ([...paths].some((filePath) => /(^|\/)cargo\.toml$/.test(filePath)))
            frameworks.push('Rust');
        if (paths.has('composer.json')) frameworks.push('PHP');
        if (paths.has('gemfile')) frameworks.push('Ruby');
        if ([...paths].some((filePath) => /(^|\/)[^/]+\.sln$/.test(filePath)))
            frameworks.push('.NET');

        const structure = { directories: rootDirectories, sourcePaths, files, frameworks };
        debug(
            '<%s> Tree analyzed entries=%d files=%d rootDirectories=%d sourcePaths=%d frameworks=%j',
            rquid,
            entries.length,
            files.length,
            rootDirectories.length,
            sourcePaths.length,
            frameworks,
        );
        return structure;
    }

    private static async collectEntries(
        rootPath: string,
        currentPath: string,
        entries: RepositoryTreeEntry[],
        rquid: string,
    ): Promise<void> {
        debug('<%s> Reading directory path=%s', rquid, currentPath);
        const directoryEntries = await readdir(currentPath, { withFileTypes: true });

        for (const entry of directoryEntries) {
            if (entry.name === '.git' || entry.isSymbolicLink()) {
                continue;
            }

            const absolutePath = path.join(currentPath, entry.name);
            const relativePath = path.relative(rootPath, absolutePath).split(path.sep).join('/');

            if (entry.isDirectory()) {
                entries.push({ path: relativePath, type: 'tree' });
                await StructureService.collectEntries(rootPath, absolutePath, entries, rquid);
            } else if (entry.isFile()) {
                entries.push({ path: relativePath, type: 'blob' });
            }
        }
    }
}
