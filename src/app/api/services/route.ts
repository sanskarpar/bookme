import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB;

function slugify(name: string | undefined) {
  if (!name || typeof name !== "string") return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function POST(req: NextRequest) {
  const { action } = Object.fromEntries(new URL(req.url).searchParams.entries());
  const body = await req.json();
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);
  const collection = db.collection("service");

  if (action === "add") {
    const { name, description, price, pricePerBlock, priceBlockSize, duration, imageUrl, uid, serviceType, durationPrices } = body;
    if (!uid) {
      await client.close();
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    // Get salon name from salons collection
    const salonsCollection = db.collection("salons");
    const salon = await salonsCollection.findOne({ uid });
    const salonName = salon?.name || "Unknown Salon";

    const doc = { 
      name, 
      description, 
      price: price !== undefined ? Number(price) : undefined,
      pricePerBlock: pricePerBlock !== undefined ? Number(pricePerBlock) : undefined,
      priceBlockSize: priceBlockSize !== undefined ? Number(priceBlockSize) : undefined,
      duration: Number(duration), 
      imageUrl, 
      uid, 
      salonName, 
      serviceType,
      durationPrices
    };
    await collection.insertOne(doc);
    await client.close();
    return NextResponse.json({ ok: true });
  }
  if (action === "edit") {
    const { _id, uid, serviceType, ...rest } = body;
    if (!_id || !uid) {
      await client.close();
      return NextResponse.json({ error: "Missing _id or uid" }, { status: 400 });
    }
    
    // Ensure numeric fields are properly converted
    const updateData: any = { ...rest, uid, serviceType };
    if (updateData.price !== undefined) updateData.price = Number(updateData.price);
    if (updateData.pricePerBlock !== undefined) updateData.pricePerBlock = Number(updateData.pricePerBlock);
    if (updateData.priceBlockSize !== undefined) updateData.priceBlockSize = Number(updateData.priceBlockSize);
    if (updateData.duration !== undefined) updateData.duration = Number(updateData.duration);
    
    await collection.updateOne(
      { _id: new ObjectId(_id), uid },
      { $set: updateData }
    );
    await client.close();
    return NextResponse.json({ ok: true });
  }
  if (action === "delete") {
    const { _id, uid } = body;
    if (!_id || !uid) {
      await client.close();
      return NextResponse.json({ error: "Missing _id or uid" }, { status: 400 });
    }
    await collection.deleteOne({ _id: new ObjectId(_id), uid });
    await client.close();
    return NextResponse.json({ ok: true });
  }
  await client.close();
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  const uids = searchParams.getAll("uids");
  const isSystemAdmin = searchParams.get("systemAdmin") === "true";

  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);
  const collection = db.collection("service");

  let services;
  if (isSystemAdmin) {
    // System admin can see all services across all salons
    services = await collection.find({}).toArray();
  } else if (uid) {
    services = await collection.find({ uid }).toArray();
  } else if (uids.length > 0) {
    services = await collection.find({ uid: { $in: uids } }).toArray();
  } else {
    services = await collection.find({}).toArray();
  }

  await client.close();
  return NextResponse.json({ services });
}

