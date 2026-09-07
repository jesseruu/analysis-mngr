import config from '../../config';
import { sign } from 'jsonwebtoken';

export class AuthencationService {
    static generateJwt() {
        return sign({}, config.jwtSecret, { expiresIn: '45m' });
    }
}
