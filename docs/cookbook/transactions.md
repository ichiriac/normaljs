---
id: transactions
title: Transactions
keywords: [transaction, atomic, rollback, commit, consistency]
---

# Transactions

## Basic Transaction

```js
// ✅ Simple transaction
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const Posts = tx.get('Posts');
  
  const user = await Users.create({ email: 'author@example.com' });
  await Posts.create({ title: 'First Post', author_id: user.id });
  
  // Commits automatically on success
});

// ❌ DON'T: Mix transaction contexts
await repo.transaction(async tx => {
  const user = await repo.get('Users').create({ email }); // Wrong context!
  const post = await tx.get('Posts').create({ author_id: user.id });
});

// ✅ DO: Use tx consistently
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const Posts = tx.get('Posts');
  
  const user = await Users.create({ email });
  const post = await Posts.create({ author_id: user.id });
});
```

## Transaction with Error Handling

```js
// ✅ Transaction with rollback on error
try {
  await repo.transaction(async tx => {
    const Users = tx.get('Users');
    const Accounts = tx.get('Accounts');
    
    const user = await Users.create({ email });
    
    // This will rollback if it throws
    if (someCondition) {
      throw new Error('Invalid operation');
    }
    
    await Accounts.create({ user_id: user.id, balance: 0 });
  });
} catch (err) {
  console.error('Transaction failed:', err.message);
  // All changes rolled back
}
```

## Nested Operations in Transaction

```js
// ✅ Complex multi-step transaction
await repo.transaction(async tx => {
  const Users = tx.get('Users');
  const Orders = tx.get('Orders');
  const Products = tx.get('Products');
  const OrderItems = tx.get('OrderItems');
  
  // 1. Get user
  const user = await Users.findById(userId);
  if (!user.active) {
    throw new Error('User is not active');
  }
  
  // 2. Create order
  const order = await Orders.create({
    customer_id: user.id,
    status: 'pending',
    total: 0
  });
  
  // 3. Process items
  let total = 0;
  for (const item of cartItems) {
    const product = await Products.findById(item.product_id);
    
    // Check stock
    if (product.stock < item.quantity) {
      throw new Error(`Not enough stock for ${product.name}`);
    }
    
    // Deduct inventory
    await product.write({ stock: product.stock - item.quantity });
    
    // Create order item
    await OrderItems.create({
      order_id: order.id,
      product_id: product.id,
      quantity: item.quantity,
      price: product.price
    });
    
    total += product.price * item.quantity;
  }
  
  // 4. Update order total
  await order.write({ total });
});
```
