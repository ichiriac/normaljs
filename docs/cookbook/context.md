---
id: context
title: Repository Context
keywords: [context, multi-tenancy, request metadata, feature flags, tenant]
---

# Repository Context

Use repository-wide context to store and access configuration, user information, and request metadata throughout your application.

## Overview

The context API provides a simple key-value store at the repository level:
- **`get_context(key, defaultValue)`** - Retrieve context values
- **`set_context(key, value)`** - Store context values

Context is accessible from:
- Repository instances
- Model classes
- Record instances
- Transaction-scoped repositories (with inheritance)

## Basic Usage

### Setting and Getting Context

```js
const repo = new Repository(conn);

// Set context values
repo.set_context('tenant_id', 'tenant-123');
repo.set_context('user_role', 'admin');
repo.set_context('feature_flags', { newUI: true, betaAPI: false });

// Get context values
const tenantId = repo.get_context('tenant_id'); // 'tenant-123'
const role = repo.get_context('user_role'); // 'admin'

// Get with default value
const locale = repo.get_context('locale', 'en-US'); // Returns 'en-US'
```

### Accessing Context from Models

```js
class Users {
  static _name = 'Users';
  static fields = {
    id: 'primary',
    email: 'string',
    tenant_id: 'string'
  };

  // Static method using context
  static async findForCurrentTenant() {
    const tenantId = this.get_context('tenant_id');
    return this.where({ tenant_id: tenantId }).find();
  }
}

// Usage
const Users = repo.get('Users');
repo.set_context('tenant_id', 'tenant-123');

const users = await Users.findForCurrentTenant();
```

### Accessing Context from Records

```js
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    author_id: 'integer',
    created_by: 'integer'
  };

  // Pre-create hook using context
  async pre_create() {
    // Automatically set created_by from context
    const currentUserId = this.get_context('current_user_id');
    if (currentUserId) {
      this.created_by = currentUserId;
    }
  }

  // Method using context
  canEdit() {
    const currentUserId = this.get_context('current_user_id');
    const currentRole = this.get_context('current_user_role');
    
    return currentRole === 'admin' || this.author_id === currentUserId;
  }
}

// Usage
repo.set_context('current_user_id', 999);
repo.set_context('current_user_role', 'user');

const Posts = repo.get('Posts');
const post = await Posts.create({ title: 'My Post', author_id: 999 });
// created_by is automatically set to 999

console.log(post.canEdit()); // true
```

## Transaction Context Inheritance

Transactions inherit the parent repository's context, but modifications are isolated.

```js
// Set context in parent
repo.set_context('tenant_id', 'tenant-123');
repo.set_context('user_role', 'admin');

await repo.transaction(async tx => {
  // Transaction inherits parent context
  console.log(tx.get_context('tenant_id')); // 'tenant-123'
  console.log(tx.get_context('user_role')); // 'admin'
  
  // Modify context in transaction (isolated)
  tx.set_context('tenant_id', 'tenant-456');
  tx.set_context('tx_timestamp', new Date());
  
  console.log(tx.get_context('tenant_id')); // 'tenant-456'
  
  const Users = tx.get('Users');
  // Models in transaction use transaction context
  console.log(Users.get_context('tenant_id')); // 'tenant-456'
});

// Parent context unchanged
console.log(repo.get_context('tenant_id')); // Still 'tenant-123'
console.log(repo.get_context('tx_timestamp')); // undefined
```

## Common Use Cases

### Multi-Tenancy

Store tenant ID in context to filter all queries:

```js
// Middleware sets tenant from request
app.use(async (req, res, next) => {
  const tenantId = req.user.tenantId;
  req.repo = new Repository(conn);
  req.repo.set_context('tenant_id', tenantId);
  next();
});

// Models automatically use tenant context
class Products {
  static _name = 'Products';
  static fields = {
    id: 'primary',
    name: 'string',
    tenant_id: 'string'
  };

  // Override create to auto-add tenant_id
  static async create(data) {
    const tenantId = this.get_context('tenant_id');
    return super.create({ ...data, tenant_id: tenantId });
  }

  // Helper to get tenant-scoped query
  static forTenant() {
    const tenantId = this.get_context('tenant_id');
    return this.where({ tenant_id: tenantId });
  }
}

// Usage in route handler
app.get('/products', async (req, res) => {
  const Products = req.repo.get('Products');
  const products = await Products.forTenant().find();
  res.json(products);
});
```

