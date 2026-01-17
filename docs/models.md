---
id: models
title: Models Reference
keywords: [models, schema, definition, class, fields, relations, queries, active record]
---

# Models

NormalJS models are ES6 classes that declare metadata via static properties. They map to database tables, expose a fluent query API, and return active record instances (objects with getters/methods).

## Quick Reference

✅ **DO:**
- Always include `static _name` (required for registration)
- Use `static fields` for schema definition
- Add instance methods/getters for computed properties
- Add static methods for custom query scopes
- Use transactions for multi-step operations

❌ **DON'T:**
- Never instantiate with `new ModelClass()`
- Don't forget `static _name` 
- Don't modify record properties directly (use `update()`)
- Don't access relations without loading them first
- Don't use `sync({ force: true })` in production

## Basic Model Definition

### Minimal Example

```js
class Users {
  static _name = 'Users'; // REQUIRED: Registry key
  static table = 'users'; // Optional: DB table (defaults to snake_case of _name)
  static cache = 300; // Optional: Enable cache with 300s TTL

  static fields = {
    id: 'primary', // Auto-increment primary key
    email: { type: 'string', unique: true, required: true },
    active: { type: 'boolean', default: true },
    created_at: { type: 'datetime', default: () => new Date() },
  };

  // Instance methods work on active records
  get isStaff() {
    return this.email?.endsWith('@example.com');
  }
  
  // Static methods for query scopes
  static activeUsers() {
    return this.where({ active: true });
  }
}

// Register the model
repo.register(Users);

// Access via repository
const Users = repo.get('Users');
```

### Model Properties

| Property | Required | Description | Example |
|----------|----------|-------------|---------|
| `static _name` | ✅ Yes | Registry key for the model | `'Users'`, `'BlogPosts'` |
| `static table` | ❌ No | Database table name | `'users'`, `'blog_posts'` |
| `static fields` | ✅ Yes | Field definitions | `{ id: 'primary', ... }` |
| `static cache` | ❌ No | Cache TTL (seconds) or `true` for default (300s) | `300`, `true`, `false` |
| `static indexes` | ❌ No | Index definitions | `['email', ['name', 'age']]` |

### Field Types

Quick reference (see [Fields](fields) for complete documentation):

```js
static fields = {
  // Primary key (shorthand)
  id: 'primary', // Auto-increment integer PK
  
  // Basic types
  name: 'string',           // VARCHAR(255)
  age: 'integer',           // INTEGER
  price: 'float',           // FLOAT/DOUBLE
  active: 'boolean',        // BOOLEAN
  bio: 'text',              // TEXT
  data: 'json',             // JSON/JSONB
  created: 'datetime',      // DATETIME/TIMESTAMP
  birthday: 'date',         // DATE
  
  // With constraints
  email: { type: 'string', unique: true, required: true, size: 255 },
  count: { type: 'integer', default: 0, index: true },
  score: { type: 'float', precision: 2 },
  status: { type: 'enum', values: ['draft', 'published', 'archived'] },
  
  // Relations
  author_id: { type: 'many-to-one', model: 'Users' }, // FK column
  posts: { type: 'one-to-many', foreign: 'Posts.author_id' }, // Virtual
  tags: { type: 'many-to-many', model: 'Tags' } // Auto join table
}
```

## Defining Relations

### Many-to-One (Belongs To)

Creates a foreign key column on the current model.

```js
// ✅ Correct: Define many-to-one relation
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    author_id: { type: 'many-to-one', model: 'Users' }, // Creates FK column
  };
}

// Usage
const post = await Posts.findById(1);
await post.author.load(); // Load related user
console.log(post.author.email);

// Change relation - Method 1: Direct modification
post.author_id = newUserId;
// Persists automatically

// Change relation - Method 2: write() with key/value pairs
await post.write({ author_id: newUserId });
```

### One-to-Many (Has Many)

