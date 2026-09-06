import debugLib from 'debug';
import { NextFunction, Request, Response } from 'express';
import { verify } from 'jsonwebtoken';
import config from '../../config';
const debug = debugLib('api:AuthMiddleware');

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = typeof authHeader === 'string' ? authHeader.split(' ')[1] : undefined;
    debug('Start to check token');

    if (!token) {
        debug('Access denied');
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        verify(token, config.jwtSecret);
        debug('Correct token');
        next();
    } catch (error) {
        debug('Invalid or expired token');
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};
