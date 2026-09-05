import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AnalysisCodeService } from '../../src/services/AnalysisCodeService';

describe('AnalysisCodeService', () => {
    it('parses fenced JSON and applies the architecture fallback', () => {
        const fence = String.fromCharCode(96).repeat(3);
        const response = [
            `${fence}json`,
            JSON.stringify({
                summary: 'Repository summary',
                risks: ['Risk'],
                recommendations: ['Recommendation'],
                detectedPatterns: ['Strategy'],
            }),
            fence,
        ].join('\n');

        assert.deepEqual(AnalysisCodeService.parseAnalysis(response, 'test-rquid'), {
            summary: 'Repository summary',
            detectedArchitecture: 'No architecture detected',
            risks: ['Risk'],
            recommendations: ['Recommendation'],
            detectedPatterns: ['Strategy'],
        });
    });

    it('preserves a detected architecture', () => {
        const result = AnalysisCodeService.parseAnalysis(JSON.stringify({
            summary: 'Summary',
            detectedArchitecture: 'Layered architecture',
            risks: [],
            recommendations: [],
            detectedPatterns: [],
        }), 'test-rquid');

        assert.equal(result.detectedArchitecture, 'Layered architecture');
    });

    it('prepares a prompt with repository metadata and source paths', () => {
        const prompt = AnalysisCodeService.preparePrompt({
            repositoryName: 'owner/repository',
            description: 'Example repository',
            frameworks: ['Angular'],
            languages: { TypeScript: 100 },
            sourceFiles: [{ path: 'src/app.ts', content: 'export const app = true;' }],
        }, 'test-rquid');

        assert.match(prompt, /owner\/repository/);
        assert.match(prompt, /Angular/);
        assert.match(prompt, /src\/app\.ts/);
        assert.match(prompt, /Return only valid JSON/);
    });
});
