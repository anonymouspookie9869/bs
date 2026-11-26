import 'dotenv/config';
import { createBaseExpressApp } from '../src/server/app.ts';

// Vercel Serverless Function entrypoint for /api/* routes
const app = createBaseExpressApp();

export default app;
