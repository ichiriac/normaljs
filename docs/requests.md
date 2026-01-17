---
id: requests
title: Requests
---

Requests wrap Knex query builders and return active records:

```js
const Users = repo.get('Users');
const rows = await Users.where({ email: 'a@example.com' });
const one = await Users.query().firstWhere({ id: 1 });
```

Use property names to request. To retrieve the knex query builder use `query()` method.

- `where()` is a shorthand for `query().where()`
- `findOne` and `firstWhere` are shorthands to `where(criteria).first()`
- `findByPk` and `findById` expect the ID value as argument and will return the record instance
- **NEW**: `scope()` applies predefined model scopes to the query
- **NEW**: `unscoped()` bypasses the default scope if defined

## Scopes

Apply predefined query patterns using model scopes:

```js
// Apply single scope
const activeUsers = await Users.scope('active');

// Combine multiple scopes
const verifiedActive = await Users.scope('active', 'verified');

// Parameterized scopes
const recentPosts = await Posts.scope({ recentDays: [7] });

// Bypass default scope
const allUsers = await Users.unscoped();
```

See [Scopes](./scopes.md) for comprehensive documentation on defining and using scopes.

## Criteria

Use the JSON DSL to express filters; see [Filtering](filtering).

```js
const Users = repo.get('Users');
const rows = await Users.where({
  email: 'a@example.com',
  last_sent: {
    gt: new Date('2025-01-01 00:00:00'),
  },
});
```

## Caching

The requests results can be cached (if the cache is enabled). The TTL is required and indicates the duration in seconds that the cache have to live.

```js
const popular = await Users.query().where('active', true).cache(60);
```

Caching can also be configured at the scope level:

```js
class Users {
  static scopes = {
    popular: {
      where: { followers: { gte: 1000 } },
      cache: 300, // Cache for 5 minutes
    },
  };
}

// Cache is applied automatically when using the scope
const popularUsers = await Users.scope('popular');
```

In order to speed up the sql engine and keep cache lightweight only IDs are retrieved, records values are retrieved from the cache store or from the database.

Creating, writing or unlinking a record may invalidates the cache consistency. In order to evict cache related to a model use `Model.invalidateCache()` or to automatically invalidate the cache from records actions use `static cacheInvalidation = true;` on the model.
