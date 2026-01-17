---
id: cookbook
title: Cookbook - Common Recipes
keywords: [recipes, examples, howto, patterns, code samples]
---

# Cookbook

Copy-paste ready recipes for common tasks with NormalJS. All examples are production-ready and follow best practices.

## Table of Contents

- [CRUD Operations](#crud-operations)
- [Queries & Filtering](#queries--filtering)
- [Relations](#relations)
- [Transactions](#transactions)
- [Authentication](#authentication)
- [Pagination](#pagination)
- [Timestamps](#timestamps)
- [Soft Deletes](#soft-deletes)
- [Slugs & SEO](#slugs--seo)
- [File Uploads](#file-uploads)
- [Validation](#validation)
- [Search](#search)

## CRUD Operations

### Create a Record

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

### Read Records

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

### Delete Records

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

## Queries & Filtering

### Simple Filters

```js
const Posts = repo.get('Posts');

// ✅ Single condition
const posts = await Posts.where({ published: true }).find();

// ✅ Multiple conditions (AND)
const posts = await Posts
  .where({ published: true, featured: true })
  .find();

// ✅ Comparison operators
const posts = await Posts
  .where('views', '>', 1000)
  .where('created_at', '>=', lastMonth)
  .find();

// ✅ LIKE queries
const posts = await Posts
  .where('title', 'like', '%tutorial%')
  .find();

// ✅ IN queries
const posts = await Posts
  .whereIn('category_id', [1, 2, 3])
  .find();
```

### Complex Filters with JSON Criteria

```js
const Posts = repo.get('Posts');

// ✅ OR conditions
const posts = await Posts.where({
  or: [
    ['published', '=', true],
    ['author_id', '=', currentUserId]
  ]
}).find();

// ✅ Nested AND/OR
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

// ✅ Complex search
const posts = await Posts.where({
  and: [
    ['published', '=', true],
    {
      or: [
        ['title', 'like', `%${searchTerm}%`],
        ['content', 'like', `%${searchTerm}%`]
      ]
    },
    ['created_at', '>', startDate]
  ]
}).orderBy('views', 'desc').find();
```

### Sorting and Limiting

```js
const Posts = repo.get('Posts');

// ✅ Order by single field
const posts = await Posts
  .where({ published: true })
  .orderBy('created_at', 'desc')
  .find();

// ✅ Order by multiple fields
const posts = await Posts
  .where({ published: true })
  .orderBy('featured', 'desc')
  .orderBy('views', 'desc')
  .find();

// ✅ Pagination
const page = 2;
const perPage = 20;
const posts = await Posts
  .where({ published: true })
  .limit(perPage)
  .offset((page - 1) * perPage)
  .find();
```

### Counting

```js
const Posts = repo.get('Posts');

// ✅ Count all
const total = await Posts.count();

// ✅ Count with filters
const publishedCount = await Posts
  .where({ published: true })
  .count();

// ✅ Check existence
const hasUnpublished = await Posts
  .where({ published: false })
  .count() > 0;
```

## Relations

### Defining Relations

```js
// ✅ Many-to-One (belongs to)
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    author_id: { type: 'many-to-one', model: 'Users' } // Creates FK column
  };
}

// ✅ One-to-Many (has many)
class Users {
  static _name = 'Users';
  static fields = {
    id: 'primary',
    email: 'string',
    posts: { type: 'one-to-many', foreign: 'Posts.author_id' } // Virtual field
  };
}

// ✅ Many-to-Many
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    tags: { type: 'many-to-many', model: 'Tags' } // Auto-creates join table
  };
}

class Tags {
  static _name = 'Tags';
  static fields = {
    id: 'primary',
    posts: { type: 'many-to-many', model: 'Posts' } // Same join table
  };
}
```

### Eager Loading Relations

```js
const Posts = repo.get('Posts');
const Users = repo.get('Users');

// ✅ Load single relation
const post = await Posts
  .where({ id: 1 })
  .include('author')
  .first();
console.log(post.author.name);

// ✅ Load multiple relations
const post = await Posts
  .where({ id: 1 })
  .include('author', 'tags', 'comments')
  .first();

// ✅ Load relation on collection
const posts = await Posts
  .where({ published: true })
  .include('author')
  .find();
posts.forEach(post => console.log(post.author.name));

// ❌ DON'T: Access unloaded relations
const post = await Posts.findById(1);
console.log(post.author.name); // May be undefined!

// ✅ DO: Load explicitly or use include
const post = await Posts.findById(1);
await post.author.load();
console.log(post.author.name);
```

### Lazy Loading Relations

```js
const Posts = repo.get('Posts');
const Users = repo.get('Users');

// ✅ Load one-to-many
const user = await Users.findById(1);
await user.posts.load();
console.log(`User has ${user.posts.items.length} posts`);

// ✅ Load with filters
const user = await Users.findById(1);
const publishedPosts = await user.posts.where({ published: true });

// ✅ Load many-to-many
const post = await Posts.findById(1);
await post.tags.load();
post.tags.items.forEach(tag => console.log(tag.name));
```

### Managing Many-to-Many Relations

```js
const Posts = repo.get('Posts');

// ✅ Add relation
const post = await Posts.findById(1);
await post.tags.add(tagId);
await post.tags.add(tagObject);

// ✅ Remove relation
await post.tags.remove(tagId);

// ✅ Replace all relations
await post.tags.set([tag1Id, tag2Id, tag3Id]);

// ✅ Clear all relations
await post.tags.set([]);

// ✅ Check if related
await post.tags.load();
const hasTag = post.tags.items.some(t => t.id === tagId);
```

## Transactions

### Basic Transaction

```js
// ✅ Simple transaction
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const Posts = tx.get('Posts');
  
  const user = await Users.create({ email: 'author@example.com' });
  await Posts.create({ title: 'First Post', author_id: user.id });
  
  // Commits automatically on success
});

// ❌ DON'T: Mix transaction contexts
await repo.transaction(async tx => {
  const user = await repo.get('Users').create({ email }); // Wrong context!
  const post = await tx.get('Posts').create({ author_id: user.id });
});

// ✅ DO: Use tx consistently
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const Posts = tx.get('Posts');
  
  const user = await Users.create({ email });
  const post = await Posts.create({ author_id: user.id });
});
```

### Transaction with Error Handling

```js
// ✅ Transaction with rollback on error
try {
  await repo.transaction(async tx => {
    const Users = tx.get('Users');
    const Accounts = tx.get('Accounts');
    
    const user = await Users.create({ email });
    
    // This will rollback if it throws
    if (someCondition) {
      throw new Error('Invalid operation');
    }
    
    await Accounts.create({ user_id: user.id, balance: 0 });
  });
} catch (err) {
  console.error('Transaction failed:', err.message);
  // All changes rolled back
}
```

### Nested Operations in Transaction

```js
// ✅ Complex multi-step transaction
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const Orders = tx.get('Orders');
  const Products = tx.get('Products');
  const OrderItems = tx.get('OrderItems');
  
  // 1. Get user
  const user = await Users.findById(userId);
  if (!user.active) {
    throw new Error('User is not active');
  }
  
  // 2. Create order
  const order = await Orders.create({
    customer_id: user.id,
    status: 'pending',
    total: 0
  });
  
  // 3. Process items
  let total = 0;
  for (const item of cartItems) {
    const product = await Products.findById(item.product_id);
    
    // Check stock
    if (product.stock < item.quantity) {
      throw new Error(`Not enough stock for ${product.name}`);
    }
    
    // Deduct inventory
    await product.write({ stock: product.stock - item.quantity });
    
    // Create order item
    await OrderItems.create({
      order_id: order.id,
      product_id: product.id,
      quantity: item.quantity,
      price: product.price
    });
    
    total += product.price * item.quantity;
  }
  
  // 4. Update order total
  await order.write({ total });
});
```

## Authentication

### Password Hashing (with bcrypt)

```js
// ✅ User model with password hashing
class Users {
  static _name = 'Users';
  static fields = {
    id: 'primary',
    email: { type: 'string', unique: true, required: true },
    password_hash: 'string'
  };
  
  // Set password with hashing
  async setPassword(password) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(password, 10);
    await this.write({ password_hash: hash });
  }
  
  // Verify password
  async verifyPassword(password) {
    const bcrypt = require('bcrypt');
    return bcrypt.compare(password, this.password_hash);
  }
  
  // Static method for authentication
  static async authenticate(email, password) {
    const user = await this.where({ email }).first();
    if (!user) return null;
    
    const valid = await user.verifyPassword(password);
    return valid ? user : null;
  }
}

// Usage
const Users = repo.get('Users');

// Register
const user = await Users.create({ email: 'john@example.com' });
await user.setPassword('secretpassword');

// Login
const user = await Users.authenticate('john@example.com', 'secretpassword');
if (!user) {
  throw new Error('Invalid credentials');
}
```

### Session Management

```js
// ✅ Session model
class Sessions {
  static _name = 'Sessions';
  static fields = {
    id: 'primary',
    user_id: { type: 'many-to-one', model: 'Users' },
    token: { type: 'string', unique: true },
    expires_at: 'datetime',
    created_at: { type: 'datetime', default: () => new Date() }
  };
  
  // Check if session is valid
  get isValid() {
    return this.expires_at > new Date();
  }
  
  // Create new session
  static async createForUser(userId, ttlSeconds = 86400) {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    return this.create({
      user_id: userId,
      token,
      expires_at: expiresAt
    });
  }
  
  // Find by token
  static async findByToken(token) {
    const session = await this.where({ token }).first();
    if (!session || !session.isValid) {
      return null;
    }
    return session;
  }
}

// Usage
const Sessions = repo.get('Sessions');

// Create session
const session = await Sessions.createForUser(user.id);
console.log('Session token:', session.token);

// Validate session
const session = await Sessions.findByToken(token);
if (!session) {
  throw new Error('Invalid or expired session');
}
```

## Pagination

### Simple Pagination

```js
// ✅ Basic pagination helper
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    published: 'boolean'
  };
  
  // Static pagination method
  static async paginate(page = 1, perPage = 20, filters = {}) {
    const offset = (page - 1) * perPage;
    
    // Build base query
    let query = this.where(filters);
    
    // Get items and total count in parallel
    const [items, total] = await Promise.all([
      query.limit(perPage).offset(offset).find(),
      query.count()
    ]);
    
    return {
      items,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      hasNext: page * perPage < total,
      hasPrev: page > 1
    };
  }
}

// Usage
const Posts = repo.get('Posts');
const result = await Posts.paginate(2, 20, { published: true });

console.log(`Page ${result.page} of ${result.totalPages}`);
console.log(`Showing ${result.items.length} of ${result.total} posts`);
result.items.forEach(post => console.log(post.title));
```

### Cursor-Based Pagination

```js
// ✅ Cursor pagination for infinite scroll
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    created_at: 'datetime'
  };
  
  // Cursor-based pagination
  static async paginateByCursor(cursor = null, limit = 20) {
    let query = this.where({ published: true });
    
    if (cursor) {
      // Get posts created before cursor
      query = query.where('created_at', '<', cursor);
    }
    
    const items = await query
      .orderBy('created_at', 'desc')
      .limit(limit + 1) // Get one extra to check if there's more
      .find();
    
    const hasMore = items.length > limit;
    if (hasMore) items.pop(); // Remove the extra item
    
    const nextCursor = items.length > 0
      ? items[items.length - 1].created_at
      : null;
    
    return {
      items,
      nextCursor,
      hasMore
    };
  }
}

// Usage
const Posts = repo.get('Posts');

// First page
const page1 = await Posts.paginateByCursor();
console.log(`Loaded ${page1.items.length} posts`);

// Next page
if (page1.hasMore) {
  const page2 = await Posts.paginateByCursor(page1.nextCursor);
  console.log(`Loaded ${page2.items.length} more posts`);
}
```

## Timestamps

### Auto Timestamps

```js
// ✅ Model with automatic timestamps
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    created_at: { type: 'datetime', default: () => new Date() },
    updated_at: { type: 'datetime', default: () => new Date() }
  };
}

// ✅ Update with timestamp
const post = await Posts.findById(1);
await post.write({
  title: 'New Title',
  updated_at: new Date()
});
```

### Post-Create Hook for Timestamps

```js
// ✅ Automatic updated_at using hooks
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    created_at: { type: 'datetime', default: () => new Date() },
    updated_at: { type: 'datetime', default: () => new Date() }
  };
  
  // Post-create hook
  async post_create() {
    // Run after record is created
    console.log(`Post ${this.id} created at ${this.created_at}`);
  }
  
  // Pre-update hook
  async pre_update() {
    this.updated_at = new Date();
  }
}
```

## Soft Deletes

### Implementing Soft Deletes

```js
// ✅ Soft delete pattern
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    deleted_at: 'datetime'
  };
  
  // Soft delete
  async softDelete() {
    await this.write({ deleted_at: new Date() });
  }
  
  // Restore
  async restore() {
    await this.write({ deleted_at: null });
  }
  
  // Check if deleted
  get isDeleted() {
    return this.deleted_at !== null;
  }
  
  // Query only active records
  static active() {
    return this.where({ deleted_at: null });
  }
  
  // Query only deleted records
  static deleted() {
    return this.where('deleted_at', 'is not', null);
  }
}

// Usage
const Posts = repo.get('Posts');

// Get only active posts
const activePosts = await Posts.active().find();

// Soft delete
const post = await Posts.findById(1);
await post.softDelete();

// Restore
await post.restore();

// Get deleted posts
const deletedPosts = await Posts.deleted().find();
```

## Slugs & SEO

### Auto-Generate Slugs

```js
// ✅ Slug generation
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: { type: 'string', required: true },
    slug: { type: 'string', unique: true }
  };
  
  // Generate slug from title
  static generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Ensure unique slug
  static async ensureUniqueSlug(slug, excludeId = null) {
    let uniqueSlug = slug;
    let counter = 1;
    
    while (true) {
      let query = this.where({ slug: uniqueSlug });
      if (excludeId) {
        query = query.where('id', '!=', excludeId);
      }
      
      const exists = await query.count() > 0;
      if (!exists) break;
      
      uniqueSlug = `${slug}-${counter++}`;
    }
    
    return uniqueSlug;
  }
  
  // Post-create hook to generate slug
  async post_create() {
    if (!this.slug) {
      const baseSlug = Posts.generateSlug(this.title);
      const uniqueSlug = await Posts.ensureUniqueSlug(baseSlug, this.id);
      await this.write({ slug: uniqueSlug });
    }
  }
  
  // Find by slug
  static bySlug(slug) {
    return this.where({ slug }).first();
  }
}

// Usage
const Posts = repo.get('Posts');

// Create with auto-slug
const post = await Posts.create({
  title: 'Hello World!'
});
console.log(post.slug); // "hello-world"

// Find by slug
const post = await Posts.bySlug('hello-world');
```

## File Uploads

### File Metadata Model

```js
// ✅ File upload model
class Uploads {
  static _name = 'Uploads';
  static fields = {
    id: 'primary',
    filename: 'string',
    original_name: 'string',
    mime_type: 'string',
    size: 'integer',
    path: 'string',
    user_id: { type: 'many-to-one', model: 'Users' },
    created_at: { type: 'datetime', default: () => new Date() }
  };
  
  // Get public URL
  get url() {
    return `/uploads/${this.filename}`;
  }
  
  // Get human-readable size
  get humanSize() {
    const bytes = this.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  // Create from file
  static async createFromFile(filePath, originalName, userId) {
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    
    const stats = fs.statSync(filePath);
    const ext = path.extname(originalName);
    const filename = crypto.randomBytes(16).toString('hex') + ext;
    
    // You would move/copy the file here
    // fs.renameSync(filePath, `/uploads/${filename}`);
    
    return this.create({
      filename,
      original_name: originalName,
      mime_type: 'application/octet-stream', // Detect from file
      size: stats.size,
      path: `/uploads/${filename}`,
      user_id: userId
    });
  }
}

// Usage
const Uploads = repo.get('Uploads');

const upload = await Uploads.createFromFile(
  '/tmp/upload-abc123',
  'document.pdf',
  userId
);

console.log(`File uploaded: ${upload.url}`);
console.log(`Size: ${upload.humanSize}`);
```

## Validation

### Field-Level Validation

```js
// ✅ Custom validation in model
class Users {
  static _name = 'Users';
  static fields = {
    id: 'primary',
    email: { type: 'string', unique: true, required: true },
    age: 'integer'
  };
  
  // Pre-create validation
  async pre_create() {
    this.validateEmail();
    this.validateAge();
  }
  
  // Pre-update validation
  async pre_update() {
    if ('email' in this._changes) {
      this.validateEmail();
    }
    if ('age' in this._changes) {
      this.validateAge();
    }
  }
  
  validateEmail() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      throw new Error('Invalid email format');
    }
  }
  
  validateAge() {
    if (this.age !== null && this.age !== undefined) {
      if (this.age < 0 || this.age > 150) {
        throw new Error('Age must be between 0 and 150');
      }
    }
  }
}

// Usage (validation happens automatically)
try {
  const user = await Users.create({
    email: 'invalid-email',
    age: 200
  });
} catch (err) {
  console.error(err.message); // "Invalid email format"
}
```

## Search

### Simple Full-Text Search

```js
// ✅ Basic search across multiple fields
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    content: 'text',
    published: 'boolean'
  };
  
  // Search method
  static search(term, filters = {}) {
    const searchPattern = `%${term}%`;
    
    return this.where({
      and: [
        ...Object.entries(filters).map(([k, v]) => [k, '=', v]),
        {
          or: [
            ['title', 'like', searchPattern],
            ['content', 'like', searchPattern]
          ]
        }
      ]
    });
  }
}

// Usage
const Posts = repo.get('Posts');

const results = await Posts
  .search('javascript', { published: true })
  .orderBy('created_at', 'desc')
  .limit(10)
  .find();

console.log(`Found ${results.length} posts matching "javascript"`);
```

### Search with Relevance Scoring (PostgreSQL)

```js
// ✅ Full-text search with PostgreSQL
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    content: 'text',
    search_vector: 'text' // tsvector column
  };
  
  // Search with ranking
  static async searchFullText(term, limit = 20) {
    const query = this.query()
      .select('*')
      .select(this.query().raw(
        "ts_rank(search_vector, plainto_tsquery('english', ?)) as rank",
        [term]
      ))
      .whereRaw(
        "search_vector @@ plainto_tsquery('english', ?)",
        [term]
      )
      .orderBy('rank', 'desc')
      .limit(limit);
    
    return query;
  }
  
  // Update search vector (trigger or hook)
  async post_update() {
    if ('title' in this._changes || 'content' in this._changes) {
      // Update search vector for full-text search
      await this.query()
        .where({ id: this.id })
        .update({
          search_vector: this.query().raw(
            "to_tsvector('english', ? || ' ' || ?)",
            [this.title, this.content]
          )
        });
    }
  }
}
```

---

## More Recipes

For more advanced patterns, see:
- [Use Cases](use-cases) - Real-world application examples
- [Transactions](transactions) - Advanced transaction patterns
- [Caching](cache) - Performance optimization
- [Custom Fields](custom-fields) - Build your own field types
