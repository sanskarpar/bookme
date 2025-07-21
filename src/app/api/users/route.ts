import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const uid = searchParams.get("uid");

    if (!email && !uid) {
      return NextResponse.json({ error: "Email or UID is required" }, { status: 400 });
    }

    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const collection = db.collection("users");

    let query: any = {};
    if (email) query.email = email;
    if (uid) query.uid = uid;

    const user = await collection.findOne(query);
    await client.close();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      uid: user.uid,
      email: user.email,
      role: user.role,
      name: user.name,
      createdAt: user.createdAt 
    });
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
