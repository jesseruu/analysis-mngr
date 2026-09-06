import { Request, Response, Router } from 'express';
import OpenApiValidatorProvider from '../utilities/OpenApiValidatorProvider';
import debugLib from 'debug';
import { HttpUtils } from '../utilities/HttpUtils';
import { AuthencationService } from '../services/AuthenticationService';

const debug = debugLib('api:AuthencationController');

const authencationController = Router();
const validator = OpenApiValidatorProvider.getValidator();

authencationController.post(
    '/auth/token',
    [validator.validate('post', '/api/v1/auth/token')],
    async (req: Request, res: Response) => {
        const rquid = req.header('X-RqUID') as string;
        debug('<%s> Start get authentication token', rquid);
        try {
            const response = AuthencationService.generateJwt();
            res.status(200).send(response);
        } catch (error) {
            debug('<%s> Auth token failed', rquid);
            HttpUtils.handleError(res, error, rquid);
        }
    },
);

export { authencationController };
