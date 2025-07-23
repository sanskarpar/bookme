import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { salonUid, customerUid, rating, comment, serviceName, employeeName, bookingId } = body;

    // Validation
    if (!salonUid || !customerUid || !rating || rating < 1 || rating > 5 || !serviceName || !employeeName || !bookingId) {
      return NextResponse.json({ error: "Missing required fields (salon, customer, rating, service, employee, and booking ID required)" }, { status: 400 });
    }

    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    // Check if this specific booking exists and is completed/cancelled
    const bookingsCollection = db.collection("bookings");
    const booking = await bookingsCollection.findOne({
      _id: new ObjectId(bookingId),
      salonUid,
      customerUid,
      status: { $in: ["completed", "cancelled"] }
    });

    if (!booking) {
      await client.close();
      return NextResponse.json({ error: "You can only review services from completed or cancelled bookings" }, { status: 403 });
    }

    // Verify the service and employee combination exists in this booking
    const validServiceEmployee = booking.services?.some((service: any) => 
      service.name === serviceName && service.employee === employeeName
    );

    if (!validServiceEmployee) {
      await client.close();
      return NextResponse.json({ error: "You can only review the specific service and employee from your booking" }, { status: 403 });
    }

    // Get customer and salon details
    const usersCollection = db.collection("users");
    const salonsCollection = db.collection("salons");
    
    const customer = await usersCollection.findOne({ uid: customerUid });
    const salon = await salonsCollection.findOne({ uid: salonUid });

    if (!customer || !salon) {
      await client.close();
      return NextResponse.json({ error: "Customer or salon not found" }, { status: 404 });
    }

    // Check if customer already reviewed this specific service/employee combination for this booking
    const reviewsCollection = db.collection("reviews");
    const existingReview = await reviewsCollection.findOne({
      salonUid,
      customerUid,
      serviceName,
      employeeName,
      bookingId
    });

    if (existingReview) {
      await client.close();
      return NextResponse.json({ error: "You have already reviewed this service and employee for this booking" }, { status: 409 });
    }

    const review = {
      salonUid,
      salonName: salon.name,
      customerUid,
      customerName: customer.name,
      rating: Number(rating),
      comment: comment || "",
      serviceName,
      employeeName,
      bookingId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await reviewsCollection.insertOne(review);
    await client.close();

    return NextResponse.json({ ok: true, reviewId: result.insertedId.toString() });
  } catch (error) {
    console.error('Review creation error:', error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const salonUid = searchParams.get("salonUid");
    const customerUid = searchParams.get("customerUid");
    const serviceName = searchParams.get("serviceName");
    const isSystemAdmin = searchParams.get("systemAdmin") === "true";

    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const reviewsCollection = db.collection("reviews");

    let query: any = {};
    
    if (isSystemAdmin) {
      // System admin can see all reviews across all salons
      // No restrictions applied
    } else {
      if (salonUid) query.salonUid = salonUid;
      if (customerUid) query.customerUid = customerUid;
      if (serviceName) query.serviceName = serviceName;
    }

    const reviews = await reviewsCollection.find(query).sort({ createdAt: -1 }).toArray();
    
    // Calculate average rating if fetching for a salon
    let averageRating = 0;
    if (salonUid && reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      averageRating = Math.round((totalRating / reviews.length) * 10) / 10;
    }
    // Ensure averageRating is always a number with one decimal
    if (!salonUid || reviews.length === 0) {
      averageRating = 0;
    }

    await client.close();

    return NextResponse.json({ 
      reviews, 
      averageRating,
      totalReviews: reviews.length 
    });
  } catch (error) {
    console.error('Review fetch error:', error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { reviewId, customerUid, rating, comment } = body;

    if (!reviewId || !customerUid) {
      return NextResponse.json({ error: "Review ID and customer UID are required" }, { status: 400 });
    }

    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const reviewsCollection = db.collection("reviews");

    const updateFields: any = {
      updatedAt: new Date().toISOString()
    };

    if (rating !== undefined) updateFields.rating = Number(rating);
    if (comment !== undefined) updateFields.comment = comment;

    const result = await reviewsCollection.updateOne(
      { _id: new ObjectId(reviewId), customerUid },
      { $set: updateFields }
    );

    await client.close();

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Review not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, updated: result.modifiedCount > 0 });
  } catch (error) {
    console.error('Review update error:', error);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get("reviewId");
    const customerUid = searchParams.get("customerUid");

    if (!reviewId || !customerUid) {
      return NextResponse.json({ error: "Review ID and customer UID are required" }, { status: 400 });
    }

    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    const reviewsCollection = db.collection("reviews");

    const result = await reviewsCollection.deleteOne({
      _id: new ObjectId(reviewId),
      customerUid
    });

    await client.close();

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Review not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    console.error('Review deletion error:', error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
