import mongoose from 'mongoose';

// Connect to MongoDB using process.env.MONGO_URI. Logs success/failure and
// exits the process on any failure (missing URI or connection error), so the
// server never starts in a half-wired state.
export async function connectDb() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('[db] MONGO_URI is not set. Add it to server/.env and restart.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { autoIndex: false });
    console.log('[db] Connected to MongoDB');
    return mongoose.connection;
  } catch (err) {
    console.error('[db] Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}
