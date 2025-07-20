import { MongoClient, ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB;

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }
    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    // Optionally check for existing salon by email
    const existingSalon = await db.collection('salons').findOne({ email: data.email });
    if (existingSalon) {
      await client.close();
      return NextResponse.json({ error: 'Salon already exists' }, { status: 409 });
    }

    const result = await db.collection('salons').insertOne({
      ...data,
      name: data.name,
      description: data.description ?? "",
      location: data.location ?? "",
      googleMapsAddress: data.googleMapsAddress ?? "",
      contact: data.contact ?? "",
      lat: typeof data.lat === "number" ? data.lat : undefined,
      lng: typeof data.lng === "number" ? data.lng : undefined,
      createdAt: new Date(),
    });

    await client.close();
    return NextResponse.json({ success: true, salonId: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function slugify(name: string | undefined) {
  if (!name || typeof name !== "string") return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function GET(request: Request) {
  try {
    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const uid = searchParams.get('uid');
    const email = searchParams.get('email');

    if (name) {
      // Find salon by slugified name
      const salons = await db.collection('salons').find({}).toArray();
      const slug = slugify(name);
      const salon = salons.find(s => slugify(s.name) === slug);
      await client.close();
      if (!salon) {
        return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
      }
      return NextResponse.json({ salon }, { status: 200 });
    }

    if (uid) {
      const salon = await db.collection('salons').findOne({ uid });
      await client.close();
      if (!salon) {
        return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
      }
      return NextResponse.json({ salon }, { status: 200 });
    }

    if (email) {
      const salon = await db.collection('salons').findOne({ email });
      await client.close();
      if (!salon) {
        return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
      }
      return NextResponse.json({ salon }, { status: 200 });
    }

    const salons = await db.collection('salons').find({}).toArray();
    await client.close();
    return NextResponse.json({ salons }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { email, name, imageUrl, imageUrls, description, location, contact, lat, lng, googleMapsAddress, workingDays, holidays, employees } = await req.json();
    if (!email || !name) {
      return NextResponse.json({ error: 'Missing email or name' }, { status: 400 });
    }
    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const salons = db.collection('salons');
    const updateFields: any = { name };
    if (Array.isArray(imageUrls)) {
      updateFields.imageUrls = imageUrls;
    } else if (typeof imageUrl === "string") {
      updateFields.imageUrl = imageUrl;
    }
    if (typeof description === "string") {
      updateFields.description = description;
    }
    if (typeof location === "string") {
      updateFields.location = location;
    }
    if (typeof googleMapsAddress === "string") {
      updateFields.googleMapsAddress = googleMapsAddress;
    }
    if (typeof contact === "string") {
      updateFields.contact = contact;
    }
    if (typeof lat === "number") {
      updateFields.lat = lat;
    }
    if (typeof lng === "number") {
      updateFields.lng = lng;
    }
    if (typeof workingDays === "object") {
      updateFields.workingDays = workingDays;
    }
    if (Array.isArray(holidays)) {
      updateFields.holidays = holidays;
    }
    if (Array.isArray(employees)) {
      updateFields.employees = employees;
    }
    const result = await salons.updateOne(
      { email },
      { $set: updateFields }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }
    
    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    
    const result = await db.collection('salons').deleteOne({ email });
    
    await client.close();
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Custom endpoint for deleting an image and updating salon imageUrls
export async function POST_delete_image(request: Request) {
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
      { $pull: { imageUrls: imageUrl } }
    );

    await client.close();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const config = {
  api: {
    bodyParser: false,
  },
};

export const handlers = {
  "POST /delete-image": POST_delete_image,
};
