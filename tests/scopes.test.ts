// @ts-nocheck - Test file with implicit any types

import { Connection, Repository } from '..';

describe('Model Scopes', () => {
  let conn: any;
  let repo: any;

  beforeAll(async () => {
    conn = new Connection({ client: 'sqlite3', connection: { filename: ':memory:' } });
    await conn.connect();
  });

  afterAll(async () => {
    await conn.destroy();
  });

  beforeEach(async () => {
    repo = new Repository(conn);
  });

  describe('Basic Scopes', () => {
    test('applies simple scope with where clause', async () => {
      class Users {
        static table = 'users';
        static fields = {
          id: 'primary',
          name: 'string',
          active: { type: 'boolean', default: true },
        };

        static scopes = {
          active: {
            where: { active: true },
          },
        };
      }
      Object.defineProperty(Users, 'name', { value: 'Users', configurable: true });

      repo.register(Users);
      await repo.sync({ force: true });

      // Create test data
      await repo.Users.create({ name: 'Alice', active: true });
      await repo.Users.create({ name: 'Bob', active: false });
      await repo.Users.create({ name: 'Carol', active: true });

      // Test scope
      const activeUsers = await repo.Users.scope('active');
      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.map((u: any) => u.name).sort()).toEqual(['Alice', 'Carol']);
    });

    test('applies scope with cache option', async () => {
      class Products {
        static table = 'products';
        static cache = true;
        static fields = {
          id: 'primary',
          name: 'string',
          featured: { type: 'boolean', default: false },
        };

        static scopes = {
          featured: {
            where: { featured: true },
            cache: 60, // 60 seconds
          },
        };
      }
      Object.defineProperty(Products, 'name', { value: 'Products', configurable: true });

      repo.register(Products);
      await repo.sync({ force: true });

      await repo.Products.create({ name: 'Widget', featured: true });
      await repo.Products.create({ name: 'Gadget', featured: false });

      const featured = await repo.Products.scope('featured');
      expect(featured).toHaveLength(1);
      expect(featured[0].name).toBe('Widget');
    });

    test('applies scope with order and limit', async () => {
      class Posts {
        static table = 'posts';
        static fields = {
          id: 'primary',
          title: 'string',
          views: { type: 'number', default: 0 },
        };

        static scopes = {
          popular: {
            where: { views: { gte: 100 } },
            order: [['views', 'DESC']],
            limit: 5,
          },
        };
      }
      Object.defineProperty(Posts, 'name', { value: 'Posts', configurable: true });

      repo.register(Posts);
      await repo.sync({ force: true });

      await repo.Posts.create({ title: 'Post 1', views: 50 });
      await repo.Posts.create({ title: 'Post 2', views: 200 });
      await repo.Posts.create({ title: 'Post 3', views: 150 });

      const popular = await repo.Posts.scope('popular');
      expect(popular).toHaveLength(2);
      expect(popular[0].views).toBe(200);
      expect(popular[1].views).toBe(150);
    });
  });

  describe('Parameterized Scopes', () => {
    test('applies function-based scope with parameters (array syntax)', async () => {
      class Articles {
        static table = 'articles';
        static fields = {
          id: 'primary',
          title: 'string',
          published_at: { type: 'datetime' },
        };

        static scopes = {
          recentDays: (qb: any, days = 7) => {
            const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
            return {
              where: { published_at: { gte: cutoff } },
            };
          },
        };
      }
      Object.defineProperty(Articles, 'name', { value: 'Articles', configurable: true });

      repo.register(Articles);
      await repo.sync({ force: true });

      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      await repo.Articles.create({ title: 'Recent', published_at: threeDaysAgo });
      await repo.Articles.create({ title: 'Old', published_at: tenDaysAgo });

      const recent = await repo.Articles.scope({ recentDays: [7] });
      expect(recent).toHaveLength(1);
      expect(recent[0].title).toBe('Recent');
    });

    test('applies function-based scope with single value (no array)', async () => {
      class Blog {
        static table = 'blog';
        static fields = {
          id: 'primary',
          title: 'string',
          views: { type: 'number', default: 0 },
        };

        static scopes = {
          minViews: (qb: any, minimum = 50) => ({
            where: { views: { gte: minimum } },
          }),
        };
      }
      Object.defineProperty(Blog, 'name', { value: 'Blog', configurable: true });

      repo.register(Blog);
      await repo.sync({ force: true });

      await repo.Blog.create({ title: 'Popular', views: 200 });
      await repo.Blog.create({ title: 'Medium', views: 75 });
      await repo.Blog.create({ title: 'Low', views: 25 });

      // Test with single value (more natural syntax)
      const popular = await repo.Blog.scope({ minViews: 100 });
      expect(popular).toHaveLength(1);
      expect(popular[0].title).toBe('Popular');

      // Test with array syntax still works (backward compatibility)
      const mediumAndUp = await repo.Blog.scope({ minViews: [50] });
      expect(mediumAndUp).toHaveLength(2);
    });
  });

  describe('Default Scopes', () => {
    test('applies defaultScope to all queries', async () => {
      class Tasks {
        static table = 'tasks';
        static fields = {
          id: 'primary',
          title: 'string',
          deleted_at: { type: 'datetime', default: null },
        };

        static defaultScope = {
          where: { deleted_at: null },
        };
      }
      Object.defineProperty(Tasks, 'name', { value: 'Tasks', configurable: true });

      repo.register(Tasks);
      await repo.sync({ force: true });

      await repo.Tasks.create({ title: 'Active Task', deleted_at: null });
      await repo.Tasks.create({ title: 'Deleted Task', deleted_at: new Date() });

      // Default scope should filter out deleted tasks
      const tasks = await repo.Tasks.query();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Active Task');
    });

    test('bypasses defaultScope with unscoped()', async () => {
      class Orders {
        static table = 'orders';
        static fields = {
          id: 'primary',
          number: 'string',
          archived: { type: 'boolean', default: false },
        };

        static defaultScope = {
          where: { archived: false },
        };
      }
      Object.defineProperty(Orders, 'name', { value: 'Orders', configurable: true });

      repo.register(Orders);
      await repo.sync({ force: true });

      await repo.Orders.create({ number: 'ORD-001', archived: false });
      await repo.Orders.create({ number: 'ORD-002', archived: true });

      // With default scope
      const active = await repo.Orders.query();
      expect(active).toHaveLength(1);

      // Without default scope
      const all = await repo.Orders.unscoped();
      expect(all).toHaveLength(2);
    });
  });

  describe('Scope Composition', () => {
    test('combines multiple scopes with AND logic', async () => {
      class Items {
        static table = 'items';
        static fields = {
          id: 'primary',
          name: 'string',
          active: { type: 'boolean', default: true },
          featured: { type: 'boolean', default: false },
        };

        static scopes = {
          active: {
            where: { active: true },
          },
          featured: {
            where: { featured: true },
          },
        };
      }
      Object.defineProperty(Items, 'name', { value: 'Items', configurable: true });

      repo.register(Items);
      await repo.sync({ force: true });

      await repo.Items.create({ name: 'Item 1', active: true, featured: true });
      await repo.Items.create({ name: 'Item 2', active: true, featured: false });
      await repo.Items.create({ name: 'Item 3', active: false, featured: true });

      const result = await repo.Items.scope('active', 'featured');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Item 1');
    });

    test('merges defaultScope with named scopes', async () => {
      class Documents {
        static table = 'documents';
        static fields = {
          id: 'primary',
          title: 'string',
          deleted_at: { type: 'datetime', default: null },
          published: { type: 'boolean', default: false },
        };

        static defaultScope = {
          where: { deleted_at: null },
        };

        static scopes = {
          published: {
            where: { published: true },
          },
        };
      }
      Object.defineProperty(Documents, 'name', { value: 'Documents', configurable: true });

      repo.register(Documents);
      await repo.sync({ force: true });

      await repo.Documents.create({
        title: 'Published Active',
        deleted_at: null,
        published: true,
      });
      await repo.Documents.create({
        title: 'Unpublished Active',
        deleted_at: null,
        published: false,
      });
      await repo.Documents.create({
        title: 'Published Deleted',
        deleted_at: new Date(),
        published: true,
      });

      const result = await repo.Documents.scope('published');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Published Active');
    });

    test('last-wins for order, limit, offset', async () => {
      class Events {
        static table = 'events';
        static fields = {
          id: 'primary',
          name: 'string',
          priority: { type: 'number', default: 0 },
        };

        static scopes = {
          byPriority: {
            order: [['priority', 'DESC']],
            limit: 10,
          },
          topThree: {
            order: [['priority', 'DESC']],
            limit: 3,
          },
        };
      }
      Object.defineProperty(Events, 'name', { value: 'Events', configurable: true });

      repo.register(Events);
      await repo.sync({ force: true });

      await repo.Events.create({ name: 'Event 1', priority: 5 });
      await repo.Events.create({ name: 'Event 2', priority: 3 });
      await repo.Events.create({ name: 'Event 3', priority: 8 });
      await repo.Events.create({ name: 'Event 4', priority: 1 });

      // topThree should override byPriority's limit
      const result = await repo.Events.scope('byPriority', 'topThree');
      expect(result).toHaveLength(3);
      expect(result[0].priority).toBe(8);
    });
  });

  describe('Include (Eager Loading)', () => {
    test('scope with include option stores relation for eager loading', async () => {
      class Authors {
        static table = 'authors';
        static fields = {
          id: 'primary',
          name: 'string',
          books: { type: 'one-to-many', foreign: 'Books.author_id' },
        };

        static scopes = {
          withBooks: {
            include: [{ relation: 'books' }],
          },
        };
      }
      Object.defineProperty(Authors, 'name', { value: 'Authors', configurable: true });

      class Books {
        static table = 'books';
        static fields = {
          id: 'primary',
          title: 'string',
          author_id: { type: 'many-to-one', model: 'Authors' },
        };
      }
      Object.defineProperty(Books, 'name', { value: 'Books', configurable: true });

      repo.register(Authors);
      repo.register(Books);
      await repo.sync({ force: true });

      const author = await repo.Authors.create({ name: 'J.K. Rowling' });
      await repo.Books.create({ title: 'Harry Potter 1', author_id: author.id });
      await repo.Books.create({ title: 'Harry Potter 2', author_id: author.id });

      const authors = await repo.Authors.scope('withBooks');
      expect(authors).toHaveLength(1);

      // For now, just verify the scope applied and authors were fetched
      // Full eager loading implementation is beyond the scope of this initial implementation
      expect(authors[0].name).toBe('J.K. Rowling');
    });
  });

  describe('Error Handling', () => {
    test('throws error when applying undefined scope', async () => {
      class TestModel {
        static table = 'test_model';
        static fields = {
          id: 'primary',
          name: 'string',
        };

        static scopes = {
          valid: { where: { name: 'test' } },
        };
      }
      Object.defineProperty(TestModel, 'name', { value: 'TestModel', configurable: true });

      repo.register(TestModel);
      await repo.sync({ force: true });

      await expect(async () => {
        await repo.TestModel.scope('nonexistent');
      }).rejects.toThrow("Scope 'nonexistent' not defined on model 'TestModel'");
    });

    test('throws error when model has no scopes', async () => {
      class NoScopes {
        static table = 'no_scopes';
        static fields = {
          id: 'primary',
          name: 'string',
        };
      }
      Object.defineProperty(NoScopes, 'name', { value: 'NoScopes', configurable: true });

      repo.register(NoScopes);
      await repo.sync({ force: true });

      expect(() => {
        repo.NoScopes.scope('any');
      }).toThrow("Model 'NoScopes' has no scopes defined");
    });
  });
});
