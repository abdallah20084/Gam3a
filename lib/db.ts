    // lib/db.ts
    import mongoose from 'mongoose';

    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gam3a5g';

    if (!MONGODB_URI) {
      throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    }

    let cached = global as typeof global & {
      mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
    };

    if (!cached.mongoose) {
      cached.mongoose = { conn: null, promise: null };
    }

    async function connectDB() {
      if (cached.mongoose.conn) {
        console.log('Using existing DB connection');
        return cached.mongoose.conn;
      }

      if (!cached.mongoose.promise) {
        const opts = {
          bufferCommands: false,
        };
        cached.mongoose.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
          return mongoose;
        });
      }
      cached.mongoose.conn = await cached.mongoose.promise;
      console.log('New DB connection established');
      return cached.mongoose.conn;
    }

    export default connectDB;
    