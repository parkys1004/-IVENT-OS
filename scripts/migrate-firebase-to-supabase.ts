import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';

// 1. Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));

let app;
if (!admin.apps || admin.apps.length === 0) {
  let pk = serviceAccount.private_key;
  if (pk && typeof pk === 'string') {
    pk = pk.replace(/\\n/g, '\n');
  }
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: pk,
    })
  });
} else {
  app = admin.app();
}

const db = getFirestore(app, 'ai-studio-be727629-11f3-4124-9c2b-4ccb9d35001b');

// 2. Initialize Supabase Admin (using Service Role Key)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('ERROR: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function parseFirestoreDate(value: any): string {
  if (!value) return new Date().toISOString();
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

// Helper to generate a deterministic UUID-v4-like string from a seed string
// This is not standard but avoids external dependencies
function stringToUuid(str: string): string {
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16), // version 4
    ((parseInt(hash.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.substring(17, 20), // variant 1
    hash.substring(20, 32)
  ].join('-');
}

async function migrate() {
  console.log('🚀 Starting deep migration from Firebase to Supabase...');

  try {
    // --- 1. Migrate Users & Profiles ---
    console.log('📦 Migrating Users & Profiles...');
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users in Firestore.`);

    const userMapping: Record<string, string> = {}; // firebaseId -> supabaseId

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const firebaseId = doc.id;
      const email = data.email || `user_${firebaseId}@example.com`;
      const supabaseId = stringToUuid(firebaseId); // Deterministic UUID based on Firebase ID
      userMapping[firebaseId] = supabaseId;

      console.log(`Processing user: ${email} (${firebaseId} -> ${supabaseId})`);

      // 1a. Create in auth.users if doesn't exist
      // We use the generated UUID as the ID if possible
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        id: supabaseId,
        email: email,
        password: crypto.randomBytes(16).toString('hex'), // Temporary password
        email_confirm: true,
        user_metadata: { firebaseId: firebaseId }
      });

      if (userError) {
        if (userError.message.includes('already registered') || userError.message.includes('already exists')) {
          console.log(`  User ${email} already exists.`);
        } else {
          console.error(`  Error creating user ${email}:`, userError.message);
        }
      }

      // 1b. Upsert Profile
      const profile = {
        id: supabaseId,
        email: email,
        display_name: data.displayName || '',
        photo_url: data.photoURL || '',
        role: data.role || 'participant',
        points: data.points || 0,
        followers_count: data.followersCount || 0,
        priority: data.priority || 0,
        created_at: parseFirestoreDate(data.createdAt)
      };

      const { error: profError } = await supabase.from('profiles').upsert(profile);
      if (profError) {
        console.error(`  Error upserting profile for ${email}:`, profError.message);
      }
    }
    console.log('✅ Profiles and Auth users processed.');

    // --- 2. Migrate Events ---
    console.log('📦 Migrating Events...');
    const eventsSnapshot = await db.collection('events').get();
    console.log(`Found ${eventsSnapshot.size} events in Firestore.`);

    const eventMapping: Record<string, string> = {};

    const events = eventsSnapshot.docs.map(doc => {
      const data = doc.data();
      const firebaseEventId = doc.id;
      const supabaseEventId = stringToUuid(firebaseEventId);
      eventMapping[firebaseEventId] = supabaseEventId;

      return {
        id: supabaseEventId,
        title: data.title || 'Untitled Event',
        description: data.description || '',
        date: parseFirestoreDate(data.date),
        category: data.category || 'others',
        location_name: data.locationName || '',
        status: data.status || 'draft',
        price: data.price || 0,
        capacity: data.capacity || 100,
        host_id: data.hostId ? (userMapping[data.hostId] || null) : null,
        image_url: data.imageUrl || '',
        is_banner: data.isBanner || false,
        is_lesson: data.isLesson || false,
        priority: data.priority || 0,
        likes_count: data.likesCount || 0,
        created_at: parseFirestoreDate(data.createdAt)
      };
    });

    if (events.length > 0) {
      const { error: eventError } = await supabase.from('events').upsert(events);
      if (eventError) throw eventError;
      console.log('✅ Events migrated.');
    }

    // --- 3. Migrate Registrations ---
    console.log('📦 Migrating Registrations...');
    const regsSnapshot = await db.collection('registrations').get();
    console.log(`Found ${regsSnapshot.size} registrations in Firestore.`);

    const registrations = regsSnapshot.docs.map(doc => {
      const data = doc.data();
      const firebaseRegId = doc.id;
      const supabaseRegId = stringToUuid(firebaseRegId);

      const sUserId = data.userId ? userMapping[data.userId] : null;
      const sEventId = data.eventId ? eventMapping[data.eventId] : null;

      if (!sUserId || !sEventId) return null;

      return {
        id: supabaseRegId,
        user_id: sUserId,
        event_id: sEventId,
        status: data.status || 'pending',
        registered_at: parseFirestoreDate(data.registeredAt)
      };
    }).filter(r => r !== null);

    if (registrations.length > 0) {
      const { error: regError } = await supabase.from('registrations').upsert(registrations);
      if (regError) throw regError;
      console.log('✅ Registrations migrated.');
    }

    // --- 4. Migrate Promo Banners (id is text) ---
    console.log('📦 Migrating Promo Banners...');
    const bannersSnapshot = await db.collection('promo_banners').get();
    const banners = bannersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        image_url: data.imageUrl || '',
        link_url: data.linkUrl || '#',
        is_active: data.isActive ?? true,
        updated_at: new Date().toISOString()
      };
    });

    if (banners.length > 0) {
      const { error: banError } = await supabase.from('promo_banners').upsert(banners);
      if (banError) throw banError;
      console.log('✅ Promo banners migrated.');
    }

    // --- 5. Migrate Settings (key is text) ---
    console.log('📦 Migrating Settings...');
    const settingsSnapshot = await db.collection('settings').get();
    const settings = settingsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        key: doc.id,
        value: data.value || {},
        updated_at: new Date().toISOString()
      };
    });

    if (settings.length > 0) {
      const { error: setError } = await supabase.from('settings').upsert(settings);
      if (setError) throw setError;
      console.log('✅ Settings migrated.');
    }

    console.log('🎉 Full migration successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

migrate();
