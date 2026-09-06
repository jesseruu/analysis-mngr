import dotenv from 'dotenv';
dotenv.config();

export default {
    apiPath: process.env.API_PATH || '/api/v1',
    apiPort: process.env.API_PORT || '',
    githubToken: process.env.GITHUB_TOKEN || '',
    githubApi: process.env.GITHUB_API_PATH || 'https://api.github.com/repos',
    bucketName: process.env.BUCKET_NAME || 'test',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
    jwtSecret: process.env.JWT_SECRET || '',
};
