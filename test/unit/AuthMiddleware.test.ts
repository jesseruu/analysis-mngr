import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sign } from 'jsonwebtoken';
import config from '../../config';
import { authenticateToken } from '../../src/Middlewares/AuthMiddleware';

const createResponse = () => {
    let statusCode = 0;
    let responseBody: unknown;

    const response = {
        status(status: number) {
            statusCode = status;
            return this;
        },
        json(body: unknown) {
            responseBody = body;
            return this;
        },
    } as never;

    return {
        response,
        get statusCode() {
            return statusCode;
        },
        get body() {
            return responseBody;
        },
    };
};

describe('authenticateToken', () => {
    it('rejects requests without a token', () => {
        const result = createResponse();

        authenticateToken({ headers: {} } as never, result.response, () => undefined);

        assert.equal(result.statusCode, 401);
        assert.deepEqual(result.body, { error: 'Access denied. No token provided.' });
    });

    it('rejects requests with an invalid token', () => {
        const result = createResponse();

        authenticateToken(
            { headers: { authorization: 'Bearer invalid-token' } } as never,
            result.response,
            () => undefined,
        );

        assert.equal(result.statusCode, 403);
        assert.deepEqual(result.body, { error: 'Invalid or expired token.' });
    });

    it('calls next for a valid token', () => {
        const originalJwtSecret = config.jwtSecret;
        config.jwtSecret = 'test-secret';

        try {
            const token = sign({}, config.jwtSecret);
            let nextCalled = false;

            authenticateToken(
                { headers: { authorization: `Bearer ${token}` } } as never,
                createResponse().response,
                () => {
                    nextCalled = true;
                },
            );

            assert.equal(nextCalled, true);
        } finally {
            config.jwtSecret = originalJwtSecret;
        }
    });
});
