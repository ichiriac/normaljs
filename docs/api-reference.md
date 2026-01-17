---
id: api-reference
title: API Reference
keywords: [api, reference, methods, classes, documentation]
---

# API Reference

Complete API documentation for NormalJS classes and methods.

## Connection

### `new Connection(config)`

Creates a Knex database connection instance.

**Parameters:**
- `config` (object): Knex configuration object
  - `client` (string): Database client ('pg', 'mysql2', 'sqlite3', 'mssql')
  - `connection` (object or string): Connection details or connection string
  - `pool` (object): Connection pool settings
    - `min` (number): Minimum pool size (default: 2)
    - `max` (number): Maximum pool size (default: 10)
  - `debug` (boolean): Enable query logging (default: false)

**Returns:** Connection instance

**Example:**
```js
const conn = new Connection({
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'postgres',
    password: 'secret'
  },
  pool: { min: 2, max: 10 }
});
```

**Note:** Connection is managed automatically by transactions. No need to call `connect()` or `disconnect()`.

---

## Repository

### `new Repository(connection)`

Creates a repository instance for managing models and transactions.

**Parameters:**
- `connection` (Connection): Knex connection instance

**Returns:** Repository instance

**Example:**
```js
const repo = new Repository(conn);
```

### `repo.register(...models)`

Registers one or more model classes with the repository.

**Parameters:**
- `...models` (Class): One or more model classes to register

**Returns:** void

**Example:**
```js
repo.register(Users);
repo.register(Users, Posts, Tags); // Multiple at once
```

### `repo.get(name)`

Retrieves a registered model by its name.

**Parameters:**
- `name` (string): Model name (from `static _name` property)

**Returns:** Model class instance

**Throws:** Error if model not found in registry

**Example:**
```js
const Users = repo.get('Users');
const Posts = repo.get('Posts');
```

### `repo.transaction(callback)`

Executes operations within a database transaction. Automatically commits on success or rolls back on error.

**Parameters:**
- `callback` (Function): Async function receiving transaction-scoped repository
  - `tx` (Repository): Transaction-scoped repository

**Returns:** Promise resolving to callback return value

**Example:**
```js
const result = await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const Posts = tx.get('Posts');
  
  const user = await Users.create({ email: 'test@example.com' });
  const post = await Posts.create({ title: 'Hello', author_id: user.id });
  
  return { user, post };
});
```

### `repo.sync(options)`

Synchronizes database schema from model definitions. **Use only in development!**

**Parameters:**
- `options` (object): Sync options
  - `force` (boolean): Drop and recreate all tables (default: false)

**Returns:** Promise`Promise<void>`lt;void`Promise<void>`gt;

**Warning:** Never use in production! Use database migrations instead.

**Example:**
```js
// Development only!
await repo.sync({ force: true });
```

### `repo.get_context(key, defaultValue)`

Retrieves a context value from the repository.

**Parameters:**
- `key` (string): Context key to retrieve
- `defaultValue` (any, optional): Value to return if key doesn't exist

**Returns:** any - The context value or default value

**Example:**
```js
// Set context
repo.set_context('tenant_id', 'tenant-123');
repo.set_context('user_role', 'admin');

// Get context
const tenantId = repo.get_context('tenant_id'); // 'tenant-123'
const locale = repo.get_context('locale', 'en-US'); // Returns default 'en-US'
```

### `repo.set_context(key, value)`

Sets a context value in the repository.

**Parameters:**
- `key` (string): Context key
- `value` (any): Value to store

**Returns:** Repository instance (chainable)

**Example:**
```js
// Store multi-tenancy context
repo.set_context('tenant_id', 'tenant-123');

// Store user context
repo.set_context('current_user_id', 999);
repo.set_context('current_user_role', 'admin');

// Store feature flags
repo.set_context('feature_new_ui', true);

// Store request metadata
repo.set_context('request_id', 'req-abc123');
repo.set_context('request_timestamp', new Date());
```

