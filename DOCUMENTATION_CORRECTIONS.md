# Documentation Corrections - Direct Property Modification

## Critical Fix Applied

The documentation has been corrected to show the **proper NormalJS pattern**: direct property modification.

## What Was Wrong

❌ **Incorrect (shown before):**
```js
const user = await Users.findById(1);
await user.update({ email: 'new@example.com' }); // update() doesn't exist!
```

## What Is Correct

✅ **Correct (optimal NormalJS way):**
```js
const user = await Users.findById(1);
user.email = 'new@example.com'; // Direct modification
// Changes persist automatically on next query or transaction flush

// Or force immediate write:
await user.write();
```

## How NormalJS Active Records Work

1. **Direct Property Modification** (Optimal)
   - Modify properties directly: `record.field = newValue`
   - Changes are tracked automatically
   - Persist on next query or when transaction flushes
   - This is the most efficient way

2. **Manual Persistence** (When Needed)
   - Use `await record.write()` to force immediate persistence
   - No `update()` method exists
   - No `save()` method exists

3. **Deletion**
   - Use `await record.unlink()` to delete
   - No `delete()` method exists

## Files Corrected

### 1. `.github/copilot-instructions.md`
- ✅ Fixed "When handling records" section
- ✅ Fixed "Query Patterns" section
- ✅ Removed all incorrect `update()` examples
- ✅ Added correct direct modification patterns
- ✅ Documented `write()` method for manual persistence

### 2. `docs/index.md`
- ✅ Fixed "Complete Working Example" (step 9)
- ✅ Fixed "How to: Update and Delete" section
- ✅ Fixed "How to: Use Transactions" section
- ✅ Removed all `update()` calls
- ✅ Shows direct property modification throughout

### 3. `docs/cookbook.md`
- ✅ Fixed "Update Records" section in CRUD Operations
- ✅ Fixed transaction examples (inventory deduction, order totals)
- ✅ Fixed authentication `setPassword()` method
- ✅ Fixed timestamps example
- ✅ Fixed soft delete methods (`softDelete()` and `restore()`)
- ✅ Fixed slug generation `post_create()` hook
- ✅ Fixed search `post_update()` hook
- ✅ All examples now use direct modification

### 4. `docs/models.md`
- ✅ Fixed "Update Records" section
- ✅ Fixed many-to-one relation usage
- ✅ Shows ❌ DON'T use `update()` explicitly
- ✅ Shows ✅ DO use direct modification

## Key Patterns Documented

### Pattern 1: Simple Update
```js
const user = await Users.findById(1);
user.email = 'new@example.com';
user.name = 'New Name';
// Persists automatically
```

### Pattern 2: Update with Immediate Write
```js
const user = await Users.findById(1);
user.email = 'new@example.com';
await user.write(); // Force immediate persistence
```

### Pattern 3: Update in Transaction
```js
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const user = await Users.findById(1);
  
  user.email = 'new@example.com';
  user.updated_at = new Date();
  // Persists on transaction commit
});
```

### Pattern 4: Update with Validation
```js
const user = await Users.findById(1);
if (user.role !== 'admin') {
  user.email = newEmail;
  await user.write();
}
```

## Anti-Patterns Now Documented

The documentation now explicitly shows what **NOT** to do:

❌ `await user.update({ ... })` - Method doesn't exist
❌ `await user.save()` - Method doesn't exist  
❌ `await user.delete()` - Use `unlink()` instead
❌ Thinking changes won't persist - They do!

## Build Status

✅ Documentation builds successfully
✅ All examples corrected
✅ Consistent patterns throughout
✅ AI agents will now learn the correct NormalJS way

## For AI Coding Agents

When working with NormalJS records:

1. **Always modify properties directly** - This is the optimal pattern
2. **Changes persist automatically** - On next query or transaction flush
3. **Use `write()` for immediate persistence** - Only when you need it right away
4. **No `update()` method exists** - Don't look for it
5. **No `save()` method exists** - Direct modification handles it
