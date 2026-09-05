import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { AttachmentService } from '../../src/services/AttachmentService';
import { S3Service } from '../../src/services/S3Service';

describe('AttachmentService', () => {
    const originalGetSignedUrl = S3Service.getSignedUrl;

    afterEach(() => {
        S3Service.getSignedUrl = originalGetSignedUrl;
    });

    it('generates an upload URL with the requested file metadata', async () => {
        let receivedParams: unknown;
        let receivedRquid = '';
        S3Service.getSignedUrl = (async (params, rquid) => {
            receivedParams = params;
            receivedRquid = rquid;
            return 'https://s3.example/upload';
        }) as typeof S3Service.getSignedUrl;

        const result = await AttachmentService.generateSignedUrl(
            'uploads/repository.zip',
            'application/zip',
            'test-rquid',
        );

        assert.equal(result, 'https://s3.example/upload');
        assert.deepEqual(receivedParams, {
            Bucket: process.env.BUCKET_NAME,
            Key: 'uploads/repository.zip',
            ContentType: 'application/zip',
        });
        assert.equal(receivedRquid, 'test-rquid');
    });

    it('propagates S3 signing errors', async () => {
        S3Service.getSignedUrl = (async () => {
            throw new Error('signing failed');
        }) as typeof S3Service.getSignedUrl;

        await assert.rejects(
            AttachmentService.generateSignedUrl('repository.zip', 'application/zip', 'test-rquid'),
            /signing failed/,
        );
    });
});
