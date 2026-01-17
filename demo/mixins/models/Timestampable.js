/**
 * Timestampable Mixin
 * 
 * Automatically manages created_at and updated_at fields.
 * Include this mixin in any model that needs timestamp tracking.
 */
class Timestampable {
  static _name = 'Timestampable';
  static abstract = true;
  
  static fields = {
    created_at: { type: 'datetime', default: () => new Date() },
    updated_at: { type: 'datetime', default: () => new Date() }
  };
  
  // Automatically update timestamp on record changes
  async pre_update() {
    this.updated_at = new Date();
  }
  
  async pre_create() {
    const now = new Date();
    if (!this.created_at) this.created_at = now;
    if (!this.updated_at) this.updated_at = now;
  }
}

// Define name property to override readonly built-in
Object.defineProperty(Timestampable, 'name', {
  value: 'Timestampable',
  writable: false,
  enumerable: false,
  configurable: true,
});

module.exports = Timestampable;
