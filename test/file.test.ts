

// Import file.ts
import * as fileModule from "../tools/file";
import path from "path";

let { file, files } = (fileModule as any).tools;
file = file
files = files

describe("Testing file.ts file", () => {

  test("read directory", async () => {
    const directoryPath = path.resolve("test");
    const files = await file.action({operation: "read", path: directoryPath });
    expect(files).toBeTruthy();
  });

  test("read file", async () => {
    const filePath = path.resolve("test/tmp/read-test.txt");
    const content = await file.action({ operation: "read", path: filePath });
    expect(content).toBe("Test ContentTest ContentTest Content");
  });

  test('write', async () => {                                                                                                                            
    const filePath = path.resolve("test/tmp/edit-test.txt");                                                                                            
    const content = "Test Content";
    const result = await file.action({ operation: "write", path: filePath, data: content });
    expect(result).toBe("Successfully executed write operation on file " + path.join(__dirname, 'tmp/edit-test.txt'));                                                                                                   
  });

  test('append', async () => {                                                                                                                           
    const filePath = path.resolve("test/tmp/edit-test.txt");                                                                             
    const content = "Test Content";
    const result = await file.action({ operation: "append", path: filePath, data: content });
    expect(result).toBe("Successfully executed append operation on file " + path.join(__dirname, 'tmp/edit-test.txt'));                                                                                                   
  });

  test('prepend', async () => {                                                                                                                           
    const filePath = path.resolve("test/tmp/edit-test.txt");                                                                                                    
    const content = "Test Content";
    const result = await file.action({ operation: "prepend", path: filePath, data: content });
    expect(result).toBe("Successfully executed prepend operation on file " + path.join(__dirname, 'tmp/edit-test.txt'));                                                                                                   
  });

  test('replace', async () => {                                                                                                                           
    const filePath = path.resolve("test/tmp/edit-test.txt");                                                                                                    
    const content = "Test Content";
    const result = await file.action({ operation: "replace", path: filePath, match: "Test", data: content });
    expect(result).toBe("Successfully executed replace operation on file " + path.join(__dirname, 'tmp/edit-test.txt'));                                                                                                   
  });

  test('insert_at', async () => {                                                                                                                           
    const filePath = path.resolve("test/tmp/edit-test.txt");                                                                                                    
    const content = "Test Content";
    const result = await file.action({ operation: "insert_at", path: filePath, position: 5, data: content });
    expect(result).toBe("Successfully executed insert_at operation on file " + path.join(__dirname, 'tmp/edit-test.txt'));                                                                                                   
  });

  test('remove', async () => {                                                                                                                           
    const filePath = path.resolve("test/tmp/edit-test.txt");                                                                                                    
    const content = "Test Content";
    const result = await file.action({ operation: "remove", path: filePath, match: "Test" });
    expect(result).toBe("Successfully executed remove operation on file " + path.join(__dirname, 'tmp/edit-test.txt'));                                                                                                   
  });

  test('delete', async () => {                                                                                                                           
    const filePath = path.resolve("test/tmp/edit-test.txt");                                                                                                    
    const result = await file.action({ operation: "delete", path: filePath });
    expect(result).toBe("Successfully executed delete operation on file " + path.join(__dirname, 'tmp/edit-test.txt'));                                                                                                   
  });

  test('copy', async () => {                                                                                                                           
    const filePath = path.resolve("test/tmp/edit-test.txt");                                                                                                    
    const target = path.resolve("test/tmp/edit-test-copy.txt");                                                                                                    
    const result = await file.action({ operation: "copy", path: filePath, target });
    expect(result).toBe("Successfully executed copy operation on file " + path.join(__dirname, 'tmp/edit-test.txt'));                                                                                                   
  });
});

