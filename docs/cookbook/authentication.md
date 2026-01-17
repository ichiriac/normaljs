---
id: authentication
title: Authentication
keywords: [authentication, password, bcrypt, session, login, security]
---

# Authentication

## Password Hashing (with bcrypt)

```js
// ✅ User model with password hashing
class Users {
  static _name = 'Users';
  static fields = {
    id: 'primary',
    email: { type: 'string', unique: true, required: true },
    password_hash: 'string'
  };
  
  // Set password with hashing
  async setPassword(password) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(password, 10);
    await this.write({ password_hash: hash });
  }
  
  // Verify password
  async verifyPassword(password) {
    const bcrypt = require('bcrypt');
    return bcrypt.compare(password, this.password_hash);
  }
  
  // Static method for authentication
  static async authenticate(email, password) {
    const user = await this.where({ email }).first();
    if (!user) return null;
    
    const valid = await user.verifyPassword(password);
    return valid ? user : null;
  }
}

// Usage
const Users = repo.get('Users');

// Register
const user = await Users.create({ email: 'john@example.com' });
await user.setPassword('secretpassword');

// Login
const user = await Users.authenticate('john@example.com', 'secretpassword');
if (!user) {
  throw new Error('Invalid credentials');
}
```

## Session Management

```js
// ✅ Session model
class Sessions {
  static _name = 'Sessions';
  static fields = {
    id: 'primary',
    user_id: { type: 'many-to-one', model: 'Users' },
    token: { type: 'string', unique: true },
    expires_at: 'datetime',
    created_at: { type: 'datetime', default: () => new Date() }
  };
  
  // Check if session is valid
  get isValid() {
    return this.expires_at > new Date();
  }
  
  // Create new session
  static async createForUser(userId, ttlSeconds = 86400) {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    return this.create({
      user_id: userId,
      token,
      expires_at: expiresAt
    });
  }
  
  // Find by token
  static async findByToken(token) {
    const session = await this.where({ token }).first();
    if (!session || !session.isValid) {
      return null;
    }
    return session;
  }
}

// Usage
const Sessions = repo.get('Sessions');

// Create session
const session = await Sessions.createForUser(user.id);
console.log('Session token:', session.token);

// Validate session
const session = await Sessions.findByToken(token);
if (!session) {
  throw new Error('Invalid or expired session');
}
```