- `Model.query()` returns a query builder proxy. Chain any Knex method (e.g., `where`, `join`, `limit`, `orderBy`).
- `Model.where(...)` is a shorthand for `Model.query().where(...)`.
- `await Model.findById(id)` resolves an active record by id (uses in-memory identity map and cache when enabled).
- `await Model.firstWhere(cond)` returns the first matching record.
- **NEW**: `Model.scope(...)` applies predefined query scopes. See [Scopes](./scopes.md) for details.
- **NEW**: `Model.unscoped()` bypasses the default scope if defined.

```js
// ✅ Correct: Define one-to-many relation
class Users {
  static _name = 'Users';
  static fields = {
    id: 'primary',
    email: 'string',
    posts: { type: 'one-to-many', foreign: 'Posts.author_id' }, // Virtual field
  };
}

## Scopes

Scopes provide a way to define reusable, composable query filters at the model level:

```js
class Users {
  static _name = 'Users';
  static fields = {
    id: 'primary',
    email: { type: 'string', unique: true },
    active: { type: 'boolean', default: true },
    verified: { type: 'boolean', default: false },
  };

  // Define reusable scopes
  static scopes = {
    active: {
      where: { active: true },
    },
    verified: {
      where: { verified: true },
    },
  };

  // Default scope applied to all queries
  static defaultScope = {
    where: { active: true },
  };
}

// Usage
const activeUsers = await repo.Users.scope('active');
const verifiedActive = await repo.Users.scope('active', 'verified');
const allUsers = await repo.Users.unscoped(); // Bypass defaultScope
```

For a comprehensive guide on scopes, including parameterized scopes, caching, and eager loading, see [docs/scopes.md](./scopes.md).

## Creating and flushing

// Query with filters
const publishedPosts = await user.posts.where({ published: true });
```

### Many-to-Many

Automatically creates a join table.

```js
// ✅ Correct: Define many-to-many relation
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    tags: { type: 'many-to-many', model: 'Tags' }, // Auto-creates rel_posts_tags
  };
}

class Tags {
  static _name = 'Tags';
  static fields = {
    id: 'primary',
    name: 'string',
    posts: { type: 'many-to-many', model: 'Posts' }, // Same join table
  };
}

// Usage
const post = await Posts.findById(1);

// Load relations
await post.tags.load();
post.tags.items.forEach(tag => console.log(tag.name));

// Manage relations
await post.tags.add(tagId);        // Add a tag
await post.tags.remove(tagId);     // Remove a tag
await post.tags.set([id1, id2]);   // Replace all tags

// Create with relations
const post = await Posts.create({
  title: 'Hello World',
  tags: [tagId1, tagId2] // Automatically creates relations
});
```

### Common Relation Patterns

```js
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    content: 'text',
    
    // Many-to-one relations (FK columns)
    author_id: { type: 'many-to-one', model: 'Users' },
    category_id: { type: 'many-to-one', model: 'Categories', cascade: true },
    
    // One-to-many relations (virtual)
    comments: { type: 'one-to-many', foreign: 'Comments.post_id' },
    
    // Many-to-many relations (join table)
    tags: { type: 'many-to-many', model: 'Tags', joinTable: 'posts_tags' }
  };
}
```

## Querying Models

### Basic Queries

```js
const Users = repo.get('Users');

// ✅ Find by ID (uses cache)
const user = await Users.findById(1);

// ✅ Find one by condition
const user = await Users.where({ email: 'john@example.com' }).first();

// ❌ DON'T: Forget to check for null
const user = await Users.where({ email }).first();
console.log(user.name); // May throw if user is null!

// ✅ DO: Always check for null
const user = await Users.where({ email }).first();
if (!user) {
  throw new Error('User not found');
}

// ✅ Find many with filters
const users = await Users
  .where({ active: true })
  .orderBy('created_at', 'desc')
  .limit(10)
  .find();

// ✅ Count records
const count = await Users.where({ active: true }).count();

// ✅ Check existence
const exists = await Users.where({ email }).count() > 0;
```

### Complex Filters

