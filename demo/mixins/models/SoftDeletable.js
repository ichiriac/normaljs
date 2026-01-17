/**
 * SoftDeletable Mixin
 * 
 * Implements soft delete functionality by overriding the unlink() method.
 * Records are marked as deleted instead of being removed from the database.
 * Includes a default scope to hide soft-deleted records from queries.
 */
class SoftDeletable {
  static _name = 'SoftDeletable';
  static abstract = true;
  
  static fields = {
    deleted_at: { type: 'datetime', default: null }
  };
  
  // Use a default scope to hide soft-deleted records
  static defaultScope = {
    where: { deleted_at: null }
  };
  
  /**
   * Override unlink to perform soft delete.
   * Sets deleted_at timestamp instead of removing the record.
   */
  async unlink() {
    if (this.deleted_at) {
      // Already soft-deleted, perform hard delete
      return await this.forceUnlink();
    }
    
    // Soft delete: just set deleted_at
    await this.write({ deleted_at: new Date() });
    return this;
  }
  
  /**
   * Perform a hard delete (actually remove from database).
   * This bypasses the soft delete mechanism.
   */
  async forceUnlink() {
    // Call the original unlink implementation
    const model = this._model;
    if (!model) return this;
    
    this._model = null;
    await this.pre_unlink();
    await this.pre_validate();
    
    const pre_unlink = [];
    for (const field of Object.values(model.fields)) {
      pre_unlink.push(field.pre_unlink(this));
    }
    await Promise.all(pre_unlink);
    
    // Delete from database
    await model.query().where({ id: this.id }).delete();
    
    if (this._parent) {
      await this._parent.unlink();
    }
    
    // Run post hooks
    await this.post_unlink();
    const post_unlink = [];
    for (const field of Object.values(model.fields)) {
      post_unlink.push(field.post_unlink(this));
    }
    await Promise.all(post_unlink);
    
    return this;
  }
  
  /**
   * Restore a soft-deleted record by clearing deleted_at.
   */
  async restore() {
    if (!this.deleted_at) {
      throw new Error('Record is not deleted');
    }
    await this.write({ deleted_at: null });
    return this;
  }
  
  /**
   * Check if record is soft-deleted.
   */
  get isDeleted() {
    return !!this.deleted_at;
  }
}

// Define name property to override readonly built-in
Object.defineProperty(SoftDeletable, 'name', {
  value: 'SoftDeletable',
  writable: false,
  enumerable: false,
  configurable: true,
});

module.exports = SoftDeletable;
