import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { ExternalRepositoryService } from '../../src/services/ExternalRepositoryService';

describe('ExternalRepositoryService', () => {
    it('extracts metadata, structure, languages, and source files locally', async () => {
        const root = await mkdtemp(path.join(tmpdir(), 'analysis-test-'));
        await mkdir(path.join(root, 'src'), { recursive: true });
        await writeFile(path.join(root, 'package.json'), '{}');
        await writeFile(path.join(root, 'src', 'index.ts'), 'export const ok = true;');

        const repository = await ExternalRepositoryService.validateRepository(root, 'test-rquid');
        const structure = await ExternalRepositoryService.getRepositoryStructure(
            root,
            'test-rquid',
        );
        const languages = await ExternalRepositoryService.getLanguages(root, 'test-rquid');
        const sourceFiles = await ExternalRepositoryService.getSourceFiles(
            root,
            structure.files,
            'test-rquid',
        );

        assert.equal(repository.name, path.basename(root));
        assert.deepEqual(structure.directories, ['src']);
        assert.equal(languages.principalLanguage, 'TypeScript');
        assert.deepEqual(sourceFiles, [
            { path: 'package.json', content: '{}' },
            { path: 'src/index.ts', content: 'export const ok = true;' },
        ]);

        await ExternalRepositoryService.removeExtractedRepository(root, 'test-rquid');
    });

    it('rejects a file path instead of a directory', async () => {
        const root = await mkdtemp(path.join(tmpdir(), 'analysis-test-'));
        const filePath = path.join(root, 'file.txt');
        await writeFile(filePath, 'content');

        await assert.rejects(
            ExternalRepositoryService.validateRepository(filePath, 'test-rquid'),
            (error: unknown) => error instanceof Error && error.message.includes('not a directory'),
        );

        await ExternalRepositoryService.removeExtractedRepository(root, 'test-rquid');
    });
});
