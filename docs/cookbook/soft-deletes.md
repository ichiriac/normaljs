---
id: soft-deletes
title: Soft Deletes
keywords: [soft delete, deleted_at, restore, archive, undelete]
---

# Soft Deletes

## Implementing Soft Deletes

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
