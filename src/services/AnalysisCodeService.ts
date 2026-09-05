import Anthropic from '@anthropic-ai/sdk';
import config from '../../config';
import { CodeAnalysisPromptInput, CodeAnalysisResult } from '../interfaces/IAnalysisCode';
import { AppError } from '../utilities/ErrorService';
import debugLib from 'debug';

const debug = debugLib('api:AnalysisCodeService');

const anthropic = new Anthropic({
    apiKey: config.anthropicApiKey,
});

export class AnalysisCodeService {
    public static preparePrompt(input: CodeAnalysisPromptInput, rquid: string): string {
        debug(
            '<%s> Preparing analysis prompt repository=%s frameworks=%d languages=%d sourceFiles=%d',
            rquid,
            input.repositoryName,
            input.frameworks.length,
            Object.keys(input.languages).length,
            input.sourceFiles.length,
        );
        const source = input.sourceFiles
            .map((file) => `### ${file.path}\n\`\`\`\n${file.content}\n\`\`\``)
            .join('\n\n');

        return [
            'You are a senior software engineer performing a repository analysis.',
            'Return only valid JSON. Do not wrap it in Markdown fences or add explanatory text.',
            'Use exactly these keys: summary, detectedArchitecture, risks, recommendations, detectedPatterns.',
            'detectedArchitecture must describe the architecture pattern found in the repository. If none is detected, use exactly "No architecture detected".',
            'risks, recommendations, and detectedPatterns must be arrays of strings.',
            'For the recommendations and risks give evidence of the files for example to improve.',
            `Repository: ${input.repositoryName}`,
            `Description: ${input.description ?? 'Not provided'}`,
            `Frameworks: ${input.frameworks.join(', ') || 'Unknown'}`,
            `Languages by percentage: ${JSON.stringify(input.languages)}`,
            'Source files:',
            source || 'No source files were available.',
        ].join('\n\n');
    }

    public static async analyzeCode(prompt: string, rquid: string): Promise<CodeAnalysisResult> {
        debug(
            '<%s> Starting Anthropic analysis model=%s promptCharacters=%d',
            rquid,
            config.anthropicModel,
            prompt.length,
        );
        if (!config.anthropicApiKey) {
            debug('<%s> Anthropic analysis rejected because API key is not configured', rquid);
            throw new AppError('ANTHROPIC_API_KEY is not configured', 500);
        }

        try {
            const response = await anthropic.messages.create({
                model: config.anthropicModel,
                max_tokens: 2000,
                temperature: 0.2,
                messages: [{ role: 'user', content: prompt }],
            });

            const text = response.content
                .filter((block) => block.type === 'text')
                .map((block) => block.text)
                .join('');
            debug('<%s> Anthropic response received textCharacters=%d', rquid, text.length);
            const result = AnalysisCodeService.parseAnalysis(text, rquid);
            debug(
                '<%s> Anthropic response parsed risks=%d recommendations=%d patterns=%d architecture=%s',
                rquid,
                result.risks.length,
                result.recommendations.length,
                result.detectedPatterns.length,
                result.detectedArchitecture,
            );
            return result;
        } catch (error) {
            const anthropicError = error as {
                status?: number;
                name?: string;
                message?: string;
            };
            const statusCode =
                anthropicError.status === 401 || anthropicError.status === 403
                    ? anthropicError.status
                    : 502;
            debug(
                '<%s> Anthropic analysis failed status=%d name=%s message=%s',
                rquid,
                statusCode,
                anthropicError.name,
                anthropicError.message,
            );

            throw new AppError(
                `Anthropic request failed (${anthropicError.name ?? 'UnknownError'}): ${anthropicError.message ?? 'Request failed'}`,
                statusCode,
            );
        }
    }

    public static parseAnalysis(text: string, rquid = 'unknown'): CodeAnalysisResult {
        debug('<%s> Parsing analysis response textCharacters=%d', rquid, text.length);
        const jsonText = text
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();

        try {
            const parsed = JSON.parse(jsonText) as Partial<CodeAnalysisResult>;

            if (
                typeof parsed.summary !== 'string' ||
                (parsed.detectedArchitecture !== undefined &&
                    typeof parsed.detectedArchitecture !== 'string') ||
                !Array.isArray(parsed.risks) ||
                !Array.isArray(parsed.recommendations) ||
                !Array.isArray(parsed.detectedPatterns)
            ) {
                throw new Error('Missing required analysis fields');
            }

            const result = {
                summary: parsed.summary,
                detectedArchitecture:
                    parsed.detectedArchitecture?.trim() || 'No architecture detected',
                risks: parsed.risks.filter((item): item is string => typeof item === 'string'),
                recommendations: parsed.recommendations.filter(
                    (item): item is string => typeof item === 'string',
                ),
                detectedPatterns: parsed.detectedPatterns.filter(
                    (item): item is string => typeof item === 'string',
                ),
            };
            debug(
                '<%s> Analysis JSON validated architecture=%s',
                rquid,
                result.detectedArchitecture,
            );
            return result;
        } catch {
            debug('<%s> Analysis JSON parsing failed', rquid);
            throw new AppError('Anthropic returned invalid analysis JSON', 502);
        }
    }
}
