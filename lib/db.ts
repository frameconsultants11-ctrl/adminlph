import { MongoClient, Db } from "mongodb"

const uri = process.env.MONGODB_URI!

if (!uri) {
  throw new Error("MONGODB_URI is not defined")
}

const client = new MongoClient(uri)

let db: Db

export async function getDb(): Promise<Db> {
  if (!db) {
    await client.connect()
    db = client.db("learnPerHour")
  }

  return db
}