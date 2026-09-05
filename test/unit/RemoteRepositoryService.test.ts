import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { RemoteRepositoryService } from '../../src/services/RemoteRepositoryService';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

describe('RemoteRepositoryService', () => {
    it('maps repository metadata from GitHub', async () => {
        globalThis.fetch = (async () => new Response(JSON.stringify({
            name: 'demo',
            full_name: 'owner/demo',
            description: 'Demo repository',
            private: false,
            default_branch: 'main',
            visibility: 'public',
        }), { status: 200 })) as typeof fetch;

        const result = await RemoteRepositoryService.validateRepository('owner', 'demo', 'test-rquid');

        assert.deepEqual(result, {
            name: 'demo',
            fullName: 'owner/demo',
            description: 'Demo repository',
            private: false,
            defaultBranch: 'main',
            visibility: 'public',
        });
    });

    it('converts GitHub API errors into AppError responses', async () => {
        globalThis.fetch = (async () => new Response('', { status: 404 })) as typeof fetch;

        await assert.rejects(
            RemoteRepositoryService.validateRepository('owner', 'missing', 'test-rquid'),
            (error: unknown) => error instanceof Error && error.message.includes('Repository does not exist'),
        );
    });

    it('analyzes a GitHub tree response', async () => {
        globalThis.fetch = (async () => new Response(JSON.stringify({
            tree: [
                { path: 'src', type: 'tree' },
                { path: 'src/index.ts', type: 'blob' },
                { path: 'angular.json', type: 'blob' },
            ],
        }), { status: 200 })) as typeof fetch;

        const result = await RemoteRepositoryService.getRepositoryStructure(
            'owner',
            'demo',
            'main',
            'test-rquid',
        );

        assert.deepEqual(result.directories, ['src']);
        assert.deepEqual(result.files, ['src/index.ts', 'angular.json']);
        assert.deepEqual(result.frameworks, ['Angular']);
    });

    it('decodes base64 source files and skips failed files', async () => {
        globalThis.fetch = (async (input: string | URL | Request) => {
            if (String(input).includes('good.ts')) {
                return new Response(JSON.stringify({
                    encoding: 'base64',
                    content: Buffer.from('export const ok = true;').toString('base64'),
                }), { status: 200 });
            }
            return new Response('', { status: 404 });
        }) as typeof fetch;

        const result = await RemoteRepositoryService.getSourceFiles(
            'owner',
            'demo',
            'main',
            ['good.ts', 'missing.ts'],
            'test-rquid',
        );

        assert.deepEqual(result, [{ path: 'good.ts', content: 'export const ok = true;' }]);
    });
});
