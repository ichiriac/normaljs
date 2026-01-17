---
id: mixins
title: Mixins (Extensions)
---

# Mixins (Extensions)

Mixins in NormalJS allow you to create reusable bundles of fields, methods, and behavior that can be shared across multiple models. This is particularly useful for common patterns like timestamps, soft deletes, and audit trails.

## Overview

There are two ways to create mixins:

1. **Extension Pattern**: Register multiple classes with the same `static _name` to extend a model
2. **Composition Pattern**: Use `static mixins = [...]` to compose behavior from other models

## Extension Pattern

Extend models by registering multiple classes with the same `static _name`. Instance methods and fields are merged; statics are attached with super support.

```js
class Users {
  static _name = 'Users';
  static fields = { 
    id: 'primary',
    email: 'string'
  };
}

class UsersExtra {
  static _name = 'Users'; // Same name = extension
  static fields = {
    picture: 'string' // Additional fields
  };
  
  get label() {
    return this.email;
  }
}

repo.register(Users);
repo.register(UsersExtra); // Fields and methods are merged
```

## Composition Pattern

Use `static mixins` to compose behavior from other registered models:

```js
class Timestampable {
  static _name = 'Timestampable';
  static abstract = true; // Mark as mixin-only
  static fields = {
    created_at: { type: 'datetime', default: () => new Date() },
    updated_at: { type: 'datetime', default: () => new Date() }
  };
}

class Posts {
  static _name = 'Posts';
  static mixins = ['Timestampable']; // Include the mixin
  static fields = {
    id: 'primary',
    title: 'string'
  };
}

repo.register(Timestampable);
repo.register(Posts);
// Posts now has id, title, created_at, and updated_at fields
```

## Common Mixin Patterns

### Timestamps Mixin

Automatically manage `created_at` and `updated_at` fields:

```js
class Timestampable {
  static _name = 'Timestampable';
  static abstract = true;
  
  static fields = {
    created_at: { type: 'datetime', default: () => new Date() },
    updated_at: { type: 'datetime', default: () => new Date() }
  };
  
  // Automatically update timestamp on record changes
  async pre_update() {
    this.updated_at = new Date();
  }
  
  async pre_create() {
    const now = new Date();
    if (!this.created_at) this.created_at = now;
    if (!this.updated_at) this.updated_at = now;
  }
}

// Use in models
class Users {
  static _name = 'Users';
  static mixins = ['Timestampable'];
  static fields = {
    id: 'primary',
    email: { type: 'string', unique: true }
  };
}

class Posts {
  static _name = 'Posts';
  static mixins = ['Timestampable'];
  static fields = {
    id: 'primary',
    title: 'string',
    content: 'text'
  };
}

repo.register(Timestampable);
repo.register(Users);
repo.register(Posts);

// Usage
const user = await Users.create({ email: 'john@example.com' });
console.log(user.created_at); // Automatically set

// Update automatically updates updated_at
await user.write({ email: 'jane@example.com' });
console.log(user.updated_at); // Updated timestamp
```

### Soft Delete Mixin

Implement soft deletes by overriding the `unlink()` method:

```js
class SoftDeletable {
  static _name = 'SoftDeletable';
  static abstract = true;
  
  static fields = {
    deleted_at: { type: 'datetime', default: null }
  };
  
  // Use a default scope to hide soft-deleted records
  static defaultScope = {
    where: { deleted_at: null }
  };
  
  // Override unlink to set deleted_at instead of deleting
  async unlink() {
    if (this.deleted_at) {
      // Already soft-deleted, perform hard delete
      return await super.unlink();
    }
    
    // Soft delete: just set deleted_at
    await this.write({ deleted_at: new Date() });
    return this;
  }
  
  // Restore a soft-deleted record
  async restore() {
    if (!this.deleted_at) {
      throw new Error('Record is not deleted');
    }
    await this.write({ deleted_at: null });
    return this;
  }
  
  // Check if record is soft-deleted
  get isDeleted() {
    return !!this.deleted_at;
  }
}

// Use in models
class Documents {
  static _name = 'Documents';
  static mixins = ['SoftDeletable'];
  static fields = {
    id: 'primary',
    title: 'string',
    content: 'text'
  };
  
  // Add scope to access deleted records
  static scopes = {
    withDeleted: {
      // Remove the default scope filter
    }
  };
}

repo.register(SoftDeletable);
repo.register(Documents);

// Usage
const doc = await Documents.create({ 
  title: 'Important Document',
  content: 'Content here'
});

// Soft delete (sets deleted_at)
await doc.unlink();
console.log(doc.deleted_at); // Set to current time
console.log(doc.isDeleted); // true

// Normal queries don't find soft-deleted records
const found = await Documents.where({ id: doc.id }).first();
console.log(found); // null (due to defaultScope)

// Access soft-deleted records
const allDocs = await Documents.unscoped().where({ id: doc.id }).first();
console.log(allDocs); // Found!

// Restore the record
await doc.restore();
console.log(doc.deleted_at); // null

// Hard delete (actually removes from database)
await doc.unlink(); // Soft delete first
await doc.forceUnlink(); // Now hard delete
```