```js
const Posts = repo.get('Posts');

// ✅ Multiple conditions (AND)
const posts = await Posts
  .where({ published: true })
  .where('views', '>', 1000)
  .where('created_at', '>=', lastMonth)
  .find();

// ✅ JSON criteria with OR
const posts = await Posts.where({
  and: [
    ['published', '=', true],
    {
      or: [
        ['featured', '=', true],
        ['views', '>', 1000]
      ]
    }
  ]
}).find();

// ✅ LIKE queries
const posts = await Posts
  .where('title', 'like', '%tutorial%')
  .find();

// ✅ IN queries
const posts = await Posts
  .whereIn('category_id', [1, 2, 3])
  .find();
```

### Eager Loading Relations

```js
const Posts = repo.get('Posts');

// ✅ Load single relation
const posts = await Posts
  .where({ published: true })
  .include('author')
  .find();

// ✅ Load multiple relations
const post = await Posts
  .where({ id: 1 })
  .include('author', 'tags', 'comments')
  .first();

// ❌ DON'T: Access unloaded relations
const post = await Posts.findById(1);
console.log(post.author.name); // May be undefined!

// ✅ DO: Load relations first
const post = await Posts
  .where({ id: 1 })
  .include('author')
  .first();
console.log(post.author.name);

// ✅ OR: Lazy load
const post = await Posts.findById(1);
await post.author.load();
console.log(post.author.name);
```

### Custom Query Scopes

```js
// ✅ Add static methods for reusable queries
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    published: 'boolean',
    featured: 'boolean',
    views: 'integer'
  };
  
  // Query scope for published posts
  static published() {
    return this.where({ published: true });
  }
  
  // Query scope for popular posts
  static popular(minViews = 1000) {
    return this.where('views', '>=', minViews);
  }
  
  // Combine scopes
  static trending() {
    return this.published()
      .where({ featured: true })
      .orderBy('views', 'desc');
  }
}

// Usage
const Posts = repo.get('Posts');
const trendingPosts = await Posts.trending().limit(10).find();
const popularPublished = await Posts.published().popular(5000).find();
```

## Creating and Updating Records

### Create Records

```js
const Users = repo.get('Users');

// ✅ Simple create
const user = await Users.create({
  email: 'john@example.com',
  name: 'John Doe'
});

// ❌ DON'T: Create without transaction for multi-step ops
const user = await Users.create({ email });
const profile = await Profiles.create({ user_id: user.id }); // Not atomic!

// ✅ DO: Use transactions
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const Profiles = tx.get('Profiles');
  
  const user = await Users.create({ email });
  await Profiles.create({ user_id: user.id });
});

// ✅ Create with relations
const post = await Posts.create({
  title: 'Hello World',
  author_id: userId,
  tags: [tagId1, tagId2] // Creates many-to-many relations
});
```

### Update Records

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

// ❌ DON'T: Use update() method
const user = await Users.findById(1);
await user.update({ email: 'new@example.com' }); // Method doesn't exist!

// ❌ DON'T: Modify then call write() without arguments
user.email = 'new@example.com';
await user.write(); // Anti-pattern!

// ✅ DO: Choose one of the two correct methods
user.email = 'new@example.com'; // Direct (auto-persists)
// OR
await user.write({ email: 'new@example.com' }); // Immediate flush

// ❌ DON'T: Bulk update using Knex directly (bypasses hooks!)
await Users.query()
  .where('last_login', '<', sixMonthsAgo)
  .update({ active: false }); // Bypasses all hooks and validation!

// ✅ DO: Load records and update individually in transaction
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const users = await Users.where('last_login', '<', sixMonthsAgo).find();
  for (const user of users) {
    await user.write({ active: false });
  }
});
```

### Delete Records

```js
const Users = repo.get('Users');

// ✅ Delete a record
const user = await Users.findById(1);
await user.unlink();

// ❌ DON'T: Use delete()
await user.delete(); // Wrong method!

// ✅ DO: Use unlink()
await user.unlink();

// ❌ DON'T: Bulk delete using Knex directly (bypasses hooks!)
await Users.query()
  .where('created_at', '<', oneYearAgo)
  .delete(); // Bypasses cascade logic and hooks!

// ✅ DO: Load records and delete individually in transaction
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const users = await Users.where('created_at', '<', oneYearAgo).find();
  for (const user of users) {
    await user.unlink();
  }
});
```

## Instance Methods and Getters

### Adding Computed Properties

```js
class Users {
  static _name = 'Users';
  static fields = {
    id: 'primary',
    email: 'string',
    first_name: 'string',
    last_name: 'string'
  };
  
