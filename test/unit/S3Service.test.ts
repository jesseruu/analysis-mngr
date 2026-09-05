import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { S3Client } from '@aws-sdk/client-s3';
import { S3Service } from '../../src/services/S3Service';

const originalSend = S3Client.prototype.send;

afterEach(() => {
    S3Client.prototype.send = originalSend;
});

describe('S3Service', () => {
    it('returns the object response from S3', async () => {
        const expected = { Body: new Uint8Array([1, 2, 3]), ContentLength: 3 };
        S3Client.prototype.send = (async () => expected) as typeof S3Client.prototype.send;

        const result = await S3Service.getObject(
            {
                Bucket: 'analysis-bucket',
                Key: 'uploads/repository.zip',
            },
            'test-rquid',
        );

        assert.equal(result, expected);
    });

    it('propagates S3 errors', async () => {
        S3Client.prototype.send = (async () => {
            throw new Error('S3 unavailable');
        }) as typeof S3Client.prototype.send;

        await assert.rejects(
            S3Service.getObject({ Bucket: 'analysis-bucket', Key: 'missing.zip' }, 'test-rquid'),
            /S3 unavailable/,
        );
    });
});
