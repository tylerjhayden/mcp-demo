// ABOUTME: Placeholder file resource (mcp-framework resources work differently)
// ABOUTME: For file reading, see tools/read_file.ts instead

import { MCPResource } from 'mcp-framework';

class FileResource extends MCPResource {
  uri = 'file://placeholder';
  name = 'file-placeholder';
  description = 'Placeholder resource - use read_file tool instead';

  async read(): Promise<Array<{ uri: string; text?: string }>> {
    return [
      {
        uri: this.uri,
        text: 'This is a placeholder. Use the read_file tool to read actual files.',
      },
    ];
  }
}

export default FileResource;
