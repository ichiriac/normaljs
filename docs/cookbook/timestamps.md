---
id: timestamps
title: Timestamps
keywords: [timestamps, created_at, updated_at, hooks, datetime]
---

# Timestamps

## Auto Timestamps

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

## Post-Create Hook for Timestamps

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
