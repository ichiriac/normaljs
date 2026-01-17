---
id: search
title: Search
keywords: [search, full-text search, like, postgresql, tsvector, ranking]
---

# Search

## Simple Full-Text Search

```js
// ✅ Basic search across multiple fields
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    content: 'text',
    published: 'boolean'
  };
  
  // Search method
  static search(term, filters = {}) {
    const searchPattern = `%${term}%`;
    
    return this.where({
      and: [
        ...Object.entries(filters).map(([k, v]) => [k, '=', v]),
        {
          or: [
            ['title', 'like', searchPattern],
            ['content', 'like', searchPattern]
          ]
        }
      ]
    });
  }
}

// Usage
const Posts = repo.get('Posts');

const results = await Posts
  .search('javascript', { published: true })
  .orderBy('created_at', 'desc')
  .limit(10)
  .find();

console.log(`Found ${results.length} posts matching "javascript"`);
```

## Search with Relevance Scoring (PostgreSQL)

```js
// ✅ Full-text search with PostgreSQL
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: 'string',
    content: 'text',
    search_vector: 'text' // tsvector column
  };
  
  // Search with ranking
  static async searchFullText(term, limit = 20) {
    const query = this.query()
      .select('*')
      .select(this.query().raw(
        "ts_rank(search_vector, plainto_tsquery('english', ?)) as rank",
        [term]
      ))
      .whereRaw(
        "search_vector @@ plainto_tsquery('english', ?)",
        [term]
      )
      .orderBy('rank', 'desc')
      .limit(limit);
    
    return query;
  }
  
  // Update search vector (trigger or hook)
  async post_update() {
    if ('title' in this._changes || 'content' in this._changes) {
      // Update search vector for full-text search
      await this.query()
        .where({ id: this.id })
        .update({
          search_vector: this.query().raw(
            "to_tsvector('english', ? || ' ' || ?)",
            [this.title, this.content]
          )
        });
    }
  }
}
```