  // ✅ Instance getter for computed values
  get fullName() {
    return `${this.first_name} ${this.last_name}`.trim();
  }
  
  // ✅ Instance getter with logic
  get domain() {
    return this.email?.split('@')[1];
  }
  
  // ❌ DON'T: Use async getters
  async get postCount() { // Invalid!
    return await this.posts.count();
  }
  
  // ✅ DO: Use async methods instead
  async getPostCount() {
    return await this.posts.count();
  }
}

// Usage
const user = await Users.findById(1);
console.log(user.fullName); // Synchronous getter
const count = await user.getPostCount(); // Async method
```

### Lifecycle Hooks

```js
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    slug: 'string',
    updated_at: 'datetime'
  };
  
  // ✅ Pre-create hook (before insert)
  async pre_create() {
    if (!this.slug) {
      this.slug = this.title.toLowerCase().replace(/\s+/g, '-');
    }
  }
  
  // ✅ Post-create hook (after insert)
  async post_create() {
    console.log(`Post ${this.id} created`);
    // Send notification, update cache, etc.
  }
  
  // ✅ Pre-update hook (before update)
  async pre_update() {
    this.updated_at = new Date();
  }
  
  // ✅ Post-update hook (after update)
  async post_update() {
    console.log(`Post ${this.id} updated`);
  }
  
  // ✅ Pre-validate hook (for validation)
  async pre_validate() {
    if (this.title && this.title.length < 3) {
      throw new Error('Title must be at least 3 characters');
    }
  }
}
```

## Indexes and Unique Constraints

### Simple Indexes

```js
class Articles {
  static _name = 'Articles';
  static fields = {
    id: 'primary',
    title: { type: 'string', required: true },
    slug: { type: 'string', required: true, unique: true }, // Unique index
    published: { type: 'boolean', default: false, index: true }, // Simple index
  };

  // ✅ Additional composite indexes
  static indexes = [
    ['title', 'published'], // Composite index
    'slug' // Single-field index (if not already defined in fields)
  ];
}
```

### Advanced syntax (object)

For full control, use an object where keys are index names and values are configuration objects:

```js
class Users {
  static _name = 'Users';
  static fields = {
    id: 'primary',
    email: { type: 'string', required: true },
    company: { type: 'string', required: true },
    status: { type: 'string', required: true },
    deleted_at: { type: 'datetime', required: false },
  };

  static indexes = {
    idx_email_company: {
      fields: ['email', 'company'],
      unique: true, // Enforce uniqueness
    },
    idx_active_users: {
      fields: ['status'],
      predicate: {
        // Partial index (PostgreSQL/SQLite)
        deleted_at: { isNull: true },
      },
    },
    idx_hash_example: {
      fields: ['email'],
      type: 'hash', // Index type (hash, btree)
    },
  };
}
```

### Configuration options

Each index definition supports the following options:

- **`fields`** (required): Array of field names to include in the index
- **`unique`**: Boolean, default `false`. Creates a unique index
- **`type`**: Index type (`'hash'`, `'btree'`, etc.). Supported types vary by database
- **`storage`**: Storage method (e.g., `'FULLTEXT'` for MySQL). Cannot be combined with `unique`
- **`predicate`**: Filtering criteria for partial indexes (see below). Supported by PostgreSQL and SQLite
- **`deferrable`**: Constraint deferrable mode: `'deferred'`, `'immediate'`, or `'not deferrable'`
- **`useConstraint`**: Boolean, default `false`. When `true` with `unique`, creates a unique constraint instead of a unique index

### Partial indexes

Partial indexes include only rows matching a predicate. Use NormalJS filtering syntax:

```js
static indexes = {
  idx_high_priority_tasks: {
    fields: ['title'],
    predicate: {
      priority: { gte: 8 },
      completed_at: { isNull: true }
    }
  }
}
```

Supported predicate operators:

- `{ isNull: true }` / `{ notNull: true }`
- `{ eq: value }` / `{ ne: value }`
- `{ gt: value }` / `{ gte: value }` / `{ lt: value }` / `{ lte: value }`

**Note**: Partial indexes are only supported by PostgreSQL and SQLite. On other databases, a warning is logged and the predicate is ignored.

### Field-level vs model-level indexes

You can still use field-level `index: true` and `unique: true` for simple cases:

```js
static fields = {
  email: { type: 'string', unique: true },  // Field-level unique
}
```

Model-level indexes are recommended for:

- Composite indexes (multiple fields)
- Partial indexes with predicates
- Custom index types or storage methods

### Notes

- Index names are auto-generated or taken from the object key
- Very long index names are automatically truncated and hashed to fit database limits (typically 60-63 characters)
- Field names are resolved to column names (respects `column` option)
- Cannot index computed fields (fields with `stored: false`)
- During schema sync, unique constraint violations are logged but don't stop migration
- Indexes are created/updated/dropped automatically during `repo.sync()`

## Model extension (merging definitions)

You can register multiple classes with the same `static _name` to extend a model across files or modules. Field declarations are merged; methods/getters are added to the active record class.

```js
// Base
class Users {
  static _name = 'Users';
  static fields = { id: 'primary' };
}

