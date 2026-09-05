import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError, ErrorService } from '../../src/utilities/ErrorService';
import { HttpUtils } from '../../src/utilities/HttpUtils';

describe('ErrorService', () => {
    it('preserves application error status codes', () => {
        const response = ErrorService.replayError(new AppError('Invalid request', 422));

        assert.equal(response.Status.StatusCode, 422);
        assert.equal(response.Status.Message, 'Invalid request');
    });

    it('uses 500 for unexpected errors', () => {
        const response = ErrorService.replayError(new Error('Unexpected failure'));

        assert.equal(response.Status.StatusCode, 500);
    });
});

describe('HttpUtils', () => {
    it('sends a formatted application error response', () => {
        let statusCode = 0;
        let body: unknown;
        const response = {
            req: { path: '/api/v1/analysis' },
            status(status: number) {
                statusCode = status;
                return this;
            },
            send(value: unknown) {
                body = value;
                return this;
            },
        } as never;

        HttpUtils.handleError(response, new AppError('Invalid request', 422), 'test-rquid');

        assert.equal(statusCode, 422);
        assert.deepEqual(body, {
            EndDt: (body as { EndDt: string }).EndDt,
            Status: {
                Message: 'Invalid request',
                Severity: 'Error',
                StatusCode: 422,
            },
        });
    });
});
