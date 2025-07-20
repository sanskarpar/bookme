import { MongoClient, ObjectId } from "mongodb";
import { NextResponse } from "next/server";

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB;

export async function POST(request: Request) {
  try {
    const { email, imageId } = await request.json();
    if (!email || !imageId) {
      return NextResponse.json({ error: "Missing email or imageId" }, { status: 400 });
    }
    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    // Remove image from salon_images
    await db.collection("salon_images").deleteOne({ _id: new ObjectId(imageId), email });

    // Remove image URL from salon's imageUrls array
    const imageUrl = `/api/salons/image/${imageId}`;
    await db.collection("salons").updateOne(
      { email },
      { $pull: { imageUrls: imageUrl } } as any
    );

    await client.close();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}