import express from 'express';
const app = express();
import applyRoutes from './routes';
import applyMiddleware from './middleware';

applyMiddleware(app);
applyRoutes(app);

export default app;
