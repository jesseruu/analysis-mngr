import debugLib from 'debug';

const debug = debugLib('api:ErrorService');

export class AppError extends Error {
    public readonly statusCode: number;

    public constructor(message: string, statusCode: number) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        debug('Application error created status=%d message=%s', statusCode, message);
    }
}

class ErrorService {
    public static replayError(error: Error) {
        const statusCode = error instanceof AppError ? error.statusCode : 500;
        debug('Formatting error response status=%d name=%s', statusCode, error.name);

        return {
            EndDt: new Date().toISOString(),
            Status: {
                Message: error.message,
                Severity: 'Error',
                StatusCode: statusCode,
            },
        };
    }
}

export { ErrorService };
