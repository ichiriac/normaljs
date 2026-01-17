# NormalJS Scopes Demo

This demo showcases the model scopes feature in NormalJS with a blog application example.

## What's Demonstrated

1. **Basic Scopes**: Simple filtering scopes (`active`, `verified`)
2. **Parameterized Scopes**: Dynamic scopes that accept parameters (`recentDays`, `minViews`)
3. **Default Scope**: Automatically applied scopes (soft deletes pattern)
4. **Scope Composition**: Combining multiple scopes with AND logic
5. **Scope-level Caching**: Configuring cache TTL at the scope level
6. **Order and Limit**: Controlling result ordering and pagination
7. **Complex Queries**: Multi-scope composition with parameters

## Models

### Users Model
- Has `defaultScope` to exclude soft-deleted users
- Defines scopes: `active`, `verified`, `popular`, `recentDays`
- Demonstrates scope-level caching on the `popular` scope

### Posts Model
- Has `defaultScope` to exclude soft-deleted posts
- Defines scopes: `published`, `draft`, `popular`, `recent`, `recentDays`, `minViews`
- Shows various scope options (where, order, limit, cache)

## Running the Demo

```bash
# From repository root
npm run build
node demo/scopes/index.js
```

## Expected Output

The demo creates sample users and posts, then demonstrates:
- Filtering with simple scopes
- Using parameterized scopes with different arguments
- Combining multiple scopes
- Bypassing default scopes with `unscoped()`
- Automatic caching with scope-level configuration
- Complex multi-scope queries

## Learn More

See the comprehensive scopes documentation at [docs/scopes.md](../../docs/scopes.md) for:
- Complete API reference
- All scope options
- Best practices
- TypeScript support
- Migration from Sequelize
