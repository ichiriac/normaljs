/**
 * NormalJS Scopes Demo
 * 
 * This demo showcases the scopes feature with a blog application.
 * It demonstrates:
 * - Basic scopes (active, published)
 * - Parameterized scopes (recentDays, minViews)
 * - Default scope (soft deletes)
 * - Scope composition
 * - Scope-level caching
 */

const { Connection, Repository } = require('../../dist/index.js');

// User model with scopes
class Users {
  static _name = 'Users';
  static table = 'users';
  static cache = true;

  static fields = {
    id: 'primary',
    username: 'string',
    email: { type: 'string', unique: true, required: true },
    active: { type: 'boolean', default: true },
    verified: { type: 'boolean', default: false },
    followers: { type: 'number', default: 0 },
    created_at: { type: 'datetime', default: () => new Date() },
    deleted_at: { type: 'datetime', default: null },
    posts: { type: 'one-to-many', foreign: 'Posts.author_id' },
  };

  // Default scope: exclude soft-deleted users
  static defaultScope = {
    where: { deleted_at: null },
  };

  static scopes = {
    active: {
      where: { active: true },
    },
    verified: {
      where: { verified: true },
    },
    popular: {
      where: { followers: { gte: 1000 } },
      cache: 300, // Cache for 5 minutes
    },
    recentDays: (qb, days = 7) => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      return {
        where: { created_at: { gte: cutoff } },
      };
    },
  };

  get name() {
    return `@${this.username}`;
  }
}

// Post model with scopes
class Posts {
  static _name = 'Posts';
  static table = 'posts';
  static cache = true;

  static fields = {
    id: 'primary',
    title: { type: 'string', required: true },
    content: { type: 'text', required: true },
    published: { type: 'boolean', default: false },
    views: { type: 'number', default: 0 },
    author_id: { type: 'many-to-one', required: true, model: 'Users' },
    published_at: { type: 'datetime', default: null },
    created_at: { type: 'datetime', default: () => new Date() },
    deleted_at: { type: 'datetime', default: null },
  };

  // Default scope: exclude soft-deleted posts
  static defaultScope = {
    where: { deleted_at: null },
  };

  static scopes = {
    published: {
      where: { published: true },
    },
    draft: {
      where: { published: false },
    },
    popular: {
      where: { views: { gte: 100 } },
      order: [['views', 'DESC']],
      cache: 600, // Cache for 10 minutes
    },
    recent: {
      order: [['published_at', 'DESC']],
      limit: 10,
    },
    recentDays: (qb, days = 7) => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      return {
        where: { published_at: { gte: cutoff } },
      };
    },
    minViews: (qb, minimum = 50) => ({
      where: { views: { gte: minimum } },
    }),
  };
}

