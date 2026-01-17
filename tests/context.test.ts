// @ts-nocheck - Test file with implicit any types
import { Connection, Repository } from '..';

/**
 * Test suite for repository-level context with get_context and set_context API
 */
describe('Repository Context', () => {
  let conn;
  let repo;

  beforeAll(async () => {
    conn = new Connection({ client: 'sqlite3', connection: { filename: ':memory:' } });
    await conn.connect();
    repo = new Repository(conn);

    // Define a simple model for testing
    class Users {
      static _name = 'Users';
      static table = 'users';
      static fields = {
        id: 'primary',
        email: { type: 'string', required: true },
        name: 'string',
      };
    }

    repo.register(Users);
    await repo.sync({ force: true });
  });

  afterAll(async () => {
    await conn.destroy();
  });

  describe('Repository-level context', () => {
    test('can set and get context values', () => {
      repo.set_context('tenant_id', 123);
      repo.set_context('user_locale', 'en-US');

      expect(repo.get_context('tenant_id')).toBe(123);
      expect(repo.get_context('user_locale')).toBe('en-US');
    });

    test('returns undefined for non-existent keys', () => {
      expect(repo.get_context('non_existent_key')).toBeUndefined();
    });

    test('returns default value for non-existent keys', () => {
      expect(repo.get_context('non_existent_key', 'default')).toBe('default');
      expect(repo.get_context('another_key', 42)).toBe(42);
    });

    test('can overwrite existing context values', () => {
      repo.set_context('counter', 1);
      expect(repo.get_context('counter')).toBe(1);

      repo.set_context('counter', 2);
      expect(repo.get_context('counter')).toBe(2);
    });

    test('supports various data types', () => {
      repo.set_context('string_val', 'hello');
      repo.set_context('number_val', 42);
      repo.set_context('bool_val', true);
      repo.set_context('obj_val', { key: 'value' });
      repo.set_context('array_val', [1, 2, 3]);
      repo.set_context('null_val', null);

      expect(repo.get_context('string_val')).toBe('hello');
      expect(repo.get_context('number_val')).toBe(42);
      expect(repo.get_context('bool_val')).toBe(true);
      expect(repo.get_context('obj_val')).toEqual({ key: 'value' });
      expect(repo.get_context('array_val')).toEqual([1, 2, 3]);
      expect(repo.get_context('null_val')).toBeNull();
    });
  });

  describe('Model-level context access', () => {
    test('model can access repository context', () => {
      repo.set_context('model_test_key', 'model_value');

      const Users = repo.get('Users');
      expect(Users.get_context('model_test_key')).toBe('model_value');
    });

    test('model can set repository context', () => {
      const Users = repo.get('Users');
      Users.set_context('model_set_key', 'from_model');

      expect(repo.get_context('model_set_key')).toBe('from_model');
    });

    test('model context changes affect repository', () => {
      repo.set_context('shared_key', 'initial');
      const Users = repo.get('Users');
      
      Users.set_context('shared_key', 'updated');
      expect(repo.get_context('shared_key')).toBe('updated');
    });
  });

  describe('Record-level context access', () => {
    test('record can access repository context', async () => {
      repo.set_context('record_test_key', 'record_value');

      const Users = repo.get('Users');
      const user = await Users.create({ email: 'test1@example.com' });

      expect(user.get_context('record_test_key')).toBe('record_value');
    });

    test('record can set repository context', async () => {
      const Users = repo.get('Users');
      const user = await Users.create({ email: 'test2@example.com' });

      user.set_context('record_set_key', 'from_record');
      expect(repo.get_context('record_set_key')).toBe('from_record');
    });

    test('record context changes affect repository and model', async () => {
      repo.set_context('shared_record_key', 'initial');

      const Users = repo.get('Users');
      const user = await Users.create({ email: 'test3@example.com' });

      user.set_context('shared_record_key', 'updated_from_record');
      
      expect(repo.get_context('shared_record_key')).toBe('updated_from_record');
      expect(Users.get_context('shared_record_key')).toBe('updated_from_record');
    });
  });

  describe('Transaction context inheritance', () => {
    test('transaction inherits parent context at creation', async () => {
      repo.set_context('parent_key', 'parent_value');
      repo.set_context('shared_key', 'from_parent');

      await repo.transaction(async (tx) => {
        expect(tx.get_context('parent_key')).toBe('parent_value');
        expect(tx.get_context('shared_key')).toBe('from_parent');
      });
    });

    test('transaction modifications are isolated from parent', async () => {
      repo.set_context('isolation_test', 'parent_value');

      await repo.transaction(async (tx) => {
        tx.set_context('isolation_test', 'tx_value');
        tx.set_context('tx_only_key', 'tx_only_value');

        expect(tx.get_context('isolation_test')).toBe('tx_value');
        expect(tx.get_context('tx_only_key')).toBe('tx_only_value');
      });

      // Parent repository should be unchanged
      expect(repo.get_context('isolation_test')).toBe('parent_value');
      expect(repo.get_context('tx_only_key')).toBeUndefined();
    });

    test('model within transaction uses transaction context', async () => {
      repo.set_context('tx_model_key', 'parent_value');

      await repo.transaction(async (tx) => {
        const Users = tx.get('Users');
        
        expect(Users.get_context('tx_model_key')).toBe('parent_value');
        
        Users.set_context('tx_model_key', 'tx_updated');
        expect(Users.get_context('tx_model_key')).toBe('tx_updated');
        expect(tx.get_context('tx_model_key')).toBe('tx_updated');
      });

      // Parent should remain unchanged
      expect(repo.get_context('tx_model_key')).toBe('parent_value');
    });

    test('record within transaction uses transaction context', async () => {
      repo.set_context('tx_record_key', 'parent_value');

      await repo.transaction(async (tx) => {
        const Users = tx.get('Users');
        const user = await Users.create({ email: 'tx_test@example.com' });

        expect(user.get_context('tx_record_key')).toBe('parent_value');

        user.set_context('tx_record_key', 'tx_record_updated');
        expect(user.get_context('tx_record_key')).toBe('tx_record_updated');
        expect(tx.get_context('tx_record_key')).toBe('tx_record_updated');
      });

      // Parent should remain unchanged
      expect(repo.get_context('tx_record_key')).toBe('parent_value');
    });

    test.skip('nested transactions inherit from immediate parent (not supported in SQLite)', async () => {
      // Note: SQLite doesn't support true nested transactions
      // This test is skipped but documents expected behavior for databases that support it
      repo.set_context('nested_key', 'root_value');

      await repo.transaction(async (tx1) => {
        tx1.set_context('nested_key', 'tx1_value');
        tx1.set_context('tx1_only', 'tx1_only_value');

        await tx1.transaction(async (tx2) => {
          // Should inherit from tx1
          expect(tx2.get_context('nested_key')).toBe('tx1_value');
          expect(tx2.get_context('tx1_only')).toBe('tx1_only_value');

          // Modify in tx2
          tx2.set_context('nested_key', 'tx2_value');
          tx2.set_context('tx2_only', 'tx2_only_value');

          expect(tx2.get_context('nested_key')).toBe('tx2_value');
          expect(tx2.get_context('tx2_only')).toBe('tx2_only_value');
        });

        // tx1 should be unchanged
        expect(tx1.get_context('nested_key')).toBe('tx1_value');
        expect(tx1.get_context('tx2_only')).toBeUndefined();
      });

      // Root should be unchanged
      expect(repo.get_context('nested_key')).toBe('root_value');
    });
  });

  describe('Context use cases', () => {
    test('multi-tenancy: set tenant_id in context', async () => {
      repo.set_context('tenant_id', 'tenant-123');

      await repo.transaction(async (tx) => {
        const Users = tx.get('Users');
        const user = await Users.create({
          email: 'tenant-user@example.com',
          name: 'Tenant User',
        });

        // Record can check tenant from context
        const tenantId = user.get_context('tenant_id');
        expect(tenantId).toBe('tenant-123');
      });
    });

    test('user context: store current user info', async () => {
      repo.set_context('current_user_id', 999);
      repo.set_context('current_user_role', 'admin');

      const Users = repo.get('Users');
      const user = await Users.create({
        email: 'context-user@example.com',
      });

      expect(user.get_context('current_user_id')).toBe(999);
      expect(user.get_context('current_user_role')).toBe('admin');
    });

    test('feature flags: enable/disable features via context', () => {
      repo.set_context('feature_new_ui', true);
      repo.set_context('feature_beta_api', false);

      const Users = repo.get('Users');
      expect(Users.get_context('feature_new_ui')).toBe(true);
      expect(Users.get_context('feature_beta_api')).toBe(false);
    });

    test('request metadata: store request id and timestamp', async () => {
      const requestId = 'req-' + Date.now();
      const timestamp = new Date();

      repo.set_context('request_id', requestId);
      repo.set_context('request_timestamp', timestamp);

      await repo.transaction(async (tx) => {
        expect(tx.get_context('request_id')).toBe(requestId);
        expect(tx.get_context('request_timestamp')).toBe(timestamp);
      });
    });
  });
});
