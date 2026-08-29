import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

declare global {
  // eslint-disable-next-line no-var
  var _murmurMongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

if (!global._murmurMongoose) {
  global._murmurMongoose = { conn: null, promise: null };
}

const cache = global._murmurMongoose;

export async function connectDB(): Promise<typeof mongoose | null> {
  if (cache.conn) return cache.conn;

  if (!MONGODB_URI) {
    console.warn("[Murmur] No MONGODB_URI found. Running in offline/in-memory mode.");
    return null;
  }

  if (!cache.promise) {
    console.log("[Murmur] Connecting to MongoDB Atlas...");
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      // Fast timeout (3 seconds) so local dev doesn't freeze when firewalled
      serverSelectionTimeoutMS: 3000, 
    });
  }

  try {
    cache.conn = await cache.promise;
    console.log("[Murmur] Connected to MongoDB Atlas successfully.");
    return cache.conn;
  } catch (err) {
    console.warn(
      "[Murmur] MongoDB connection failed (likely port 27017 is blocked by firewall). " +
      "Falling back to local in-memory storage."
    );
    cache.promise = null; // reset cache promise to allow retries
    return null;
  }
}
