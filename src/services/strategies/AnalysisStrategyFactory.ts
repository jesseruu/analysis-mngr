import { AnalysisStrategy } from '../../interfaces/AnalysisStrategy';
import { FileAnalysisStrategy } from './FileAnalysisStrategy';
import { GithubRepositoryAnalysisStrategy } from './GithubRepositoryAnalysisStrategy';
import { AppError } from '../../utilities/ErrorService';
import debugLib from 'debug';

const debug = debugLib('api:AnalysisStrategyFactory');

export type AnalysisType = 'github' | 'file';

export class AnalysisStrategyFactory {
    public static create(type: AnalysisType): AnalysisStrategy {
        debug('Creating analysis strategy type=%s', type);
        switch (type) {
            case 'github':
                return new GithubRepositoryAnalysisStrategy();
            case 'file':
                return new FileAnalysisStrategy();
            default:
                debug('Unsupported analysis strategy type=%s', type);
                throw new AppError(`Unsupported analysis type: ${type}`, 422);
        }
    }
}
