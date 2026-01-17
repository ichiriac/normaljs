---
id: index
title: NormalJS ORM
slug: /
keywords: [orm, node.js, knex, active record, sql, database, postgresql, mysql, sqlite]
---

# NormalJS ORM

NormalJS is a full-featured Node.js ORM built on Knex.js with an active record pattern. It provides a simple, expressive API for working with relational databases.

## Key Features

- **Simple Model Definition** - Define models with ES6 classes and a declarative fields DSL
- **Fluent Query API** - Chain methods to build complex queries with ease
- **Active Record Pattern** - Work with records as objects with methods and getters
- **Smart Relations** - One-to-many, many-to-one, and many-to-many with eager loading
- **Built-in Caching** - In-memory cache with clustering support for production
- **Lazy Loading** - Optimized queries that load only what you need
- **Model Extensions** - Mixins and inheritance for code reuse
- **Schema Sync** - Auto-create/update tables from model definitions (dev only)
- **Transactions** - First-class support with proper context isolation

## Quick Start

### Installation

```bash
npm install normaljs knex sqlite3
# or for PostgreSQL: npm install normaljs knex pg
# or for MySQL: npm install normaljs knex mysql2
```

### Complete Working Example

```js
const { Connection, Repository } = require('normaljs');

// 1. Setup connection and repository
const conn = new Connection({
  client: 'sqlite3',
  connection: { filename: ':memory:' }
});
await conn.connect();
const repo = new Repository(conn);

// 2. Define models with relations
class Users {
  static _name = 'Users';
  static fields = {
    id: 'primary',
    email: { type: 'string', unique: true, required: true },
    name: 'string',
    active: { type: 'boolean', default: true },
    posts: { type: 'one-to-many', foreign: 'Posts.author_id' }
  };
  
  // Add instance methods
  get domain() {
    return this.email.split('@')[1];
  }
  
  // Add static query helpers
  static activeUsers() {
    return this.where({ active: true });
  }
}

class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: { type: 'string', required: true },
    content: 'text',
    published: { type: 'boolean', default: false },
    author_id: { type: 'many-to-one', model: 'Users' },
    tags: { type: 'many-to-many', model: 'Tags' }
  };
}

class Tags {
  static _name = 'Tags';
  static fields = {
    id: 'primary',
    name: { type: 'string', unique: true }
  };
}

// 3. Register models and sync schema
repo.register(Users, Posts, Tags);
await repo.sync({ force: true }); // Dev only!

// 4. Create records
const UsersModel = repo.get('Users');
const PostsModel = repo.get('Posts');
const TagsModel = repo.get('Tags');

const user = await UsersModel.create({
  email: 'john@example.com',
  name: 'John Doe'
});

// 5. Create with relations in a transaction
await repo.transaction(async tx => {
  const Posts = tx.get('Posts');
  const Tags = tx.get('Tags');
  
  const tag = await Tags.create({ name: 'tutorial' });
  
  const post = await Posts.create({
    title: 'Getting Started with NormalJS',
    content: 'This is a comprehensive guide...',
    author_id: user.id,
    tags: [tag.id] // Creates many-to-many relations
  });
});

// 6. Query with eager loading
const userWithPosts = await UsersModel
  .where({ email: 'john@example.com' })
  .include('posts')
  .first();

console.log(`${userWithPosts.name} has ${userWithPosts.posts.items.length} posts`);

// 7. Query posts with filters
const publishedPosts = await PostsModel
  .where({ published: true })
  .orderBy('created_at', 'desc')
  .limit(10)
  .include('author', 'tags')
  .find();

// 8. Use instance methods
console.log(`User domain: ${user.domain}`); // "example.com"

// 9. Update records - Two ways:
// Method 1: Direct modification (persists automatically)
user.name = 'John Smith';

// Method 2: write() with key/value pairs (immediate flush)
await user.write({ name: 'John Smith', updated_at: new Date() });

// 10. Work with relations
const post = await PostsModel.findById(1);
await post.tags.load();
await post.tags.add(newTagId);
```

## Common Tasks

### How to: Define a Model

