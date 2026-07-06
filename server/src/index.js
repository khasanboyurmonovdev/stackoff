import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDb } from './db.js';
import arenaRouter from './routes/arena.js';
import shareRouter from './routes/share.js';

const app = express();
// Deployed behind Nginx (TLS termination). Trust the first proxy hop so
// req.protocol honors X-Forwarded-Proto (share-card URLs) and express-rate-limit
// keys on the real client IP via X-Forwarded-For instead of the proxy's.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Share unfurl routes go FIRST — before helmet (so the default CSP can't block a
// crawler rendering the card/HTML) and before the rate limiter (so social
// unfurlers aren't throttled). Same spirit as keeping /audio outside the limiter.
app.use('/s', shareRouter);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json());

// Serve the assembled clip audio. server/audio/ holds <clipId>.mp3 produced by
// the pipeline (gitignored). AUDIO_ORIGIN should point here for local dev.
app.use('/audio', express.static(path.resolve(__dirname, '..', 'audio')));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api', arenaRouter);

// Connect to Mongo BEFORE we start listening; connectDb exits on failure.
await connectDb();

app.listen(PORT, () => {
  console.log(`Stackoff server listening on http://localhost:${PORT}`);
});
