const { Connection, Repository } = require('../../dist/index');

// Import mixins
const Timestampable = require('./models/Timestampable');
const SoftDeletable = require('./models/SoftDeletable');

// Import models
const User = require('./models/User');
const Document = require('./models/Document');

async function main() {
  console.log('=== NormalJS Mixins Demo ===\n');
  
  // Setup connection and repository
  const conn = new Connection({
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true
  });
  
  const repo = new Repository(conn);
  
  // Register mixins first
  repo.register(Timestampable);
  repo.register(SoftDeletable);
  
  // Register models
  repo.register(User);
  repo.register(Document);
  
  // Sync schema
  await repo.sync({ force: true });
  
  // Get models
  const Users = repo.get('User');
  const Documents = repo.get('Document');
  
  console.log('1. Testing Timestampable Mixin');
  console.log('================================\n');
  
  // Create a user (timestamps are automatically set)
  const user = await Users.create({
    email: 'john@example.com',
    name: 'John Doe'
  });
  
  console.log(`Created user: ${user.displayName}`);
  console.log(`  created_at: ${user.created_at.toISOString()}`);
  console.log(`  updated_at: ${user.updated_at.toISOString()}`);
  
  // Wait a bit to see the timestamp difference
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Update the user (updated_at is automatically updated)
  await user.write({ name: 'Jane Doe' });
  
  console.log(`\nUpdated user: ${user.displayName}`);
  console.log(`  created_at: ${user.created_at.toISOString()}`);
  console.log(`  updated_at: ${user.updated_at.toISOString()}`);
  console.log('  (Note: updated_at changed, created_at stayed the same)\n');
  
  console.log('2. Testing SoftDeletable Mixin');
  console.log('================================\n');
  
  // Create a document
  const doc = await Documents.create({
    title: 'Important Document',
    content: 'This is important content.',
    author_id: user.id
  });
  
  console.log(`Created document: ${doc.title}`);
  console.log(`  id: ${doc.id}`);
  console.log(`  deleted_at: ${doc.deleted_at}`);
  console.log(`  isDeleted: ${doc.isDeleted}\n`);
  
  // Soft delete the document
  await doc.unlink();
  
  console.log('After soft delete:');
  console.log(`  deleted_at: ${doc.deleted_at?.toISOString()}`);
  console.log(`  isDeleted: ${doc.isDeleted}\n`);
  
  // Try to find the document (should not be found due to default scope)
  const foundDoc = await Documents.where({ id: doc.id }).first();
  console.log(`Document found with normal query: ${foundDoc !== null}`);
  
  // Find with unscoped (bypasses default scope)
  const unscopedDoc = await Documents.unscoped().where({ id: doc.id }).first();
  console.log(`Document found with unscoped query: ${unscopedDoc !== null}\n`);
  
  // Restore the document
  await unscopedDoc.restore();
  
  console.log('After restore:');
  console.log(`  deleted_at: ${unscopedDoc.deleted_at}`);
  console.log(`  isDeleted: ${unscopedDoc.isDeleted}\n`);
  
  // Now it should be found with normal queries
  const restoredDoc = await Documents.where({ id: doc.id }).first();
  console.log(`Document found after restore: ${restoredDoc !== null}\n`);
  
  console.log('3. Testing Hard Delete');
  console.log('================================\n');
  
  // Soft delete again
  await restoredDoc.unlink();
  console.log('Soft deleted again');
  
  // Get the document via unscoped
  const docToDelete = await Documents.unscoped().where({ id: doc.id }).first();
  
  // Hard delete (actually remove from database)
  await docToDelete.forceUnlink();
  console.log('Hard deleted (removed from database)');
  
  // Try to find with unscoped (should not be found)
  const finalCheck = await Documents.unscoped().where({ id: doc.id }).first();
  console.log(`Document found after hard delete: ${finalCheck !== null}\n`);
  
  console.log('4. Testing Combined Mixins');
  console.log('================================\n');
  
  // Create another document to show both mixins working together
  const doc2 = await Documents.create({
    title: 'Test Document',
    content: 'Testing timestamps + soft delete',
    author_id: user.id
  });
  
  console.log(`Created document: ${doc2.title}`);
  console.log(`  created_at: ${doc2.created_at.toISOString()}`);
  console.log(`  updated_at: ${doc2.updated_at.toISOString()}`);
  console.log(`  deleted_at: ${doc2.deleted_at}\n`);
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Update it
  await doc2.write({ title: 'Updated Test Document' });
  
  console.log('After update:');
  console.log(`  created_at: ${doc2.created_at.toISOString()}`);
  console.log(`  updated_at: ${doc2.updated_at.toISOString()}`);
  console.log('  (updated_at changed automatically)\n');
  
  // Soft delete it
  await doc2.unlink();
  
  console.log('After soft delete:');
  console.log(`  deleted_at: ${doc2.deleted_at?.toISOString()}`);
  console.log(`  isDeleted: ${doc2.isDeleted}\n`);
  
  console.log('=== Demo Complete ===');
  
  await conn.destroy();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;
