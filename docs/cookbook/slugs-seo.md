---
id: slugs-seo
title: Slugs & SEO
keywords: [slug, url, seo, permalink, unique slug]
---

# Slugs & SEO

## Auto-Generate Slugs

```js
// ✅ Slug generation
class Posts {
  static _name = 'Posts';
  static fields = {
    id: 'primary',
    title: { type: 'string', required: true },
    slug: { type: 'string', unique: true }
  };
  
  // Generate slug from title
  static generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Ensure unique slug
  static async ensureUniqueSlug(slug, excludeId = null) {
    let uniqueSlug = slug;
    let counter = 1;
    
    while (true) {
      let query = this.where({ slug: uniqueSlug });
      if (excludeId) {
        query = query.where('id', '!=', excludeId);
      }
      
      const exists = await query.count() > 0;
      if (!exists) break;
      
      uniqueSlug = `${slug}-${counter++}`;
    }
    
    return uniqueSlug;
  }
  
  // Post-create hook to generate slug
  async post_create() {
    if (!this.slug) {
      const baseSlug = Posts.generateSlug(this.title);
      const uniqueSlug = await Posts.ensureUniqueSlug(baseSlug, this.id);
      await this.write({ slug: uniqueSlug });
    }
  }
  
  // Find by slug
  static bySlug(slug) {
    return this.where({ slug }).first();
  }
}

// Usage
const Posts = repo.get('Posts');

// Create with auto-slug
const post = await Posts.create({
  title: 'Hello World!'
});
console.log(post.slug); // "hello-world"

// Find by slug
const post = await Posts.bySlug('hello-world');
```
