import { MongoClient, ObjectId } from "mongodb";
import { NextResponse } from "next/server";

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB;

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Missing image id" }, { status: 400 });
    }
    const imageId = id;
    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const imageDoc = await db
      .collection("salon_images")
      .findOne({ _id: new ObjectId(imageId) });
    await client.close();

    if (!imageDoc || !imageDoc.image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Extract base64 and content type
    const base64 = imageDoc.image as string;
    // Try to extract content type from data URL, fallback to image/png
    let contentType = "image/png";
    const match = base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    if (match) {
      contentType = match[1];
    }

    // Remove the data URL prefix if present
    const base64Data = base64.replace(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/, "");

    const buffer = Buffer.from(base64Data, "base64");
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