async function main() {
  // Setup
  const conn = new Connection({ client: 'sqlite3', connection: { filename: ':memory:' } });
  await conn.connect();
  const repo = new Repository(conn);

  repo.register(Users);
  repo.register(Posts);
  await repo.sync({ force: true });

  console.log('🚀 NormalJS Scopes Demo\n');

  // Create sample data
  console.log('📝 Creating sample data...\n');

  const alice = await repo.Users.create({
    username: 'alice',
    email: 'alice@example.com',
    active: true,
    verified: true,
    followers: 1500,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  });

  const bob = await repo.Users.create({
    username: 'bob',
    email: 'bob@example.com',
    active: true,
    verified: false,
    followers: 500,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
  });

  const charlie = await repo.Users.create({
    username: 'charlie',
    email: 'charlie@example.com',
    active: false,
    verified: true,
    followers: 100,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  });

  // Create posts
  await repo.Posts.create({
    title: 'Getting Started with NormalJS',
    content: 'Learn how to use NormalJS for your next project...',
    author_id: alice.id,
    published: true,
    views: 250,
    published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  await repo.Posts.create({
    title: 'Advanced Scopes Tutorial',
    content: 'Deep dive into model scopes...',
    author_id: alice.id,
    published: true,
    views: 180,
    published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  });

  await repo.Posts.create({
    title: 'Draft: Upcoming Features',
    content: 'What to expect in the next release...',
    author_id: bob.id,
    published: false,
    views: 10,
  });

  await repo.Posts.create({
    title: 'Performance Tips',
    content: 'How to optimize your queries...',
    author_id: bob.id,
    published: true,
    views: 75,
    published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  });

  // Soft delete one user
  await charlie.write({ deleted_at: new Date() });

  // Demo 1: Basic Scopes
  console.log('1️⃣ Basic Scopes\n');

  const activeUsers = await repo.Users.scope('active');
  console.log(`   Active users: ${activeUsers.length}`);
  activeUsers.forEach((u) => console.log(`   - ${u.name} (${u.email})`));

  const verifiedUsers = await repo.Users.scope('verified');
  console.log(`\n   Verified users: ${verifiedUsers.length}`);
  verifiedUsers.forEach((u) => console.log(`   - ${u.name}`));

  // Demo 2: Parameterized Scopes
  console.log('\n2️⃣ Parameterized Scopes\n');

  const recentUsers = await repo.Users.scope({ recentDays: [10] });
  console.log(`   Users joined in last 10 days: ${recentUsers.length}`);
  recentUsers.forEach((u) => console.log(`   - ${u.name}`));

  const recentPosts = await repo.Posts.scope({ recentDays: [7] });
  console.log(`\n   Posts published in last 7 days: ${recentPosts.length}`);
  recentPosts.forEach((p) => console.log(`   - ${p.title} (${p.views} views)`));

  // Demo 3: Scope Composition
  console.log('\n3️⃣ Scope Composition (Multiple Scopes)\n');

  const activeVerifiedUsers = await repo.Users.scope('active', 'verified');
  console.log(`   Active AND verified users: ${activeVerifiedUsers.length}`);
  activeVerifiedUsers.forEach((u) => console.log(`   - ${u.name}`));

  const popularPublishedPosts = await repo.Posts.scope('published', 'popular');
  console.log(`\n   Published AND popular posts: ${popularPublishedPosts.length}`);
  popularPublishedPosts.forEach((p) => console.log(`   - ${p.title} (${p.views} views)`));

  // Demo 4: Default Scope
  console.log('\n4️⃣ Default Scope (Soft Deletes)\n');

  const usersWithDefault = await repo.Users.query();
  console.log(`   Users (with defaultScope - excludes deleted): ${usersWithDefault.length}`);

  const allUsersIncludingDeleted = await repo.Users.unscoped();
  console.log(`   Users (unscoped - includes deleted): ${allUsersIncludingDeleted.length}`);

  // Demo 5: Scopes with Caching
  console.log('\n5️⃣ Scopes with Caching\n');

  const popularUsers = await repo.Users.scope('popular');
  console.log(`   Popular users (cached 5 min): ${popularUsers.length}`);
  popularUsers.forEach((u) => console.log(`   - ${u.name} (${u.followers} followers)`));

  // Demo 6: Order and Limit
  console.log('\n6️⃣ Order and Limit\n');

  const recentPosts10 = await repo.Posts.scope('published', 'recent');
  console.log(`   Most recent published posts (limit 10): ${recentPosts10.length}`);
  recentPosts10.forEach((p) => console.log(`   - ${p.title}`));

  // Demo 7: Complex Composition
  console.log('\n7️⃣ Complex Composition\n');

  const complexQuery = await repo.Posts.scope('published', { minViews: [150] }, 'recent');
  console.log(`   Published posts with 150+ views (recent first): ${complexQuery.length}`);
  complexQuery.forEach((p) => console.log(`   - ${p.title} (${p.views} views)`));

  console.log('\n✅ Demo complete!\n');

  // Cleanup
  await conn.destroy();
}

main().catch(console.error);
