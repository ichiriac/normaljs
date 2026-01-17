# NormalJS ORM - AI Coding Agent Instructions

## Quick Start Template

When creating a new NormalJS project, **always start with this pattern**:

```javascript
const { Connection, Repository } = require('normaljs');

// 1. Create connection (choose your database)
const conn = new Connection({
  client: 'sqlite3', // or 'pg' for PostgreSQL, 'mysql', 'mssql'
  connection: { filename: ':memory:' } // or real DB config
});

// 2. Create repository (connection managed automatically)
const repo = new Repository(conn);

// 3. Define models as ES6 classes
class Users {
  static _name = 'Users'; // REQUIRED: Registry key
  static table = 'users'; // Optional: defaults to snake_case of _name
  static fields = {
    id: 'primary', // Shorthand for auto-increment primary key
    email: { type: 'string', unique: true, required: true },
    active: { type: 'boolean', default: true },
  };
  
  // Instance methods work on active records
  get domain() {
    return this.email?.split('@')[1];
  }
  
  // Static methods for custom queries (scopes)
  static activeUsers() {
    return this.where({ active: true });
  }
}

// 4. Register models
repo.register(Users);

// 5. Sync schema (development only!)
await repo.sync();

// 6. Use models via repository
const UsersModel = repo.get('Users');
const user = await UsersModel.create({ email: 'test@example.com' });
```

## ✅ DO / ❌ DON'T Checklist

**When defining models:**

✅ **DO:**
- Always include `static _name` (required for registration)
- Use `static fields` object for schema definition
- Add instance methods/getters directly on the class
- Add static methods for custom query scopes
- Use descriptive PascalCase names for models (`Users`, `BlogPosts`)

❌ **DON'T:**
- Never instantiate models with `new Users()` directly
- Don't forget `static _name` (causes registration errors)
- Don't use async getters (use methods instead)
- Don't define fields outside the `static fields` object

**When working with relations:**

✅ **DO:**
```javascript
// Define relations as fields
class Posts {
  static fields = {
    author_id: { type: 'many-to-one', model: 'Users' }, // Creates FK column
    comments: { type: 'one-to-many', foreign: 'Comments.post_id' },
    tags: { type: 'many-to-many', model: 'Tags' }
  };
}

// Load relations explicitly
const post = await Posts.findById(1);
await post.comments.load();
await post.tags.load();

// Use include for eager loading
const post = await Posts.where({ id: 1 }).include('author', 'tags').first();
```

❌ **DON'T:**
```javascript
// Don't try to access unloaded relations
const post = await Posts.findById(1);
console.log(post.comments); // May be undefined if not loaded!

// Don't manually join tables for relations
const query = Posts.query().join('users', 'posts.author_id', 'users.id'); // Use include instead!
```

**When querying:**

✅ **DO:**
```javascript
// Access models via repository
const Users = repo.get('Users');

// Use method chaining
const users = await Users.where({ active: true }).limit(10).orderBy('created_at', 'desc').find();

// Use findById for single records
const user = await Users.findById(1);

// Use first() for single results
const user = await Users.where({ email }).first();

// Use transactions for writes
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  await Users.create({ email: 'test@example.com' });
});
```

❌ **DON'T:**
```javascript
// Don't query without going through repository
const users = await Users.query().find(); // Users is the class, not the model!

// Don't mix transaction contexts
await repo.transaction(async tx => {
  await repo.get('Users').create({ email }); // Wrong! Use tx.get('Users')
});

// Don't use .sync({ force: true }) in production
await repo.sync({ force: true }); // ONLY for development/testing
```

**When handling records:**

✅ **DO:**
```javascript
// Method 1: Direct modification (optimal - persists automatically)
const user = await Users.findById(1);
user.email = 'new@example.com';
user.updated_at = new Date();
// Changes persist automatically on next query or transaction flush

// Method 2: write() with key/value pairs (immediate flush)
const user = await Users.findById(1);
await user.write({ email: 'new@example.com', updated_at: new Date() });

// Delete records
await user.unlink();

// Check for null/undefined
const user = await Users.where({ email }).first();
if (!user) {
  throw new Error('User not found');
}
```