```js
class Products {
  static _name = 'Products'; // Required: registry key
  static table = 'products'; // Optional: DB table name
  static cache = 300; // Optional: cache TTL in seconds
  
  static fields = {
    id: 'primary',
    name: { type: 'string', required: true },
    price: { type: 'float', default: 0 },
    in_stock: { type: 'boolean', default: true }
  };
}
```

### How to: Create Records

```js
const Products = repo.get('Products');

// Single record
const product = await Products.create({
  name: 'Laptop',
  price: 999.99
});

// In a transaction (recommended for writes)
await repo.transaction(async tx => {
  const Products = tx.get('Products');
  await Products.create({ name: 'Mouse', price: 29.99 });
  await Products.create({ name: 'Keyboard', price: 79.99 });
});
```

### How to: Query Records

```js
const Products = repo.get('Products');

// Find by ID
const product = await Products.findById(1);

// Find one by condition
const product = await Products.where({ name: 'Laptop' }).first();

// Find many with filters
const products = await Products
  .where({ in_stock: true })
  .where('price', '<', 100)
  .orderBy('price', 'asc')
  .limit(10)
  .find();

// Complex conditions with JSON criteria
const products = await Products.where({
  and: [
    ['in_stock', '=', true],
    { or: [
      ['price', '<', 50],
      ['name', 'like', '%sale%']
    ]}
  ]
}).find();

// Count records
const count = await Products.where({ in_stock: true }).count();
```

### How to: Work with Relations

```js
// Define relations
class Orders {
  static _name = 'Orders';
  static fields = {
    id: 'primary',
    customer_id: { type: 'many-to-one', model: 'Customers' },
    items: { type: 'one-to-many', foreign: 'OrderItems.order_id' }
  };
}

// Eager load relations
const order = await Orders
  .where({ id: 1 })
  .include('customer', 'items')
  .first();

// Lazy load relations
const order = await Orders.findById(1);
await order.items.load();

// Manage many-to-many
const post = await Posts.findById(1);
await post.tags.add(tagId); // Add relation
await post.tags.remove(tagId); // Remove relation
await post.tags.set([id1, id2]); // Replace all
```

### How to: Update and Delete

```js
// Update - Method 1: Direct modification (optimal)
const product = await Products.findById(1);
product.price = 899.99;
product.updated_at = new Date();
// Changes persist automatically on next query or transaction flush

// Update - Method 2: write() with key/value pairs (immediate flush)
const product = await Products.findById(1);
await product.write({ 
  price: 899.99, 
  updated_at: new Date() 
});

// Delete a record
await product.unlink();

// Bulk operations (use Knex query builder)
await Products.query()
  .where('price', '<', 10)
  .update({ in_stock: false });
```

### How to: Use Transactions

```js
// Always use transactions for multi-step operations
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const Orders = tx.get('Orders');
  const Products = tx.get('Products');
  
  const user = await Users.findById(userId);
  const product = await Products.findById(productId);
  
  // Deduct inventory
  await product.write({ stock: product.stock - 1 });
  
  // Create order
  const order = await Orders.create({
    customer_id: user.id,
    product_id: product.id,
    total: product.price
  });
  
  // Commits automatically on success, rolls back on error
});
```

## What's Next?

### Essential Reading

- **[Common Use Cases](use-cases)** - Real-world examples and patterns
- **[Cookbook](cookbook)** - Copy-paste recipes for common tasks
- **[Model Definitions](models)** - Complete model reference
- **[Field Types](fields)** - All available field types and options

### Advanced Topics

- **[Requests & Queries](requests)** - Advanced querying techniques
- **[Filtering](filtering)** - JSON criteria and complex filters
- **[Mixins](mixins)** - Extend models with reusable behavior
- **[Inheritance](inheritance)** - Model inheritance with discriminators
- **[Transactions](transactions)** - Transaction patterns and locking
- **[Caching](cache)** - Performance optimization with caching
- **[Hooks](hooks)** - Lifecycle hooks and events
- **[Custom Fields](custom-fields)** - Create your own field types

### Migration Guides

- **[From Sequelize](adoption-sequelize)** - Complete migration guide with code comparisons

## Need Help?

- Browse the [cookbook](cookbook) for ready-to-use examples
- Check [use cases](use-cases) for common scenarios
- Read the [model reference](models) for detailed API documentation
