import config from '../../../config';
import { AnalysisRequest, AnalysisStrategy } from '../../interfaces/AnalysisStrategy';
import { AppError } from '../../utilities/ErrorService';
import { AnalysisCodeService } from '../AnalysisCodeService';
import { ExternalRepositoryService } from '../ExternalRepositoryService';
import { S3Service } from '../S3Service';
import debugLib from 'debug';

const debug = debugLib('api:FileAnalysisStrategy');

export class FileAnalysisStrategy implements AnalysisStrategy {
    public async analyze(request: AnalysisRequest, rquid: string): Promise<AnalysisRequest> {
        if (!request.requestUrl) {
            debug('<%s> Missing external repository object key', rquid);
            throw new AppError('requestUrl is required for external repository analysis', 422);
        }

        debug('<%s> Starting external repository analysis key=%s', rquid, request.requestUrl);

        const s3Object = await S3Service.getObject(
            {
                Bucket: config.bucketName,
                Key: request.requestUrl,
            },
            rquid,
        );

        if (!s3Object.Body) {
            debug('<%s> S3 object has no ZIP body key=%s', rquid, request.requestUrl);
            throw new AppError('S3 object has no ZIP body', 422);
        }

        const extractedPath = await ExternalRepositoryService.extractZip(s3Object.Body, rquid);
        debug('<%s> S3 ZIP extracted key=%s', rquid, request.requestUrl);

        try {
            const repository = await ExternalRepositoryService.validateRepository(
                extractedPath,
                rquid,
            );
            const structure = await ExternalRepositoryService.getRepositoryStructure(
                repository.path,
                rquid,
            );
            debug(
                '<%s> External structure analyzed files=%d frameworks=%j',
                rquid,
                structure.files.length,
                structure.frameworks,
            );
            const languages = await ExternalRepositoryService.getLanguages(repository.path, rquid);
            const sourceFiles = await ExternalRepositoryService.getSourceFiles(
                repository.path,
                structure.files,
                rquid,
            );
            const prompt = AnalysisCodeService.preparePrompt(
                {
                    repositoryName: repository.fullName,
                    description: repository.description,
                    frameworks: structure.frameworks,
                    languages: languages.languages,
                    sourceFiles,
                },
                rquid,
            );
            const analysis = await AnalysisCodeService.analyzeCode(prompt, rquid);
            debug(
                '<%s> External repository analysis completed repository=%s',
                rquid,
                repository.name,
            );
            return { ...repository, isRemote: false, ...languages, structure, analysis };
        } catch (error: any) {
            debug(
                '<%s> External repository analysis failed key=%s name=%s message=%s',
                rquid,
                request.requestUrl,
                error?.name,
                error?.message,
            );
            throw error;
        } finally {
            await ExternalRepositoryService.removeExtractedRepository(extractedPath, rquid);
            debug('<%s> Temporary extraction removed key=%s', rquid, request.requestUrl);
        }
    }
}
