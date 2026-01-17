/**
 * User Model
 * 
 * Example model that uses the Timestampable mixin.
 */
class User {
  static _name = 'User';
  static table = 'users';
  static mixins = ['Timestampable'];
  
  static fields = {
    id: 'primary',
    email: { type: 'string', required: true, unique: true },
    name: 'string',
    documents: { type: 'one-to-many', foreign: 'Document.author_id' }
  };
  
  get displayName() {
    return this.name || this.email;
  }
}

// Define name property to override readonly built-in
Object.defineProperty(User, 'name', {
  value: 'User',
  writable: false,
  enumerable: false,
  configurable: true,
});

module.exports = User;
