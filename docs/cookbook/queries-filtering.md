---
id: queries-filtering
title: Queries & Filtering
keywords: [query, filter, where, search, orderby, limit]
---

# Queries & Filtering

## Simple Filters

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

## Complex Filters with JSON Criteria

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

## Sorting and Limiting

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

## Counting

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
