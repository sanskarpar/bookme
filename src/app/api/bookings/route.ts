import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { salonId, salonUid, customerUid, services, date, time, total, customerName, customerPhone, status = 'confirmed' } = body;

    // Validation
    if (!salonId || !salonUid || !customerUid || !services || !date || !time || total === undefined || !customerName || !customerPhone) {
      return NextResponse.json({ error: "Missing required booking information" }, { status: 400 });
    }

    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const collection = db.collection("bookings");

    const booking = {
      salonId: new ObjectId(salonId),
      salonUid,
      customerUid, // Add customer UID to booking document
      services, // each service now includes employee field
      date,
      time,
      total: Number(total),
      customerName,
      customerPhone,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await collection.insertOne(booking);
    await client.close();

    return NextResponse.json({ 
      ok: true, 
      bookingId: result.insertedId.toString(),
      booking 
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const salonUid = searchParams.get("salonUid");
    const customerUid = searchParams.get("customerUid");
    const bookingId = searchParams.get("bookingId");
    const date = searchParams.get("date");
    const employee = searchParams.get("employee");

    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const collection = db.collection("bookings");

    let query: any = {};

    if (bookingId) {
      query._id = new ObjectId(bookingId);
    } else {
      if (salonUid) query.salonUid = salonUid;
      if (customerUid) query.customerUid = customerUid;
      if (date) query.date = date;
      if (employee) {
        // Only look for bookings where any service is assigned to this employee
        query["services.employee"] = employee;
      }
    }

    const bookings = await collection.find(query).toArray();
    await client.close();

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Booking fetch error:', error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, status, ...updateData } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const collection = db.collection("bookings");

    const updateFields = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    if (status) {
      updateFields.status = status;
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: updateFields }
    );

    await client.close();

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, updated: result.modifiedCount > 0 });
  } catch (error) {
    console.error('Booking update error:', error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const collection = db.collection("bookings");

    const result = await collection.deleteOne({ _id: new ObjectId(bookingId) });
    await client.close();

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    console.error('Booking deletion error:', error);
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
  }
}