import { AnalysisRequest, AnalysisStrategy } from '../../interfaces/AnalysisStrategy';
import { RemoteRepositoryService } from '../RemoteRepositoryService';
import { AppError } from '../../utilities/ErrorService';
import { AnalysisCodeService } from '../AnalysisCodeService';
import debugLib from 'debug';

const debug = debugLib('api:GithubRepositoryAnalysisStrategy');

export class GithubRepositoryAnalysisStrategy implements AnalysisStrategy {
    public async analyze(request: AnalysisRequest, rquid: string) {
        const repository = request.requestUrl
            ? RemoteRepositoryService.validateUrl(request.requestUrl)
            : null;

        if (!repository) {
            debug('<%s> Invalid GitHub repository URL', rquid);
            throw new AppError('requestUrl must be a valid GitHub repository URL', 422);
        }

        const { owner, repo } = repository;
        debug('<%s> Starting GitHub analysis owner=%s repo=%s', rquid, owner, repo);

        try {
            const repository = await RemoteRepositoryService.validateRepository(owner, repo, rquid);
            debug(
                '<%s> Repository validated fullName=%s defaultBranch=%s',
                rquid,
                repository.fullName,
                repository.defaultBranch,
            );
            const lenguages = await RemoteRepositoryService.getLanguages(owner, repo, rquid);
            const structure = await RemoteRepositoryService.getRepositoryStructure(
                owner,
                repo,
                repository.defaultBranch,
                rquid,
            );
            debug(
                '<%s> Repository structure analyzed files=%d frameworks=%j',
                rquid,
                structure.files.length,
                structure.frameworks,
            );
            const sourceFiles = await RemoteRepositoryService.getSourceFiles(
                owner,
                repo,
                repository.defaultBranch,
                structure.files,
                rquid,
            );
            const prompt = AnalysisCodeService.preparePrompt(
                {
                    repositoryName: repository.fullName,
                    description: repository.description,
                    frameworks: structure.frameworks,
                    languages: lenguages.languages,
                    sourceFiles,
                },
                rquid,
            );
            const analysis = await AnalysisCodeService.analyzeCode(prompt, rquid);
            debug('<%s> GitHub analysis completed owner=%s repo=%s', rquid, owner, repo);
            return { ...repository, isRemote: true, ...lenguages, structure, analysis };
        } catch (error: any) {
            debug(
                '<%s> GitHub analysis failed owner=%s repo=%s name=%s message=%s',
                rquid,
                owner,
                repo,
                error?.name,
                error?.message,
            );
            throw error;
        }
    }
}
