import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { afterEach, describe, it } from 'node:test';
import { analysisController } from '../../src/controllers/AnalysisController';
import { AnalysisStrategyFactory } from '../../src/services/strategies/AnalysisStrategyFactory';
import { AttachmentService } from '../../src/services/AttachmentService';

const app = express();
app.use(express.json());
app.use('/api/v1', analysisController);

const originalCreate = AnalysisStrategyFactory.create;
const originalGenerateSignedUrl = AttachmentService.generateSignedUrl;

afterEach(() => {
    AnalysisStrategyFactory.create = originalCreate;
    AttachmentService.generateSignedUrl = originalGenerateSignedUrl;
});

describe('AnalysisController', () => {
    it('executes the selected analysis strategy', async () => {
        let receivedType = '';
        let receivedRquid = '';
        AnalysisStrategyFactory.create = ((type: string) => {
            receivedType = type;
            return {
                analyze: async (body, rquid) => {
                    receivedRquid = rquid;
                    return { analyzed: body.requestUrl };
                },
            };
        }) as typeof AnalysisStrategyFactory.create;

        const response = await request(app)
            .post('/api/v1/analysis')
            .set('X-RqUID', 'test-rquid')
            .send({ sourceType: 'github', requestUrl: 'https://github.com/owner/repo' });

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, { analyzed: 'https://github.com/owner/repo' });
        assert.equal(receivedType, 'github');
        assert.equal(receivedRquid, 'test-rquid');
    });

    it('returns a formatted error when the strategy fails', async () => {
        AnalysisStrategyFactory.create = (() => ({
            analyze: async () => {
                throw new Error('analysis failed');
            },
        })) as typeof AnalysisStrategyFactory.create;

        const response = await request(app)
            .post('/api/v1/analysis')
            .set('X-RqUID', 'test-rquid')
            .send({ sourceType: 'github', requestUrl: 'https://github.com/owner/repo' });

        assert.equal(response.status, 500);
        assert.equal(response.body.Status.Message, 'analysis failed');
        assert.equal(response.body.Status.StatusCode, 500);
    });
});

describe('Attachment endpoint', () => {
    it('returns the generated signed URL', async () => {
        let receivedFileName = '';
        let receivedFileType = '';
        let receivedRquid = '';
        AttachmentService.generateSignedUrl = (async (fileName, fileType, rquid) => {
            receivedFileName = fileName;
            receivedFileType = fileType;
            receivedRquid = rquid;
            return 'https://s3.example/upload';
        }) as typeof AttachmentService.generateSignedUrl;

        const response = await request(app)
            .post('/api/v1/attachments')
            .set('X-RqUID', 'test-rquid')
            .send({ fileName: 'uploads/repository.zip', fileType: 'application/zip' });

        assert.equal(response.status, 200);
        assert.equal(response.text, 'https://s3.example/upload');
        assert.equal(receivedFileName, 'uploads/repository.zip');
        assert.equal(receivedFileType, 'application/zip');
        assert.equal(receivedRquid, 'test-rquid');
    });

    it('returns a formatted error when URL generation fails', async () => {
        AttachmentService.generateSignedUrl = (async () => {
            throw new Error('upload URL failed');
        }) as typeof AttachmentService.generateSignedUrl;

        const response = await request(app)
            .post('/api/v1/attachments')
            .set('X-RqUID', 'test-rquid')
            .send({ fileName: 'repository.zip', fileType: 'application/zip' });

        assert.equal(response.status, 500);
        assert.equal(response.body.Status.Message, 'upload URL failed');
    });
});
