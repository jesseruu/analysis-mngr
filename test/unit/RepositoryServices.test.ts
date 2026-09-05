import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ExternalRepositoryService } from '../../src/services/ExternalRepositoryService';
import { RemoteRepositoryService } from '../../src/services/RemoteRepositoryService';

describe('repository services', () => {
    it('normalizes language byte counts', () => {
        const result = RemoteRepositoryService.normalizeLanguages({
            TypeScript: 90,
            CSS: 10,
        });

        assert.equal(result.principalLanguage, 'TypeScript');
        assert.equal(result.principalLanguagePercentage, 90);
        assert.deepEqual(result.languages, { TypeScript: 90, CSS: 10 });
    });

    it('handles empty language responses', () => {
        assert.deepEqual(RemoteRepositoryService.normalizeLanguages({}), {
            principalLanguage: null,
            principalLanguagePercentage: 0,
            languages: {},
        });
    });

    it('extracts GitHub owner and repository names', () => {
        assert.deepEqual(RemoteRepositoryService.validateUrl('https://github.com/octocat/Hello-World.git'), {
            owner: 'octocat',
            repo: 'Hello-World',
        });
        assert.equal(RemoteRepositoryService.validateUrl('https://gitlab.com/octocat/Hello-World'), null);
    });

    it('rejects a missing local repository directory', async () => {
        await assert.rejects(
            ExternalRepositoryService.validateRepository('/path/that/does/not/exist', 'test-rquid'),
            (error: unknown) => error instanceof Error && error.message === 'External repository directory does not exist',
        );
    });
});
