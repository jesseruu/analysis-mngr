import { OpenApiValidator } from 'express-openapi-validate';
import fs from 'fs';
import path from 'path';
import debugLib from 'debug';

const debug = debugLib('api:OpenApiValidatorProvider');

export default class OpenApiValidatorProvider {
    public static getValidator() {
        debug('Loading OpenAPI specification');
        const openApiSpecificationFile = path.join(
            __dirname,
            '../../static/analysis-mngr-OAS.json',
        );
        const openApiSpecification = fs.readFileSync(openApiSpecificationFile, 'utf-8');
        const openApiDocument = JSON.parse(openApiSpecification);
        const validator = new OpenApiValidator(openApiDocument);
        debug('OpenAPI validator initialized');
        return validator;
    }
}
