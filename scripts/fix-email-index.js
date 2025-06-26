// scripts/fix-email-index.js
// Script to remove the email index from MongoDB and clean up email fields

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixEmailIndex() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gam3a5g';
  console.log('Connecting to:', uri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('users');

    // List all indexes
    console.log('Current indexes:');
    const indexes = await collection.indexes();
    console.log(indexes);

    // Check if email index exists
    const emailIndexExists = indexes.some(index => 
      index.key && index.key.email !== undefined
    );

    if (emailIndexExists) {
      console.log('Email index found. Removing...');

      try {
        await collection.dropIndex('email_1');
        console.log('Email index removed successfully!');
      } catch (error) {
        if (error.code === 27) {
          console.log('Email index does not exist (already removed)');
        } else {
          console.error('Error removing email index:', error);
        }
      }
    } else {
      console.log('No email index found');
    }

    // Remove email field from all documents
    console.log('Removing email field from all user documents...');
    const updateResult = await collection.updateMany(
      { email: { $exists: true } },
      { $unset: { email: "" } }
    );
    console.log(`Updated ${updateResult.modifiedCount} documents to remove email field`);

    // Count users with null email
    const nullEmailCount = await collection.countDocuments({ email: null });
    if (nullEmailCount > 0) {
      console.log(`Found ${nullEmailCount} users with null email. Removing null email fields...`);
      const nullUpdateResult = await collection.updateMany(
        { email: null },
        { $unset: { email: "" } }
      );
      console.log(`Removed null email field from ${nullUpdateResult.modifiedCount} documents`);
    }

    // List indexes after removal
    console.log('Indexes after cleanup:');
    const finalIndexes = await collection.indexes();
    console.log(finalIndexes);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
fixEmailIndex().catch(console.error);
