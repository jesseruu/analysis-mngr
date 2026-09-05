import {
    S3Client,
    PutObjectCommand,
    PutObjectCommandInput,
    GetObjectCommandInput,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import debugLib from 'debug';

const debug = debugLib('api:S3Service');

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
});

export class S3Service {
    public static async getSignedUrl(params: PutObjectCommandInput, rquid: string) {
        debug('<%s> Generating signed URL bucket=%s key=%s', rquid, params.Bucket, params.Key);
        try {
            const presignedUrl = await getSignedUrl(s3Client, new PutObjectCommand(params), {
                expiresIn: 900,
            });
            return presignedUrl;
        } catch (error) {
            debug(
                '<%s> Signed URL generation failed name=%s message=%s',
                rquid,
                (error as Error)?.name,
                (error as Error)?.message,
            );
            throw error;
        }
    }

    public static async getObject(params: GetObjectCommandInput, rquid: string) {
        debug('<%s> Getting S3 object bucket=%s key=%s', rquid, params.Bucket, params.Key);
        try {
            const response = await s3Client.send(new GetObjectCommand(params));
            debug(
                '<%s> S3 object received bucket=%s key=%s contentLength=%s',
                rquid,
                params.Bucket,
                params.Key,
                response.ContentLength,
            );
            return response;
        } catch (error) {
            debug(
                '<%s> S3 object retrieval failed bucket=%s key=%s name=%s message=%s',
                rquid,
                params.Bucket,
                params.Key,
                (error as Error)?.name,
                (error as Error)?.message,
            );
            throw error;
        }
    }
}
