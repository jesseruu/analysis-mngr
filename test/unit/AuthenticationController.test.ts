import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { afterEach, describe, it } from 'node:test';
import { authencationController } from '../../src/controllers/AuthenticationController';
import { AuthencationService } from '../../src/services/AuthenticationService';

const app = express();
app.use('/api/v1', authencationController);

const originalGenerateJwt = AuthencationService.generateJwt;

afterEach(() => {
    AuthencationService.generateJwt = originalGenerateJwt;
});

describe('AuthenticationController', () => {
    it('returns a generated authentication token', async () => {
        AuthencationService.generateJwt = (() =>
            'test-token') as typeof AuthencationService.generateJwt;

        const response = await request(app).post('/api/v1/auth/token').set('X-RqUID', 'test-rquid');

        assert.equal(response.status, 200);
        assert.equal(response.text, 'test-token');
    });

    it('returns a formatted error when token generation fails', async () => {
        AuthencationService.generateJwt = (() => {
            throw new Error('token generation failed');
        }) as typeof AuthencationService.generateJwt;

        const response = await request(app).post('/api/v1/auth/token').set('X-RqUID', 'test-rquid');

        assert.equal(response.status, 500);
        assert.equal(response.body.Status.Message, 'token generation failed');
        assert.equal(response.body.Status.StatusCode, 500);
    });
});