❌ **DON'T:**
```javascript
// Don't use update() method
await user.update({ email: 'new@example.com' }); // Method doesn't exist!

// Don't set properties then call write() without arguments
user.email = 'new@example.com';
await user.write(); // Anti-pattern! Use write({ email: ... }) instead

// Don't use save() method
await user.save(); // Doesn't exist!

// Don't use delete() method
await user.delete(); // Use unlink() instead
```

❌ **DON'T:**
```javascript
// Don't use update() method
await user.update({ email: 'new@example.com' }); // Method doesn't exist!

// Don't use save() method
await user.save(); // Doesn't exist!

// Don't use delete() method
await user.delete(); // Use unlink() instead
```

## Architecture Overview

NormalJS is a full-featured Node.js ORM with active record patterns, built on Knex.js. Core components:

- **Repository**: Model registry and transaction coordinator
- **Model**: Query builder with fluent API, returns active records
- **Record**: Active record instances with lazy field access
- **Connection**: Knex wrapper supporting PostgreSQL/SQLite/MySQL
- **Fields**: Type system with validation, serialization, and relations

## Field Type Reference

```javascript
static fields = {
  // Primary key (shorthand)
  id: 'primary', // → { type: 'number', primary: true, generated: true }
  
  // Basic types (shorthand)
  name: 'string',        // → { type: 'string' }
  age: 'integer',        // → { type: 'integer' }
  price: 'float',        // → { type: 'float' }
  active: 'boolean',     // → { type: 'boolean' }
  bio: 'text',           // → { type: 'text' }
  
  // Full definitions with constraints
  email: { type: 'string', unique: true, required: true, size: 255 },
  count: { type: 'integer', default: 0, index: true },
  score: { type: 'float', precision: 2 },
  metadata: { type: 'json' },
  created_at: { type: 'datetime', default: () => new Date() },
  status: { type: 'enum', values: ['draft', 'published', 'archived'] },
  
  // Relations (create foreign key)
  author_id: { type: 'many-to-one', model: 'Users', cascade: true },
  
  // Relations (virtual - no column)
  posts: { type: 'one-to-many', foreign: 'Posts.author_id' },
  tags: { type: 'many-to-many', model: 'Tags', joinTable: 'posts_tags' }
}
```

## Relation Patterns

**Many-to-One** (belongs to - creates FK column):
```javascript
class Posts {
  static fields = {
    id: 'primary',
    author_id: { type: 'many-to-one', model: 'Users' }, // Creates author_id column
  };
}

// Usage
const post = await Posts.findById(1);
const author = await post.author.load(); // Loads related user

// Change relation - Method 1: Direct modification
post.author_id = newUserId;
// Persists automatically

// Change relation - Method 2: write() with key/value pairs
await post.write({ author_id: newUserId });
```

**One-to-Many** (has many - virtual field):
```javascript
class Users {
  static fields = {
    id: 'primary',
    posts: { type: 'one-to-many', foreign: 'Posts.author_id' }, // No column created
  };
}

// Usage
const user = await Users.findById(1);
await user.posts.load(); // Loads all posts where author_id = user.id
const posts = user.posts.items; // Access loaded collection
```

**Many-to-Many** (auto-creates join table):
```javascript
class Posts {
  static fields = {
    id: 'primary',
    tags: { type: 'many-to-many', model: 'Tags' }, // Creates rel_posts_tags table
  };
}

class Tags {
  static fields = {
    id: 'primary',
    posts: { type: 'many-to-many', model: 'Posts' }, // Same join table
  };
}

// Usage
const post = await Posts.findById(1);
await post.tags.load();
await post.tags.add(tagId); // Add relation
await post.tags.remove(tagId); // Remove relation
await post.tags.set([id1, id2, id3]); // Replace all relations
```

## Query Patterns & Best Practices

