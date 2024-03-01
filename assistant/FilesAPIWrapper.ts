class FilesAPIWrapper {
    // Existing class content...
    // Utility method to check if the FileSystemHandle is a file
    isFile(handle: FileSystemHandle): handle is FileSystemFileHandle {
        return handle.kind === 'file';
    }

    // Utility method to check if the FileSystemHandle is a directory
    isDirectory(handle: FileSystemHandle): handle is FileSystemDirectoryHandle {
        return handle.kind === 'directory';
    }

    // Improved error handling with custom exception
    private handleException(operation: string, error: Error): never {
        console.error(`Error during ${operation}:`, error);
        throw new Error(`FilesAPIWrapperError during ${operation}: ${error.message}`);
    }

    // Utility Methods for Common Tasks
    formatFileSize(bytes: number, decimalPoint: number = 2): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024,
            dm = decimalPoint < 0 ? 0 : decimalPoint,
            sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    async getFileTypeAndMetadata(fileHandle: FileSystemFileHandle): Promise<{type: string, size: string, lastModified: string}> {
        try {
            const file = await fileHandle.getFile();
            return {
                type: file.type,
                size: this.formatFileSize(file.size),
                lastModified: new Date(file.lastModified).toLocaleString()
            };
        } catch (error) {
            this.handleException('getting file type and metadata', error as Error);
        }
    }

    // Permissions Management
    async checkPermission(fileHandle: any, mode: 'read' | 'readwrite' = 'read'): Promise<PermissionState> {
        try {
            const options = { mode };
            // Permissions API is not fully integrated with File System Access API in all browsers yet
            // This is a fallback until it's fully supported
            if (fileHandle.permissions && fileHandle.permissions.query) {
                return (await fileHandle.permissions.query(options)).state;
            } else {
                console.warn('Permissions API not fully supported. Assuming permission granted.');
                return 'granted';
            }
        } catch (error) {
            this.handleException('checking permission', error as Error);
        }
    }

    // Generic method for reading files, allowing for different return types
    async readFile<T = string>(fileHandle: FileSystemFileHandle, type: 'text' | 'arrayBuffer' | 'blob' = 'text'): Promise<T> {
        try {
            const file: any = await fileHandle.getFile();
            switch (type) {
                case 'text':
                    return await file.text() as unknown as T;
                case 'arrayBuffer':
                    return await file.arrayBuffer() as unknown as T;
                case 'blob':
                    return await file.blob() as unknown as T;
                default:
                    throw new Error('Unsupported read type');
            }
        } catch (error) {
            this.handleException('reading file', error as Error);
        }
    }

    // Method for reading a file as a stream
    async readFileAsStream(fileHandle: FileSystemFileHandle): Promise<ReadableStream<Uint8Array> | null> {
        try {
            const file = await fileHandle.getFile();
            return file.stream();
        } catch (error) {
            this.handleException('reading file as stream', error as Error);
        }
    }

    // Method for writing data to a file using a stream
    async writeFileAsStream(fileHandle: FileSystemFileHandle, data: ReadableStream<Uint8Array>): Promise<void> {
        try {
            const writable = await (fileHandle as any).createWritable();
            await writable.write(data as any);
            await writable.close();
        } catch (error) {
            this.handleException('writing file as stream', error as Error);
        }
    }

    // Method for writing data to a file, supporting different data types
    async writeFile(fileHandle: FileSystemFileHandle, data: BufferSource | Blob | string): Promise<void> {
        try {
            const writable = await (fileHandle as any).createWritable();
            await writable.write(data);
            await writable.close();
        } catch (error) {
            this.handleException('writing file', error as Error);
        }
    }

    // Method to create a new file within a directory
    async createFile(directoryHandle: FileSystemDirectoryHandle, fileName: string): Promise<FileSystemFileHandle> {
        try {
            return await directoryHandle.getFileHandle(fileName, { create: true });
        } catch (error) {
            this.handleException('creating file', error as Error);
        }
    }

    // Method to open file(s) with options for multiple selections
    async openFile(multiple: boolean = false): Promise<FileSystemFileHandle[] | null> {
        try {
            const options = { multiple };
            return await (window as any).showOpenFilePicker(options);
        } catch (error) {
            this.handleException('picking a file', error as Error);
            return null; // This return is now redundant due to the never return type of handleException but kept for clarity
        }
    }

    // Method to open a directory and list its contents
    async openDirectory(): Promise<FileSystemDirectoryHandle | null> {
        try {
            return await (window as any).showDirectoryPicker();
        } catch (error) {
            this.handleException('picking a directory', error as Error);
            return null; // Redundant due to handleException's never type
        }
    }

    // Method to list files in a given directory
    async listFilesInDirectory(directoryHandle: FileSystemDirectoryHandle): Promise<string[]> {
        const filenames: string[] = [];
        try {
            for await (const entry of (directoryHandle as any).values()) {
                if (this.isFile(entry)) {
                    filenames.push(entry.name);
                }
            }
            return filenames;
        } catch (error) {
            this.handleException('listing files in directory', error as Error);
            return []; // Redundant due to handleException's never type
        }
    }

    // Method to rename a file or directory
    async rename(handle: FileSystemHandle, newName: string): Promise<void> {
        try {
            await (handle as any).move((handle as any).parent, newName);
        } catch (error) {
            this.handleException('renaming', error as Error);
        }
    }

    // Method to delete a file or directory
    async delete(handle: FileSystemHandle): Promise<void> {
        try {
            if (this.isDirectory(handle)) {
                await (handle as any).removeRecursively();
            } else {
                await (handle as any).remove();
            }
        } catch (error) {
            this.handleException('deleting', error as Error);
        }
    }

    async downloadFile(url: string, directoryHandle: FileSystemDirectoryHandle, fileName: string): Promise<void> {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok.');
            const blob = await response.blob();
            const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
            const writable = await (fileHandle as any).createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (error) {
            this.handleException('downloading and saving file', error as Error);
        }
    }

    // Method to asynchronously iterate over the contents of a directory
    async *iterateDirectory(directoryHandle: FileSystemDirectoryHandle): AsyncIterable<FileSystemHandle> {
        for await (const entry of (directoryHandle as any).values()) {
            yield entry;
        }
    }


}
