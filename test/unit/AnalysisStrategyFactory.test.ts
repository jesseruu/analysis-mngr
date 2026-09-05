import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AnalysisStrategyFactory } from '../../src/services/strategies/AnalysisStrategyFactory';
import { FileAnalysisStrategy } from '../../src/services/strategies/FileAnalysisStrategy';
import { GithubRepositoryAnalysisStrategy } from '../../src/services/strategies/GithubRepositoryAnalysisStrategy';

describe('AnalysisStrategyFactory', () => {
    it('creates the GitHub strategy for url analysis', () => {
        assert.ok(
            AnalysisStrategyFactory.create('github') instanceof GithubRepositoryAnalysisStrategy,
        );
    });

    it('creates the external repository strategy for file analysis', () => {
        assert.ok(AnalysisStrategyFactory.create('file') instanceof FileAnalysisStrategy);
    });

    it('rejects unsupported analysis types', () => {
        assert.throws(
            () => AnalysisStrategyFactory.create('unsupported' as 'github'),
            /Unsupported analysis type: unsupported/,
        );
    });
});
