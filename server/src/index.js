import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());
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

// Connect to Mongo BEFORE we start listening; connectDb exits on failure.
await connectDb();

app.listen(PORT, () => {
  console.log(`Stackoff server listening on http://localhost:${PORT}`);
});
