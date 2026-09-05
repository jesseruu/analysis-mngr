import { PutObjectCommandInput } from "@aws-sdk/client-s3";
import { S3Service } from "./S3Service";
import config from "../../config";
import debugLib from 'debug';

const debug = debugLib('api:AttachmentService');

export class AttachmentService {
    public static async generateSignedUrl(fileName: string, fileType: string, rquid: string) {
        debug('<%s> Start to generate signed URL', rquid);
        try {
            const params: PutObjectCommandInput = {
                Bucket: config.bucketName,
                Key: fileName,
                ContentType: fileType
            };
            return await S3Service.getSignedUrl(params, rquid);
        } catch (error) {
            debug(
                '<%s> Error generating signed URL name=%s message=%s', rquid,
                (error as Error)?.name,
                (error as Error)?.message
            );
            throw error;
        }
    }
}