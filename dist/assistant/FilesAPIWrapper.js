"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
class FilesAPIWrapper {
    // Existing class content...
    // Utility method to check if the FileSystemHandle is a file
    isFile(handle) {
        return handle.kind === 'file';
    }
    // Utility method to check if the FileSystemHandle is a directory
    isDirectory(handle) {
        return handle.kind === 'directory';
    }
    // Improved error handling with custom exception
    handleException(operation, error) {
        console.error(`Error during ${operation}:`, error);
        throw new Error(`FilesAPIWrapperError during ${operation}: ${error.message}`);
    }
    // Utility Methods for Common Tasks
    formatFileSize(bytes, decimalPoint = 2) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024, dm = decimalPoint < 0 ? 0 : decimalPoint, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'], i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    getFileTypeAndMetadata(fileHandle) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const file = yield fileHandle.getFile();
                return {
                    type: file.type,
                    size: this.formatFileSize(file.size),
                    lastModified: new Date(file.lastModified).toLocaleString()
                };
            }
            catch (error) {
                this.handleException('getting file type and metadata', error);
            }
        });
    }
    // Permissions Management
    checkPermission(fileHandle, mode = 'read') {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const options = { mode };
                // Permissions API is not fully integrated with File System Access API in all browsers yet
                // This is a fallback until it's fully supported
                if (fileHandle.permissions && fileHandle.permissions.query) {
                    return (yield fileHandle.permissions.query(options)).state;
                }
                else {
                    console.warn('Permissions API not fully supported. Assuming permission granted.');
                    return 'granted';
                }
            }
            catch (error) {
                this.handleException('checking permission', error);
            }
        });
    }
    // Generic method for reading files, allowing for different return types
    readFile(fileHandle, type = 'text') {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const file = yield fileHandle.getFile();
                switch (type) {
                    case 'text':
                        return yield file.text();
                    case 'arrayBuffer':
                        return yield file.arrayBuffer();
                    case 'blob':
                        return yield file.blob();
                    default:
                        throw new Error('Unsupported read type');
                }
            }
            catch (error) {
                this.handleException('reading file', error);
            }
        });
    }
    // Method for reading a file as a stream
    readFileAsStream(fileHandle) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const file = yield fileHandle.getFile();
                return file.stream();
            }
            catch (error) {
                this.handleException('reading file as stream', error);
            }
        });
    }
    // Method for writing data to a file using a stream
    writeFileAsStream(fileHandle, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const writable = yield fileHandle.createWritable();
                yield writable.write(data);
                yield writable.close();
            }
            catch (error) {
                this.handleException('writing file as stream', error);
            }
        });
    }
    // Method for writing data to a file, supporting different data types
    writeFile(fileHandle, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const writable = yield fileHandle.createWritable();
                yield writable.write(data);
                yield writable.close();
            }
            catch (error) {
                this.handleException('writing file', error);
            }
        });
    }
    // Method to create a new file within a directory
    createFile(directoryHandle, fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield directoryHandle.getFileHandle(fileName, { create: true });
            }
            catch (error) {
                this.handleException('creating file', error);
            }
        });
    }
    // Method to open file(s) with options for multiple selections
    openFile(multiple = false) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const options = { multiple };
                return yield window.showOpenFilePicker(options);
            }
            catch (error) {
                this.handleException('picking a file', error);
                return null; // This return is now redundant due to the never return type of handleException but kept for clarity
            }
        });
    }
    // Method to open a directory and list its contents
    openDirectory() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield window.showDirectoryPicker();
            }
            catch (error) {
                this.handleException('picking a directory', error);
                return null; // Redundant due to handleException's never type
            }
        });
    }
    // Method to list files in a given directory
    listFilesInDirectory(directoryHandle) {
        var _a, e_1, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const filenames = [];
            try {
                try {
                    for (var _d = true, _e = __asyncValues(directoryHandle.values()), _f; _f = yield _e.next(), _a = _f.done, !_a;) {
                        _c = _f.value;
                        _d = false;
                        try {
                            const entry = _c;
                            if (this.isFile(entry)) {
                                filenames.push(entry.name);
                            }
                        }
                        finally {
                            _d = true;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return filenames;
            }
            catch (error) {
                this.handleException('listing files in directory', error);
                return []; // Redundant due to handleException's never type
            }
        });
    }
    // Method to rename a file or directory
    rename(handle, newName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield handle.move(handle.parent, newName);
            }
            catch (error) {
                this.handleException('renaming', error);
            }
        });
    }
    // Method to delete a file or directory
    delete(handle) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.isDirectory(handle)) {
                    yield handle.removeRecursively();
                }
                else {
                    yield handle.remove();
                }
            }
            catch (error) {
                this.handleException('deleting', error);
            }
        });
    }
    downloadFile(url, directoryHandle, fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(url);
                if (!response.ok)
                    throw new Error('Network response was not ok.');
                const blob = yield response.blob();
                const fileHandle = yield directoryHandle.getFileHandle(fileName, { create: true });
                const writable = yield fileHandle.createWritable();
                yield writable.write(blob);
                yield writable.close();
            }
            catch (error) {
                this.handleException('downloading and saving file', error);
            }
        });
    }
    // Method to asynchronously iterate over the contents of a directory
    iterateDirectory(directoryHandle) {
        return __asyncGenerator(this, arguments, function* iterateDirectory_1() {
            var _a, e_2, _b, _c;
            try {
                for (var _d = true, _e = __asyncValues(directoryHandle.values()), _f; _f = yield __await(_e.next()), _a = _f.done, !_a;) {
                    _c = _f.value;
                    _d = false;
                    try {
                        const entry = _c;
                        yield yield __await(entry);
                    }
                    finally {
                        _d = true;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield __await(_b.call(_e));
                }
                finally { if (e_2) throw e_2.error; }
            }
        });
    }
}