```javascript
const Users = repo.get('Users');

// ✅ Find by ID (uses cache when enabled)
const user = await Users.findById(1);

// ✅ Find one by condition
const user = await Users.where({ email: 'test@example.com' }).first();

// ✅ Find many with filters
const users = await Users
  .where({ active: true })
  .where('created_at', '>', new Date('2024-01-01'))
  .orderBy('created_at', 'desc')
  .limit(10)
  .find();

// ✅ Complex JSON criteria
const users = await Users.where({
  and: [
    ['active', '=', true],
    ['age', '>', 18],
    { or: [['role', '=', 'admin'], ['role', '=', 'moderator']] }
  ]
}).find();

// ✅ Eager loading relations
const users = await Users
  .where({ active: true })
  .include('posts', 'profile')
  .find();

// ✅ Count records
const count = await Users.where({ active: true }).count();

// ✅ Request-level caching (60 seconds)
const users = await Users.where({ active: true }).cache(60).find();

// ✅ Create with relations
const post = await Posts.create({
  title: 'Hello World',
  content: 'Post content',
  author_id: userId,
  tags: [tagId1, tagId2] // Automatically creates many-to-many relations
});

// ✅ Update records - Method 1: Direct modification
const user = await Users.findById(1);
user.email = 'new@example.com';
user.updated_at = new Date();
// Persists automatically on next query or transaction flush

// ✅ Update records - Method 2: write() with key/value pairs (immediate)
await user.write({ email: 'new@example.com', updated_at: new Date() });

// ✅ Delete records
await user.unlink();
```

## Transaction Patterns

**Always use transactions for multi-step operations:**

```javascript
// ✅ Correct: Transaction-scoped repository
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const Posts = tx.get('Posts');
  
  const user = await Users.create({ email: 'author@example.com' });
  const post = await Posts.create({
    title: 'First Post',
    author_id: user.id
  });
  
  await post.tags.add(tagId);
  
  // Commits automatically on success, rolls back on error
});

// ❌ Wrong: Mixing contexts
await repo.transaction(async tx => {
  const user = await repo.get('Users').create({ email }); // Uses wrong context!
  const post = await tx.get('Posts').create({ title, author_id: user.id });
});
```

## Model Extension System

Register multiple classes with the same `static _name` to extend models:

```javascript
// Base model (required fields)
class Users {
  static _name = 'Users';
  static fields = {
    id: 'primary',
    email: { type: 'string', required: true }
  };
}

// Extension (adds features without modifying base)
class Users {
  static _name = 'Users'; // Same name merges!
  static fields = {
    picture: 'string', // Additional fields
    profile_url: 'string'
  };
  
  get hasProfile() { // Additional methods
    return !!this.profile_url;
  }
  
  static verified() { // Additional scopes
    return this.where({ verified: true });
  }
}

repo.register(Users); // Register base
repo.register(Users); // Register extension - merges into one model
```

## Development Workflow

**Setup**: `npm install` → Models use in-memory SQLite by default (no external DB needed)

**Testing**: `npm test` (Jest + SQLite in-memory), `npm run test:watch`, `npm run test:coverage`

**Demo Examples**:

- `demo/blog/` - Users/Posts/Tags/Comments with relations
- `demo/crm/` - Business workflow models
- `demo/stocks/` - Inventory/warehouse models
- Run: `cd demo/blog && node index.js`

## Key Implementation Details

- **Lazy Loading**: Queries select only `id` by default for performance; access other fields triggers batch loading
- **Transaction Isolation**: `repo.transaction(async tx => {...})` provides transaction-scoped repository
- **Schema Sync**: `await repo.sync()` creates/updates tables from model fields
- **Active Records**: Query results are wrapped instances with methods/getters, not plain objects

## Field Type Reference

- `"primary"` → `{ type: "number", primary: true, generated: true }`
- `"string"`, `"number"`, `"boolean"`, `"datetime"` → Basic types
- `{ default: () => new Date() }` → App-level defaults (not DB defaults)
- `{ enum: ["val1", "val2"] }` → App-level validation (not DB enum)

## Testing Conventions

- All tests use SQLite in-memory: `new Connection({ client: 'sqlite3', connection: { filename: ':memory:' } })`
- Register demo models from `demo/*/models/` for integration testing
- Use `repo.sync({ force: true })` to reset schema between tests