### Audit Trail

Track who creates/updates records:

```js
// Middleware sets user context
app.use(async (req, res, next) => {
  if (req.user) {
    req.repo.set_context('current_user_id', req.user.id);
    req.repo.set_context('current_user_name', req.user.name);
  }
  next();
});

// Model with audit fields
class Documents {
  static _name = 'Documents';
  static fields = {
    id: 'primary',
    title: 'string',
    created_by: 'integer',
    updated_by: 'integer',
    created_at: { type: 'datetime', default: () => new Date() },
    updated_at: { type: 'datetime', default: () => new Date() }
  };

  async pre_create() {
    const userId = this.get_context('current_user_id');
    if (userId) {
      this.created_by = userId;
      this.updated_by = userId;
    }
  }

  async pre_update() {
    const userId = this.get_context('current_user_id');
    if (userId) {
      this.updated_by = userId;
    }
    this.updated_at = new Date();
  }
}
```

### Feature Flags

Control feature availability via context:

```js
// Application startup
repo.set_context('features', {
  newDashboard: true,
  betaAPI: false,
  experimentalSearch: true
});

// Check feature availability
class Posts {
  static _name = 'Posts';

  static async search(term) {
    const features = this.get_context('features', {});
    
    if (features.experimentalSearch) {
      // Use new search algorithm
      return this.searchExperimental(term);
    } else {
      // Use old search
      return this.searchLegacy(term);
    }
  }
}
```

### Request Metadata

Store request-specific data:

```js
// Middleware sets request context
app.use(async (req, res, next) => {
  req.repo = new Repository(conn);
  req.repo.set_context('request_id', req.id);
  req.repo.set_context('request_ip', req.ip);
  req.repo.set_context('request_timestamp', new Date());
  req.repo.set_context('locale', req.headers['accept-language'] || 'en');
  next();
});

// Use in models
class ErrorLogs {
  static _name = 'ErrorLogs';
  
  static async logError(error, details) {
    return this.create({
      message: error.message,
      stack: error.stack,
      details,
      request_id: this.get_context('request_id'),
      ip_address: this.get_context('request_ip'),
      occurred_at: this.get_context('request_timestamp')
    });
  }
}
```

### Internationalization

Store locale for translations:

```js
// Set locale from request
repo.set_context('locale', 'es-ES');

class Products {
  static _name = 'Products';
  
  get localizedDescription() {
    const locale = this.get_context('locale', 'en-US');
    const translations = JSON.parse(this.description_i18n || '{}');
    return translations[locale] || this.description;
  }
}
```

## Best Practices

### ✅ DO

```js
// Set context at the start of request/transaction
repo.set_context('tenant_id', tenantId);
repo.set_context('user_id', userId);

// Use context for cross-cutting concerns
const tenantId = this.get_context('tenant_id');
const userId = this.get_context('current_user_id');

// Provide sensible defaults
const locale = this.get_context('locale', 'en-US');
const timeout = this.get_context('query_timeout', 30000);
```

### ❌ DON'T

```js
// Don't store large objects in context
repo.set_context('all_users', await Users.find()); // Bad!

// Don't use for business logic state
repo.set_context('shopping_cart', cartItems); // Use proper models instead

// Don't rely on context being set
const tenantId = this.get_context('tenant_id'); // Might be undefined!
if (!tenantId) {
  throw new Error('tenant_id not set');
}
```

## Related Documentation

- [API Reference](../api-reference#repo-context) - Complete context API
- [Transactions](transactions) - Transaction patterns
- [Multi-Tenancy Use Case](../use-cases#multi-tenancy) - Full multi-tenant example
