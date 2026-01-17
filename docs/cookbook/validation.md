---
id: validation
title: Validation
keywords: [validation, validate, hooks, pre_create, pre_update, constraints]
---

# Validation

## Field-Level Validation

```js
// ✅ Custom validation in model
class Users {
  static _name = 'Users';
  static fields = {
    id: 'primary',
    email: { type: 'string', unique: true, required: true },
    age: 'integer'
  };
  
  // Pre-create validation
  async pre_create() {
    this.validateEmail();
    this.validateAge();
  }
  
  // Pre-update validation
  async pre_update() {
    if ('email' in this._changes) {
      this.validateEmail();
    }
    if ('age' in this._changes) {
      this.validateAge();
    }
  }
  
  validateEmail() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      throw new Error('Invalid email format');
    }
  }
  
  validateAge() {
    if (this.age !== null && this.age !== undefined) {
      if (this.age < 0 || this.age > 150) {
        throw new Error('Age must be between 0 and 150');
      }
    }
  }
}

// Usage (validation happens automatically)
try {
  const user = await Users.create({
    email: 'invalid-email',
    age: 200
  });
} catch (err) {
  console.error(err.message); // "Invalid email format"
}
```
