import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;

/**
 * Cache the client across hot reloads (dev) and serverless invocations (Vercel)
 * so we don't exhaust the connection pool.
 */
declare global {
  // eslint-disable-next-line no-var
  var _tallyMongo: Promise<MongoClient> | undefined;
}

function clientPromise(): Promise<MongoClient> {
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!global._tallyMongo) {
    global._tallyMongo = new MongoClient(uri, { maxPoolSize: 10 }).connect();
  }
  return global._tallyMongo;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db("tally");
}

export const isDbConfigured = Boolean(uri);
