export type AnalysisRequest = any;

export interface AnalysisStrategy {
    analyze(request: AnalysisRequest, rquid: string): Promise<AnalysisRequest>;
}
