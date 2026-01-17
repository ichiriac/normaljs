# Model Scopes

Model scopes provide a way to define reusable, composable query filters at the model level. They help keep your code DRY and make common query patterns more maintainable.

## Defining Scopes

Scopes are defined as a static `scopes` property on your model class. Each scope can be either an options object or a function that returns options.

### Basic Scopes

```javascript
class Users {
  static table = 'users';
  static fields = {
    id: 'primary',
    name: 'string',
    email: 'string',
    active: { type: 'boolean', default: true },
    created_at: { type: 'datetime', default: () => new Date() },
  };

  static scopes = {
    // Simple scope with where clause
    active: {
      where: { active: true },
    },

    // Scope with ordering and limit
    recent: {
      order: [['created_at', 'DESC']],
      limit: 10,
    },

    // Scope with caching
    popular: {
      where: { followers: { gte: 1000 } },
      cache: 300, // Cache for 5 minutes
    },
  };
}
```

### Parameterized Scopes

Scopes can be functions that accept parameters:

```javascript
class Posts {
  static table = 'posts';
  static fields = {
    id: 'primary',
    title: 'string',
    published_at: { type: 'datetime' },
    views: { type: 'number', default: 0 },
  };

  static scopes = {
    // Function-based scope with parameters
    recentDays: (qb, days = 7) => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      return {
        where: { published_at: { gte: cutoff } },
      };
    },

    minViews: (qb, minimum = 100) => ({
      where: { views: { gte: minimum } },
    }),
  };
}
```

## Using Scopes

### Applying Single Scopes

```javascript
// Apply a single scope
const activeUsers = await repo.Users.scope('active');

// Apply parameterized scope
const recentPosts = await repo.Posts.scope({ recentDays: [30] });
```

### Composing Multiple Scopes

Multiple scopes can be combined, and they are merged with AND logic for where clauses:

```javascript
// Combine multiple scopes
const popularActivePosts = await repo.Posts
  .scope('active', { minViews: [1000] });

// Where clauses are AND-ed together
// Result: active = true AND views >= 1000
```

## Default Scopes

A default scope is automatically applied to all queries unless explicitly bypassed:

```javascript
class Tasks {
  static table = 'tasks';
  static fields = {
    id: 'primary',
    title: 'string',
    deleted_at: { type: 'datetime', default: null },
    archived: { type: 'boolean', default: false },
  };

  // Default scope applies to all queries
  static defaultScope = {
    where: { 
      deleted_at: null,
      archived: false 
    },
  };

  static scopes = {
    withArchived: {
      where: { deleted_at: null },
      // Only filters deleted, includes archived
    },
  };
}

// Queries automatically apply defaultScope
const tasks = await repo.Tasks.query(); // Only non-deleted, non-archived

// Named scopes are combined with defaultScope
const withArchived = await repo.Tasks.scope('withArchived');

// Bypass defaultScope with unscoped()
const allTasks = await repo.Tasks.unscoped();
```

## Scope Options

### where

Filter criteria using the same format as `.where()`:

```javascript
{
  where: {
    active: true,
    status: { in: ['pending', 'approved'] },
    created_at: { gte: someDate },
  }
}
```

Supports all operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `like`, `ilike`, `null`, `between`, etc.

### include

Mark relations for eager loading:

```javascript
{
  include: [
    { relation: 'profile' },
    { relation: 'posts', limit: 5 }
  ]
}
```

Note: Current implementation marks relations but doesn't pre-load them in bulk. Relations are still loaded via their proxies.

### cache

Enable caching for the scope:

```javascript
{
  cache: true,  // Default 300 seconds (5 minutes)
}

// Or specify TTL in seconds
{
  cache: 600,  // 10 minutes
}
```

### order

Specify result ordering:

```javascript
{
  order: [
    ['created_at', 'DESC'],
    ['priority', 'ASC']
  ]
}
```

### limit and offset

Pagination options:

```javascript
{
  limit: 10,
  offset: 20
}
```

### attributes

Select specific fields (currently not implemented, reserved for future use):

```javascript
{
  attributes: ['id', 'name', 'email']
}
```

## Scope Merging Behavior

When multiple scopes are combined:

- **where clauses**: Merged with AND logic
- **include arrays**: Concatenated and deduplicated by relation name
- **order, limit, offset, cache**: Last scope wins