**Use Cases:**
- Multi-tenancy: Store tenant ID for filtering queries
- User context: Track current user for audit trails
- Feature flags: Enable/disable features at runtime
- Request metadata: Store request ID, timestamp, locale
- Configuration: Runtime settings without global variables

**Transaction Behavior:**
- Transactions inherit parent context at creation
- Changes in transactions are isolated (don't affect parent)
- Context is accessible from models and records within the transaction

---

## Model - Query Methods

All query methods are chainable and return a query builder until a terminal method is called.

### `Model.findById(id)`

Finds a single record by primary key. Uses cache if enabled.

**Parameters:**
- `id` (number or string): Primary key value

**Returns:** Promise resolving to Record or null

**Example:**
```js
const user = await Users.findById(1);
if (!user) {
  throw new Error('User not found');
}
```

### `Model.where(criteria, [operator], [value])`

Adds WHERE conditions to the query. Can be called multiple times to add AND conditions.

**Signatures:**
1. `where(object)` - Object with field/value pairs
2. `where(field, value)` - Field equals value
3. `where(field, operator, value)` - Field with operator

**Parameters:**
- `criteria` (object or string): Filter criteria or field name
- `operator` (string): Comparison operator (`=`, `>`, `<`, `>=`, `<=`, `!=`, `like`, `in`, `is`, `is not`)
- `value` (any): Comparison value

**Returns:** Query builder (chainable)

**Examples:**
```js
// Object syntax
const users = await Users.where({ active: true, role: 'admin' }).find();

// Field/value syntax
const users = await Users.where('active', true).find();

// Field/operator/value syntax
const users = await Users.where('age', '>', 18).find();

// Multiple conditions (AND)
const users = await Users
  .where({ active: true })
  .where('created_at', '>', lastWeek)
  .find();

// JSON criteria (complex AND/OR)
const users = await Users.where({
  and: [
    ['active', '=', true],
    {
      or: [
        ['role', '=', 'admin'],
        ['role', '=', 'moderator']
      ]
    }
  ]
}).find();
```

### `Model.whereIn(field, values)`

Filters records where field is in array of values.

**Parameters:**
- `field` (string): Field name
- `values` (array): Array of values

**Returns:** Query builder (chainable)

**Example:**
```js
const users = await Users.whereIn('role', ['admin', 'moderator']).find();
```

### `Model.orderBy(field, direction)`

Adds ORDER BY clause. Can be called multiple times for multi-column sorting.

**Parameters:**
- `field` (string): Field name
- `direction` (string): Sort direction ('asc' or 'desc', default: 'asc')

**Returns:** Query builder (chainable)

**Example:**
```js
// Single order
const users = await Users.orderBy('created_at', 'desc').find();

// Multiple orders
const users = await Users
  .orderBy('role', 'asc')
  .orderBy('created_at', 'desc')
  .find();
```

### `Model.limit(count)`

Limits the number of results returned.

**Parameters:**
- `count` (number): Maximum number of records

**Returns:** Query builder (chainable)

**Example:**
```js
const recentPosts = await Posts
  .orderBy('created_at', 'desc')
  .limit(10)
  .find();
```

### `Model.offset(count)`

Skips the specified number of records (for pagination).

**Parameters:**
- `count` (number): Number of records to skip

**Returns:** Query builder (chainable)

**Example:**
```js
// Page 2, 20 items per page
const page = 2;
const perPage = 20;
const users = await Users
  .limit(perPage)
  .offset((page - 1) * perPage)
  .find();
```

### `Model.include(...relations)`

Eager loads related records to avoid N+1 queries.

**Parameters:**
- `...relations` (string): One or more relation names

**Returns:** Query builder (chainable)

**Example:**
```js
// Single relation
const users = await Users.include('posts').find();

// Multiple relations
const posts = await Posts
  .include('author', 'tags', 'comments')
  .find();

// Access loaded relations
posts.forEach(post => {
  console.log(post.author.name);
  console.log(post.tags.items.length);
});
```

### `Model.cache(ttl)`

Enables request-level caching for this query.

**Parameters:**
- `ttl` (number): Cache time-to-live in seconds (0 to disable)

**Returns:** Query builder (chainable)

**Example:**
```js
// Cache for 60 seconds
const users = await Users
  .where({ active: true })
  .cache(60)
  .find();

// Disable cache for this query
const users = await Users.where({ active: true }).cache(0).find();
```

### `Model.find()`

Executes the query and returns an array of records. Terminal method.

**Returns:** Promise`Promise<Record[]>`lt;Record[]`Promise<Record[]>`gt;

**Example:**
```js
const users = await Users
  .where({ active: true })
  .orderBy('created_at', 'desc')
  .limit(10)
  .find();

console.log(`Found ${users.length} users`);
```

### `Model.first()`

Executes the query and returns the first record or null. Terminal method.

**Returns:** Promise resolving to Record or null

**Example:**
```js
const user = await Users.where({ email: 'john@example.com' }).first();
if (!user) {
  throw new Error('User not found');
}
```

### `Model.count()`

Returns the count of records matching the query. Terminal method.

**Returns:** Promise`Promise<number>`lt;number`Promise<number>`gt;

**Example:**
```js
const activeCount = await Users.where({ active: true }).count();
const total = await Users.count();

console.log(`${activeCount} of ${total} users are active`);
```

### `Model.create(data)`

Creates a new record in the database.

**Parameters:**
- `data` (object): Field values for the new record

**Returns:** Promise`Promise<Record>`lt;Record`Promise<Record>`gt;

**Example:**
```js
const user = await Users.create({
  email: 'john@example.com',
  name: 'John Doe',
  active: true
});

console.log(`Created user with ID: ${user.id}`);

// With relations (many-to-many)
const post = await Posts.create({
  title: 'Hello World',
  author_id: userId,
  tags: [tagId1, tagId2] // Automatically creates relations
});
```

### `Model.query()`

Returns the underlying Knex query builder for advanced operations.

**Returns:** Knex query builder

**Warning:** Using Knex directly bypasses NormalJS hooks, validation, and cache invalidation. Use with caution.

**Example:**
```js
// Advanced query with Knex
const count = await Users.query()
  .where('created_at', '>', lastMonth)
  .andWhere(function() {
    this.where('role', 'admin').orWhere('role', 'moderator');
  })
  .count('* as total')
  .first();
```

### `Model.get_context(key, defaultValue)`

Gets a context value from the repository.

**Parameters:**
- `key` (string): Context key to retrieve
- `defaultValue` (any, optional): Value to return if key doesn't exist

**Returns:** any - The context value or default value

**Example:**
```js
const Users = repo.get('Users');

// Get context from model
const tenantId = Users.get_context('tenant_id');

// Use in model methods
class Users {
  static async findForCurrentTenant() {
    const tenantId = this.get_context('tenant_id');
    return this.where({ tenant_id: tenantId }).find();
  }
}
```

### `Model.set_context(key, value)`

Sets a context value in the repository.

**Parameters:**
- `key` (string): Context key
- `value` (any): Value to store

**Returns:** Model instance (chainable)

**Example:**
```js
const Users = repo.get('Users');

// Set context from model
Users.set_context('last_query_time', new Date());
```

---

## Record - Instance Methods

Methods available on individual record instances.

### `record.write(data)`

Updates record fields and immediately flushes changes to the database.

**Parameters:**
- `data` (object): Key/value pairs to update

**Returns:** Promise`Promise<void>`lt;void`Promise<void>`gt;

**Example:**
```js
const user = await Users.findById(1);

// Update multiple fields
await user.write({
  email: 'newemail@example.com',
  name: 'New Name',
  updated_at: new Date()
});
```

**Note:** For simple updates, you can also modify properties directly (changes auto-persist):
```js
user.email = 'newemail@example.com';
// Auto-persists on next query or transaction flush
```

### `record.unlink()`

Deletes the record from the database.

**Returns:** Promise`Promise<void>`lt;void`Promise<void>`gt;

**Example:**
```js
const user = await Users.findById(1);
await user.unlink();

console.log('User deleted');
```

### `record.get_context(key, defaultValue)`

Gets a context value from the repository.

**Parameters:**
- `key` (string): Context key to retrieve
- `defaultValue` (any, optional): Value to return if key doesn't exist

**Returns:** any - The context value or default value

**Example:**
```js
const user = await Users.findById(1);

// Get context from record
const tenantId = user.get_context('tenant_id');

// Use in hooks
class Users {
  async pre_create() {
    const currentUserId = this.get_context('current_user_id');
    this.created_by = currentUserId;
  }
}
```

### `record.set_context(key, value)`

Sets a context value in the repository.

**Parameters:**
- `key` (string): Context key
- `value` (any): Value to store

**Returns:** Record instance (chainable)

**Example:**
```js
const user = await Users.findById(1);

// Set context from record
user.set_context('last_accessed_user_id', user.id);
```

---

## Record - Relation Methods

Methods available on relation collections (one-to-many and many-to-many).

### `record.relation.load()`

Loads the relation collection from the database.

**Returns:** Promise`Promise<void>`lt;void`Promise<void>`gt;

**Example:**
```js
const user = await Users.findById(1);

// Load posts
await user.posts.load();

// Access items
console.log(`User has ${user.posts.items.length} posts`);
user.posts.items.forEach(post => {
  console.log(post.title);
});
```

### `record.relation.where(criteria)`

Filters the relation query before loading.

**Parameters:**
- `criteria` (object): Filter criteria

**Returns:** Promise`Promise<Record[]>`lt;Record[]`Promise<Record[]>`gt;

**Example:**
```js
const user = await Users.findById(1);

// Get only published posts
const publishedPosts = await user.posts.where({ published: true });

console.log(`User has ${publishedPosts.length} published posts`);
```

### `record.relation.add(id)`

Adds a relation (many-to-many or one-to-many).

**Parameters:**
- `id` (number or Record): Related record ID or record instance

**Returns:** Promise`Promise<void>`lt;void`Promise<void>`gt;

**Example:**
```js
const post = await Posts.findById(1);

// Add a tag (many-to-many)
await post.tags.add(tagId);
await post.tags.add(tagObject);

console.log('Tag added to post');
```

### `record.relation.remove(id)`

Removes a relation (many-to-many or one-to-many).

**Parameters:**
- `id` (number or Record): Related record ID or record instance

**Returns:** Promise`Promise<void>`lt;void`Promise<void>`gt;

**Example:**
```js
const post = await Posts.findById(1);

// Remove a tag
await post.tags.remove(tagId);

console.log('Tag removed from post');
```

### `record.relation.set(ids)`

Replaces all relations with the specified IDs.

**Parameters:**
- `ids` (number[]): Array of related record IDs

**Returns:** Promise`Promise<void>`lt;void`Promise<void>`gt;

**Example:**
```js
const post = await Posts.findById(1);

// Replace all tags
await post.tags.set([tag1Id, tag2Id, tag3Id]);

// Clear all tags
await post.tags.set([]);

console.log('Tags updated');
```

### `record.relation.items`

Access array of loaded relation records.

**Type:** Record[]

**Note:** Only available after calling `.load()` or using `.include()`

**Example:**
```js
const user = await Users
  .where({ id: 1 })
  .include('posts')
  .first();

// Access loaded items
console.log(user.posts.items.length);
user.posts.items.forEach(post => {
  console.log(post.title);
});
```

---

## Model Definition - Static Properties

Properties used when defining model classes.

### `static _name` (required)

Registry name for the model. **Required for registration.**

**Type:** string

**Example:**
```js
class Users {
  static _name = 'Users'; // Required!
}
```

### `static table`

Database table name. Defaults to snake_case of `_name`.

**Type:** string

**Default:** Snake case of `_name`

**Example:**
```js
class BlogPosts {
  static _name = 'BlogPosts';
  static table = 'blog_posts'; // Optional: defaults to 'blog_posts'
}
```

### `static fields`

Field definitions for the model schema.

**Type:** object

**Example:**
```js
class Users {
  static fields = {
    id: 'primary',
    email: { type: 'string', unique: true, required: true },
    name: 'string',
    age: { type: 'integer', default: 0 },
    active: { type: 'boolean', default: true },
    created_at: { type: 'datetime', default: () => new Date() }
  };
}
```

See [Field Types](fields) for complete field options.

### `static cache`

Entry-level cache TTL in seconds. Enables automatic caching for `findById()`.

**Type:** number

**Default:** 0 (disabled)

**Example:**
```js
class Countries {
  static cache = 3600; // Cache entries for 1 hour
}
```

### `static cacheInvalidation`

Enable automatic cache invalidation on writes.

**Type:** boolean

**Default:** false

**Example:**
```js
class Users {
  static cache = 300;
  static cacheInvalidation = true; // Clear cache on update/delete
}
```

---

## Model Definition - Lifecycle Hooks

Methods called during record lifecycle. Define these as methods on your model class.

### `async pre_create()`

Called before a record is created.

**Context:** `this` is the record being created

**Example:**
```js
class Users {
  async pre_create() {
    // Validate email
    if (!this.email.includes('@')) {
      throw new Error('Invalid email format');
    }
    
    // Set defaults
    this.created_at = new Date();
  }
}
```

### `async post_create()`

Called after a record is created.

**Context:** `this` is the newly created record (has ID)

**Example:**
```js
class Users {
  async post_create() {
    console.log(`User ${this.id} created: ${this.email}`);
    
    // Trigger side effects
    await sendWelcomeEmail(this.email);
  }
}
```

### `async pre_update()`

Called before a record is updated.

**Context:** `this` is the record being updated

**Example:**
```js
class Users {
  async pre_update() {
    // Auto-update timestamp
    this.updated_at = new Date();
    
    // Validate changes
    if ('email' in this._changes) {
      if (!this.email.includes('@')) {
        throw new Error('Invalid email format');
      }
    }
  }
}
```

### `async post_update()`

Called after a record is updated.

**Context:** `this` is the updated record

**Example:**
```js
class Users {
  async post_update() {
    console.log(`User ${this.id} updated`);
    
    // Invalidate related caches
    if ('email' in this._changes) {
      await cache.del(`user:${this.id}:profile`);
    }
  }
}
```

### `async pre_delete()`

Called before a record is deleted.

**Context:** `this` is the record being deleted

**Example:**
```js
class Users {
  async pre_delete() {
    // Prevent deletion of protected users
    if (this.is_protected) {
      throw new Error('Cannot delete protected user');
    }
    
    console.log(`Deleting user ${this.id}`);
  }
}
```

### `async post_delete()`

Called after a record is deleted.

**Context:** `this` is the deleted record (still has data)

**Example:**
```js
class Users {
  async post_delete() {
    console.log(`User ${this.id} deleted`);
    
    // Clean up related resources
    await deleteUserFiles(this.id);
  }
}
```

---

## Field Types Reference

Quick reference for field type definitions.

### Shorthand Types

```js
static fields = {
  id: 'primary',      // Auto-increment primary key
  name: 'string',     // VARCHAR(255)
  age: 'integer',     // INTEGER
  price: 'float',     // FLOAT
  active: 'boolean',  // BOOLEAN
  bio: 'text',        // TEXT
}
```

### Full Definitions

```js
static fields = {
  // String with constraints
  email: { 
    type: 'string', 
    size: 255, 
    unique: true, 
    required: true,
    index: true 
  },
  
  // Integer with default
  count: { 
    type: 'integer', 
    default: 0,
    index: true 
  },
  
  // Float with precision
  price: { 
    type: 'float', 
    precision: 2 
  },
  
  // Boolean with default
  active: { 
    type: 'boolean', 
    default: true 
  },
  
  // DateTime with default
  created_at: { 
    type: 'datetime', 
    default: () => new Date() 
  },
  
  // JSON field
  metadata: { 
    type: 'json' 
  },
  
  // Enum (app-level validation)
  status: { 
    type: 'enum', 
    values: ['draft', 'published', 'archived'] 
  },
  
  // Many-to-one (creates FK column)
  author_id: { 
    type: 'many-to-one', 
    model: 'Users',
    cascade: true 
  },
  
  // One-to-many (virtual field)
  posts: { 
    type: 'one-to-many', 
    foreign: 'Posts.author_id' 
  },
  
  // Many-to-many (auto join table)
  tags: { 
    type: 'many-to-many', 
    model: 'Tags',
    joinTable: 'posts_tags' // Optional custom name
  }
}
```

See [Field Types](fields) for complete documentation.

---

## Error Handling

Common errors and how to handle them.

### Model Not Found

```js
try {
  const Users = repo.get('Users');
} catch (err) {
  console.error('Model not registered:', err.message);
}
```

### Record Not Found

```js
const user = await Users.findById(999);
if (!user) {
  throw new Error('User not found');
}
```

### Validation Errors

```js
try {
  const user = await Users.create({ name: 'John' }); // Missing required 'email'
} catch (err) {
  console.error('Validation failed:', err.message);
}
```

### Transaction Errors

```js
try {
  await repo.transaction(async tx => {
    const Users = tx.get('Users');
    await Users.create({ email: 'test@example.com' });
    throw new Error('Something went wrong');
  });
} catch (err) {
  console.error('Transaction rolled back:', err.message);
}
```

### Unique Constraint Violations

```js
try {
  await Users.create({ email: 'existing@example.com' });
} catch (err) {
  if (err.code === 'SQLITE_CONSTRAINT' || err.code === '23505') {
    throw new Error('Email already exists');
  }
  throw err;
}
```

---

## Best Practices

### ✅ DO

```js
// Use transactions for multi-step operations
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const Posts = tx.get('Posts');
  
  const user = await Users.create({ email });
  await Posts.create({ title, author_id: user.id });
});

// Use include for eager loading
const users = await Users.include('posts').find();

// Check for null/undefined
const user = await Users.where({ email }).first();
if (!user) {
  throw new Error('User not found');
}

// Update with write() or direct modification
await user.write({ email: 'new@example.com' });
// OR
user.email = 'new@example.com'; // Auto-persists
```

### ❌ DON'T

```js
// Don't access unloaded relations
const user = await Users.findById(1);
console.log(user.posts.items); // May be undefined!

// Don't mix transaction contexts
await repo.transaction(async tx => {
  const user = await repo.get('Users').create({ email }); // Wrong!
  const post = await tx.get('Posts').create({ author_id: user.id });
});

// Don't use bulk operations with Knex directly (bypasses hooks!)
await Users.query().where('active', false).delete(); // Anti-pattern!

// Don't use methods that don't exist
await user.update({ email }); // No such method!
await user.save(); // No such method!
await user.delete(); // Use unlink() instead!
```

---

## See Also

- [Models](models) - Complete model guide
- [Field Types](fields) - All field types and options
- [Requests & Queries](requests) - Advanced querying
- [Transactions](transactions) - Transaction patterns
- [Hooks](hooks) - Lifecycle hooks in depth
- [Cookbook](cookbook) - Common recipes
