---
id: crud-operations
title: CRUD Operations
keywords: [create, read, update, delete, crud, records]
---

# CRUD Operations

## Create a Record

```js
const Users = repo.get('Users');

// ✅ Simple create
const user = await Users.create({
  email: 'john@example.com',
  name: 'John Doe'
});

// ✅ Create with default values
const user = await Users.create({
  email: 'jane@example.com'
  // 'active' field uses default: true
  // 'created_at' uses default: () => new Date()
});

// ❌ DON'T: Create without transaction for important data
const user = await Users.create({ email }); // Risky if part of larger operation

// ✅ DO: Use transactions for important creates
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const user = await Users.create({ email, name });
});
```

## Read Records

```js
const Users = repo.get('Users');

// ✅ Find by ID (uses cache if enabled)
const user = await Users.findById(1);
if (!user) {
  throw new Error('User not found');
}

// ✅ Find one by criteria
const user = await Users.where({ email: 'john@example.com' }).first();

// ✅ Find many with filters
const activeUsers = await Users
  .where({ active: true })
  .orderBy('created_at', 'desc')
  .limit(20)
  .find();

// ✅ Find with multiple conditions
const users = await Users
  .where({ active: true })
  .where('created_at', '>', lastWeek)
  .find();

// ✅ Check if exists
const exists = await Users.where({ email }).count() > 0;
```

## Update Records

```js
const Users = repo.get('Users');

// ✅ Method 1: Direct modification (optimal for auto-persist)
const user = await Users.findById(1);
user.name = 'Jane Smith';
user.updated_at = new Date();
// Changes persist automatically on next query or transaction flush

// ✅ Method 2: write() with key/value pairs (immediate flush)
const user = await Users.findById(1);
await user.write({ 
  name: 'Jane Smith',
  updated_at: new Date()
});

// ✅ Update with validation
const user = await Users.findById(1);
if (user.role !== 'admin') {
  await user.write({ email: newEmail });
}

// ❌ DON'T: Bulk update using Knex directly (bypasses hooks!)
await Users.query()
  .where('last_login', '<', sixMonthsAgo)
  .update({ active: false }); // Bypasses validation, hooks, NormalJS internals!

// ✅ DO: Use transaction with individual updates (hooks run correctly)
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const users = await Users.where('last_login', '<', sixMonthsAgo).find();
  for (const user of users) {
    await user.write({ active: false });
  }
});

// ❌ DON'T: Use update() method
await user.update({ email: 'new@example.com' }); // Method doesn't exist!

// ❌ DON'T: Modify then call write() without arguments
user.email = 'new@example.com';
await user.write(); // Anti-pattern!

// ✅ DO: Use one of the two correct methods
user.email = 'new@example.com'; // Direct (auto-persists)
// OR
await user.write({ email: 'new@example.com' }); // Immediate flush
```

## Delete Records

```js
const Users = repo.get('Users');

// ✅ Delete single record
const user = await Users.findById(1);
await user.unlink();

// ✅ Delete with check
const user = await Users.where({ email }).first();
if (user && !user.is_protected) {
  await user.unlink();
}

// ❌ DON'T: Bulk delete using Knex directly (bypasses hooks!)
await Users.query()
  .where('created_at', '<', oneYearAgo)
  .where('active', false)
  .delete(); // Bypasses hooks and cascade logic!

// ✅ DO: Use transaction with individual deletes (hooks run correctly)
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const users = await Users
    .where('created_at', '<', oneYearAgo)
    .where('active', false)
    .find();
  for (const user of users) {
    await user.unlink();
  }
});
```
