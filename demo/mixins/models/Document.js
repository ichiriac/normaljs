/**
 * Document Model
 * 
 * Example model that uses both Timestampable and SoftDeletable mixins.
 */
class Document {
  static _name = 'Document';
  static table = 'documents';
  static mixins = ['Timestampable', 'SoftDeletable'];
  
  static fields = {
    id: 'primary',
    title: { type: 'string', required: true },
    content: 'text',
    author_id: { type: 'many-to-one', model: 'User' }
  };
}

// Define name property to override readonly built-in
Object.defineProperty(Document, 'name', {
  value: 'Document',
  writable: false,
  enumerable: false,
  configurable: true,
});

module.exports = Document;