// Extension (adds fields + methods)
class UsersEx {
  static _name = 'Users';
  static fields = { picture: 'string' };
  get profileUrl() {
    return `https://cdn/p/${this.picture}`;
  }
}

repo.register(Users);
repo.register(UsersEx); // merged into a single model
```

Notes:

- If any of the registered classes declares `static cache = true|number`, the model’s cache TTL is set accordingly.
- If a class declares `static abstract = true`, the model becomes abstract (cannot be instantiated directly).

## Mixins (compose from other models)

A model can declare `static mixins = ['OtherModel', 'CommonBehavior']` to compose fields and behavior from other registered models. During initialization:

- the mixin model’s fields are merged
- the mixin’s active record class is chained so its instance methods/getters are available

```js
class Auditable {
  static _name = 'Auditable';
  static fields = { created_at: 'datetime', updated_at: 'datetime' };
}
class Posts {
  static _name = 'Posts';
  static mixins = ['Auditable'];
  static fields = { id: 'primary', title: 'string' };
}

repo.register(Auditable);
repo.register(Posts);
```

## Inheritance (class-table inheritance)

A child model can inherit from a parent using `static inherits = 'ParentModel'`. This implements class-table inheritance:

- The parent model gets a special reference column `_inherit` that stores the concrete subtype name.
- Creating a child first inserts into the parent table (with `_inherit` set), then inserts into the child table with the same `id`.
- The parent’s common fields live on the parent table; the child’s extra fields live on the child table.

```js
class Documents {
  static _name = 'Documents';
  static fields = {
    id: 'primary',
    title: 'string',
  };
}
class Invoices {
  static _name = 'Invoices';
  static inherits = 'Documents';
  static fields = { total: 'float' };
}

repo.register(Documents);
repo.register(Invoices);
```

Caveats:

- Only single inheritance is supported (one parent).
- Ensure both parent and child are registered before syncing.

## Caching behavior

- Enable per-model caching by setting `static cache = true` (default TTL 300s) or `static cache = <seconds>`.
- Repository-level cache must be enabled via environment variables; see `src/Repository.js` for full configuration (engine selection, sizing, metrics, cluster peers, etc.).
- Lookup batching optimizes id access; Request wrappers select only `id` on reads when caching is enabled to keep queries lightweight.

## Table naming and sync

- Table names default to a snake_cased version of the model name (no pluralization).
- `await repo.sync({ force: true })` creates or updates tables and relations based on model fields.
- Many-to-many join tables are auto-created as `rel_<left>_<right>` (lexicographic by table name) unless `joinTable` is specified.

## Tips

- Keep model classes small; move business logic into methods/getters on the active record when it directly relates to the entity.
- Use mixins for reusable field/method bundles (timestamps, soft-delete, auditing).
- Prefer many-to-one for FKs; expose one-to-many only on the parent side to avoid duplicate state.
- When caching is enabled, remember that writes in a transaction are flushed to cache after commit by the repository.
