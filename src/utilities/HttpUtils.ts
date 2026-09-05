import { Response } from 'express';
import { constants } from 'http2';
import debugLib from 'debug';
import { ErrorService } from './ErrorService';

const debug = debugLib('api:HttpUtils');

export class HttpUtils {
    static handleError(res: Response, error: any, rquid?: string): void {
        debug(
            '<%s> Handling error path=%s name=%s message=%s',
            rquid,
            res.req?.path,
            error?.name,
            error?.message ?? error,
        );

        if (error instanceof Error) {
            const errorStatus = ErrorService.replayError(error);
            debug(
                '<%s> Sending error response status=%d path=%s',
                rquid,
                errorStatus.Status.StatusCode,
                res.req?.path,
            );
            res.status(errorStatus.Status.StatusCode).send(errorStatus);
        } else {
            debug('<%s> Sending unknown error response status=500 path=%s', rquid, res.req?.path);
            res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR).send(error);
        }
    }
}
