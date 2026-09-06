import { Request, Response, Router } from 'express';
import OpenApiValidatorProvider from '../utilities/OpenApiValidatorProvider';
import debugLib from 'debug';
import { AnalysisRequest } from '../interfaces/AnalysisStrategy';
import {
    AnalysisStrategyFactory,
    AnalysisType,
} from '../services/strategies/AnalysisStrategyFactory';
import { HttpUtils } from '../utilities/HttpUtils';
import { AttachmentService } from '../services/AttachmentService';

const debug = debugLib('api:AnalysisController');

const analysisController = Router();
const validator = OpenApiValidatorProvider.getValidator();

analysisController.post(
    '/analyses',
    [validator.validate('post', '/api/v1/analyses')],
    async (req: Request, res: Response) => {
        const rquid = req.header('X-RqUID') as string;
        const { sourceType } = req.body
        debug('<%s> Start to analyze', rquid);
        try {
            
            const strategy = AnalysisStrategyFactory.create(sourceType);
            const result = await strategy.analyze(req.body as AnalysisRequest, rquid);
            res.status(200).send(result);
        } catch (error) {
            debug('<%s> Analysis failed type=%s', rquid, sourceType);
            HttpUtils.handleError(res, error, rquid);
        }
    },
);

analysisController.post(
    '/attachments',
    [validator.validate('post', '/api/v1/attachments')],
    async (req: Request, res: Response) => {
        const rquid = req.header('X-RqUID') as string;
        const { fileName, fileType } = req.body;
        debug('<%s> Start generate attachment url', rquid);
        try {
            const result = await AttachmentService.generateSignedUrl(fileName, fileType, rquid);
            debug('<%s> Url generated correctly', rquid);
            res.status(200).send(result);
        } catch (error) {
            debug('<%s> Attachment URL generation failed', rquid);
            HttpUtils.handleError(res, error, rquid);
        }
    },
);

export { analysisController };
