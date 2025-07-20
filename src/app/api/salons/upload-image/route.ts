import { MongoClient, ObjectId } from "mongodb";
import { NextResponse } from "next/server";

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB;

export async function POST(request: Request) {
  try {
    const { email, images } = await request.json();
    if (!email || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "Missing email or images" }, { status: 400 });
    }
    if (images.length > 8) {
      return NextResponse.json({ error: "Max 8 images allowed" }, { status: 400 });
    }
    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    // Store each image in salon_images collection
    const docs = images.map((img: string) => ({
      email,
      image: img,
      createdAt: new Date(),
    }));
    const result = await db.collection("salon_images").insertMany(docs);

    await client.close();

    // Return URLs for all uploaded images
    const urls = Object.values(result.insertedIds).map(
      (id: ObjectId) => `/api/salons/image/${id}`
    );
    return NextResponse.json({ urls }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
  }
}