### Activity Tracking Mixin

Track related activities on any model:

```js
class ActivityMixin {
  static _name = 'ActivityMixin';
  static abstract = true;
  
  static fields = {
    activities: {
      type: 'one-to-many',
      foreign: 'Activity',
      where: function (record) {
        return {
          res_model: record._model.name,
          res_id: record.id
        };
      }
    }
  };
  
  /**
   * Add an activity linked to this record
   */
  async addActivity({ subject, description, due_date, user_id }) {
    const Activity = this._repo.get('Activity');
    return await Activity.create({
      subject,
      description,
      due_date,
      user_id,
      res_model: this._model.name,
      res_id: this.id
    });
  }
  
  /**
   * Get pending activities
   */
  async getPendingActivities() {
    await this.activities.load();
    return this.activities.items.filter(a => !a.completed);
  }
}

// Activity model
class Activity {
  static _name = 'Activity';
  static fields = {
    id: 'primary',
    subject: 'string',
    description: 'text',
    due_date: 'datetime',
    user_id: { type: 'many-to-one', model: 'Users' },
    res_model: 'string',
    res_id: 'integer',
    completed: { type: 'boolean', default: false }
  };
}

// Use in models
class Leads {
  static _name = 'Leads';
  static mixins = ['ActivityMixin'];
  static fields = {
    id: 'primary',
    name: 'string',
    email: 'string'
  };
}

class Opportunities {
  static _name = 'Opportunities';
  static mixins = ['ActivityMixin'];
  static fields = {
    id: 'primary',
    name: 'string',
    value: 'float'
  };
}

repo.register(ActivityMixin);
repo.register(Activity);
repo.register(Leads);
repo.register(Opportunities);

// Usage
const lead = await Leads.create({
  name: 'John Doe',
  email: 'john@example.com'
});

// Add activity
await lead.addActivity({
  subject: 'Follow up call',
  description: 'Call to discuss pricing',
  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  user_id: 1
});

// Get activities
const pending = await lead.getPendingActivities();
console.log(pending.length); // 1
```

### Combining Multiple Mixins

Models can use multiple mixins together:

```js
class Tasks {
  static _name = 'Tasks';
  static mixins = ['Timestampable', 'SoftDeletable', 'ActivityMixin'];
  static fields = {
    id: 'primary',
    title: 'string',
    description: 'text',
    priority: { type: 'integer', default: 0 }
  };
}

repo.register(Tasks);

// Now Tasks has:
// - created_at, updated_at (from Timestampable)
// - deleted_at, unlink(), restore(), isDeleted (from SoftDeletable)
// - activities, addActivity(), getPendingActivities() (from ActivityMixin)
// - id, title, description, priority (from Tasks itself)
```

## Mixin Best Practices

1. **Mark mixins as abstract**: Use `static abstract = true` to prevent direct instantiation
2. **Use descriptive names**: End mixin names with "Mixin" or "able" for clarity
3. **Keep mixins focused**: Each mixin should handle one concern
4. **Document dependencies**: If a mixin requires other models, document it clearly
5. **Test mixins independently**: Create unit tests for mixin behavior

## Mixin Limitations

- Mixins are applied during model registration
- Method conflicts are resolved by last-registered-wins
- Field conflicts will throw an error if types don't match
- Mixin models must be registered before models that use them

See tests around `extendModel` for conflict-avoidance and performance details.
