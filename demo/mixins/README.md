# Mixins Demo

This demo showcases NormalJS mixin patterns for reusable model behavior.

## What's Included

### Mixins

1. **Timestampable** - Automatically manages `created_at` and `updated_at` fields
2. **SoftDeletable** - Implements soft delete by overriding `unlink()` method

### Models

1. **User** - Uses Timestampable mixin
2. **Document** - Uses both Timestampable and SoftDeletable mixins

## Running the Demo

```bash
cd demo/mixins
node index.js
```

## Key Concepts Demonstrated

### 1. Timestampable Mixin

- Adds `created_at` and `updated_at` fields
- Automatically updates `updated_at` on record changes
- Uses lifecycle hooks (`pre_create`, `pre_update`)

### 2. SoftDeletable Mixin

- Adds `deleted_at` field
- Overrides `unlink()` to set `deleted_at` instead of deleting
- Provides `restore()` method to undelete records
- Provides `forceUnlink()` for hard deletes
- Includes `isDeleted` getter
- Uses default scope to hide soft-deleted records

### 3. Combining Mixins

- Models can use multiple mixins
- Fields and methods are merged
- Lifecycle hooks are called in order

## Learn More

See the [Mixins Documentation](../../docs/mixins.md) for detailed usage and examples.
