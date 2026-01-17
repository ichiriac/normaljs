---
id: file-uploads
title: File Uploads
keywords: [file upload, file storage, metadata, mime type, attachments]
---

# File Uploads

## File Metadata Model

```js
// ✅ File upload model
class Uploads {
  static _name = 'Uploads';
  static fields = {
    id: 'primary',
    filename: 'string',
    original_name: 'string',
    mime_type: 'string',
    size: 'integer',
    path: 'string',
    user_id: { type: 'many-to-one', model: 'Users' },
    created_at: { type: 'datetime', default: () => new Date() }
  };
  
  // Get public URL
  get url() {
    return `/uploads/${this.filename}`;
  }
  
  // Get human-readable size
  get humanSize() {
    const bytes = this.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  // Create from file
  static async createFromFile(filePath, originalName, userId) {
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    
    const stats = fs.statSync(filePath);
    const ext = path.extname(originalName);
    const filename = crypto.randomBytes(16).toString('hex') + ext;
    
    // You would move/copy the file here
    // fs.renameSync(filePath, `/uploads/${filename}`);
    
    return this.create({
      filename,
      original_name: originalName,
      mime_type: 'application/octet-stream', // Detect from file
      size: stats.size,
      path: `/uploads/${filename}`,
      user_id: userId
    });
  }
}

// Usage
const Uploads = repo.get('Uploads');

const upload = await Uploads.createFromFile(
  '/tmp/upload-abc123',
  'document.pdf',
  userId
);

console.log(`File uploaded: ${upload.url}`);
console.log(`Size: ${upload.humanSize}`);
```
