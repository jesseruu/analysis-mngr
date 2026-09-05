import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { StructureService } from '../../src/services/StructureService';

const entries = [
    { path: 'src', type: 'tree' },
    { path: 'src/controllers', type: 'tree' },
    { path: 'src/controllers/AppController.ts', type: 'blob' },
    { path: 'src/index.ts', type: 'blob' },
    { path: 'angular.json', type: 'blob' },
    { path: 'package.json', type: 'blob' },
    { path: 'README.md', type: 'blob' },
];

describe('StructureService', () => {
    it('returns root directories and first-level src paths only', () => {
        const structure = StructureService.analyzeEntries(entries, 'test-rquid');

        assert.deepEqual(structure.directories, ['src']);
        assert.deepEqual(structure.sourcePaths, ['src/controllers', 'src/index.ts']);
        assert.equal(structure.files.includes('src/controllers/AppController.ts'), true);
    });

    it('detects framework markers independently of source language', () => {
        const structure = StructureService.analyzeEntries([
            { path: 'go.mod', type: 'blob' },
            { path: 'Cargo.toml', type: 'blob' },
            { path: 'CMakeLists.txt', type: 'blob' },
            { path: 'angular.json', type: 'blob' },
        ]);

        assert.deepEqual(structure.frameworks, ['Angular', 'Go', 'C/C++', 'Rust']);
    });
});
