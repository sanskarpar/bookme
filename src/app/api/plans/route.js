import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

function jsonResponse(data, options = {}) {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  try {
    await client.connect();
    const db = client.db('salon-booking');
    const plansCollection = db.collection('plans');
    
    const plans = await plansCollection.find({}).sort({ order: 1 }).toArray();
    
    // If no plans exist, create default ones
    if (plans.length === 0) {
      const defaultPlans = [
        {
          id: 'founders',
          name: 'Founders Plan',
          price: 0,
          description: 'Alle Features inklusive - Perfekt für den Start',
          features: ['Unbegrenzte Buchungen', 'Analytics', 'Kalender', 'Support'],
          order: 1,
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'startup',
          name: 'Startup Plan',
          price: 29,
          description: 'Basis Features für kleine Salons - Keine Analytics oder Kalender',
          features: ['Basis Buchungen', 'E-Mail Support'],
          order: 2,
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'grow',
          name: 'Grow Plan',
          price: 59,
          description: 'Mit Kalender für wachsende Salons',
          features: ['Erweiterte Buchungen', 'Kalender', 'Prioritäts-Support'],
          order: 3,
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'unicorn',
          name: 'Unicorn Plan',
          price: 99,
          description: 'Premium Features für große Salons mit vollständiger Analytics',
          features: ['Alle Features', 'Premium Analytics', 'Kalender', 'Prioritäts-Support', 'Erweiterte Berichte'],
          order: 4,
          active: true,
          createdAt: new Date().toISOString(),
        },
      ];
      
      await plansCollection.insertMany(defaultPlans);
      return jsonResponse({ success: true, plans: defaultPlans });
    }
    
    return jsonResponse({ success: true, plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return jsonResponse({ error: 'Failed to fetch plans' }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function POST(request) {
  try {
    const { name, price, description, features, order } = await request.json();
    
    if (!name || price === undefined) {
      return jsonResponse({ error: 'Name and price are required' }, { status: 400 });
    }
    
    await client.connect();
    const db = client.db('salon-booking');
    const plansCollection = db.collection('plans');
    
    const newPlan = {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      name,
      price: parseFloat(price),
      description: description || '',
      features: features || [],
      order: order || 999,
      active: true,
      createdAt: new Date().toISOString(),
    };
    
    const result = await plansCollection.insertOne(newPlan);
    
    return jsonResponse({ success: true, plan: { ...newPlan, _id: result.insertedId } });
  } catch (error) {
    console.error('Error creating plan:', error);
    return jsonResponse({ error: 'Failed to create plan' }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function PUT(request) {
  try {
    const { _id, name, price, description, features, order, active } = await request.json();
    
    if (!_id) {
      return jsonResponse({ error: 'Plan ID is required' }, { status: 400 });
    }
    
    await client.connect();
    const db = client.db('salon-booking');
    const plansCollection = db.collection('plans');
    
    const updateData = {
      updatedAt: new Date().toISOString(),
    };
    
    if (name !== undefined) {
      updateData.name = name;
      updateData.id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    if (price !== undefined) updateData.price = parseFloat(price);
    if (description !== undefined) updateData.description = description;
    if (features !== undefined) updateData.features = features;
    if (order !== undefined) updateData.order = order;
    if (active !== undefined) updateData.active = active;
    
    const result = await plansCollection.updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return jsonResponse({ error: 'Plan not found' }, { status: 404 });
    }
    
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating plan:', error);
    return jsonResponse({ error: 'Failed to update plan' }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function DELETE(request) {
  try {
    const { _id } = await request.json();
    
    if (!_id) {
      return jsonResponse({ error: 'Plan ID is required' }, { status: 400 });
    }
    
    await client.connect();
    const db = client.db('salon-booking');
    const plansCollection = db.collection('plans');
    
    const result = await plansCollection.deleteOne({ _id: new ObjectId(_id) });
    
    if (result.deletedCount === 0) {
      return jsonResponse({ error: 'Plan not found' }, { status: 404 });
    }
    
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return jsonResponse({ error: 'Failed to delete plan' }, { status: 500 });
  } finally {
    await client.close();
  }
}
