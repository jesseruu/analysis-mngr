import express from 'express';
import cors from 'cors';
import config from './config';
import morgan from 'morgan';
import { analysisController } from './src/controllers/AnalysisController';

const app = express();
const port = config.apiPort;
const apiPath = config.apiPath;

const corsOptions = {
    origin: '*',
    credencials: true,
    optionsSuccessStatus: 200,
};

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors(corsOptions));
app.use(
    morgan('combined', {
        skip: (_req, res) => res.statusCode < 400,
    }),
);

app.use(apiPath, analysisController);

app.listen(port, () => {
    console.log(`Analysis mngr listening at port ${port}`);
});

export default app;
