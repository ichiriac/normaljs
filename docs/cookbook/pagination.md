---
id: pagination
title: Pagination
keywords: [pagination, limit, offset, cursor, infinite scroll]
---

# Pagination

## Simple Pagination

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

## Cursor-Based Pagination

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