Example:

```javascript
class Products {
  static scopes = {
    active: {
      where: { active: true },
      order: [['name', 'ASC']],
      limit: 100,
    },
    
    featured: {
      where: { featured: true },
      order: [['priority', 'DESC']],
      limit: 10,
    },
  };
}

// Combined result:
// where: { active: true AND featured: true }
// order: [['priority', 'DESC']]  // Last wins
// limit: 10  // Last wins
await repo.Products.scope('active', 'featured');
```

## Best Practices

### 1. Keep Scopes Focused

Each scope should represent a single, clear filtering concept:

```javascript
// Good
static scopes = {
  active: { where: { active: true } },
  published: { where: { published: true } },
  recent: { order: [['created_at', 'DESC']], limit: 10 },
}

// Less ideal - scope does too much
static scopes = {
  activePublishedRecent: {
    where: { active: true, published: true },
    order: [['created_at', 'DESC']],
    limit: 10,
  },
}
```

### 2. Use Default Scopes for Soft Deletes

```javascript
class Documents {
  static fields = {
    deleted_at: { type: 'datetime', default: null },
  };

  static defaultScope = {
    where: { deleted_at: null },
  };

  // Access soft-deleted records when needed
  static async findWithDeleted() {
    return this.unscoped().query();
  }
}
```

### 3. Combine Scopes for Complex Queries

```javascript
// Instead of one complex scope, combine simple ones
const results = await repo.Users
  .scope('active', { recentDays: [7] }, 'emailVerified')
  .where({ role: 'admin' });
```

### 4. Document Parameterized Scopes

```javascript
static scopes = {
  /**
   * Find records created within the specified number of days
   * @param {number} days - Number of days to look back (default: 7)
   */
  recentDays: (qb, days = 7) => ({
    where: { 
      created_at: { gte: Date.now() - days * 24 * 60 * 60 * 1000 } 
    },
  }),
}
```

## TypeScript Support

Scopes work seamlessly with TypeScript:

```typescript
class Users {
  static table = 'users';
  static fields = {
    id: 'primary' as const,
    name: 'string' as const,
    active: { type: 'boolean', default: true },
  };

  static scopes = {
    active: {
      where: { active: true },
    },
  };
}
```

## Migration from Sequelize

If you're migrating from Sequelize, scopes work similarly:

```javascript
// Sequelize
User.addScope('active', {
  where: { active: true }
});

// NormalJS
class User {
  static scopes = {
    active: {
      where: { active: true }
    }
  }
}

// Usage is similar
const activeUsers = await User.scope('active').findAll(); // Sequelize
const activeUsers = await repo.Users.scope('active');      // NormalJS
```

## Limitations

Current limitations of the scope implementation:

1. **Bulk Eager Loading**: The `include` option marks relations for loading but doesn't pre-load them in bulk. Relations are loaded via their proxies when accessed.

2. **Nested Includes**: Deep nested includes are not yet fully supported.

3. **Attributes Selection**: The `attributes` option is reserved but not yet implemented.

4. **Tag-based Cache Invalidation**: Automatic cache invalidation on writes is not yet implemented.

These features may be added in future releases.

## Examples

### Multi-tenancy

```javascript
class Documents {
  static fields = {
    tenant_id: { type: 'number', required: true },
    user_id: { type: 'number', required: true },
  };

  static defaultScope = {
    where: { tenant_id: global.currentTenantId },
  };

  static scopes = {
    forUser: (qb, userId) => ({
      where: { user_id: userId },
    }),
  };
}

// Automatically filters by tenant
const docs = await repo.Documents.query();

// Filter by user within tenant
const userDocs = await repo.Documents.scope({ forUser: [123] });
```

### Privacy Filters

```javascript
class Posts {
  static fields = {
    visibility: { type: 'string', default: 'public' },
  };

  static defaultScope = {
    where: { visibility: 'public' },
  };

  static scopes = {
    all: {},  // Empty scope to override default
  };
}

// Public posts only (default)
const publicPosts = await repo.Posts.query();

// All posts (bypass default)
const allPosts = await repo.Posts.unscoped();
```

## See Also

- [Filtering](./filtering.md) - Query filtering syntax
- [Models](./models.md) - Model definition
- [Caching](./cache.md) - Caching strategies
- [Requests](./requests.md) - Query API
