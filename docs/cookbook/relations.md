---
id: relations
title: Relations
keywords: [relations, foreign key, one-to-many, many-to-one, many-to-many, eager loading]
---

# Relations

## Defining Relations

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

## Eager Loading Relations

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

## Lazy Loading Relations

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

## Managing Many-to-Many Relations

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
