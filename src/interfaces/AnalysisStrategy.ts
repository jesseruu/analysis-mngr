export interface AnalysisRequest {
    requestUrl: string;
}

export interface AnalysisStrategy {
    analyze(request: AnalysisRequest, rquid: string): Promise<any>;
}