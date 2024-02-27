import path from "path";
import * as executeModule from "../tools/execute";
import { promises as fs } from "fs";
import { exec } from "child_process";

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  }
}));

jest.mock('path', () => ({
  join: jest.fn()
}));

jest.mock('child_process', () => {
  return {
    exec: jest.fn((cmd, callback) => {
      callback(null, "Hello, World!", "");
    }),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

const execute = (executeModule as any).tools.execute_code

it('executes bash command successfully', async () => {
  const bashCommand = "echo Hello, World!";
  const result = await execute({ language: "bash", code: bashCommand });
  expect(result).toEqual( "Hello, World!" );
  expect((exec as any)).toHaveBeenCalledWith(bashCommand, expect.any(Function));
});

it('executes python code successfully', async () => {
  const pythonCode = "print('Hello, World!')";
  const mockFileName = "/mock/dir/tempFile.py";

  // Mocking path.join functionality
  (path.join as jest.Mock).mockReturnValue(mockFileName);

  // Mocking child_process functionality                                                                                                  
  (exec as any).mockImplementation((cmd: any, callback: any) => {
    callback(null, "Hello, World!", "");
  });

  const result = await execute({ language: "python", code: pythonCode });
  expect(result).toEqual(JSON.stringify("Hello, World!"));
  expect((path.join as jest.Mock)).toHaveBeenCalled();
  expect((fs.writeFile as jest.Mock)).toHaveBeenCalled();
  expect((fs.unlink as jest.Mock)).toHaveBeenCalled();
  expect((exec as any)).toHaveBeenCalledWith(`python ${mockFileName}`, expect.any(Function));
});

it('handles errors in python code execution', async () => {
  const pythonCode = "raise Exception('Error')";
  const mockFileName = "/mock/dir/tempFile.py";

  // Setup mocks as before but change exec mock                                                                                           
  (path.join as jest.Mock).mockReturnValue(mockFileName);
  (exec as any).mockImplementation((cmd: any, callback: any) => {
    callback(new Error('Error'), "", "");
  });
  const result = await execute({ language: "python", code: pythonCode });
  expect(result).toContain('Error');
  // Assert other mocks were called as before                                                                                             
}); 

it('executes javascript code successfully', async () => {
  const jsCode = "console.log('Hello, World!')";
  const mockFileName = "/mock/dir/tempFile.js";

  (path.join as jest.Mock).mockReturnValue(mockFileName);
  (exec as any).mockImplementation((cmd: any, callback: any) => {
    callback(null, "Hello, World!", "");
  });

  const result = await execute({ language: "javascript", code: jsCode });
  expect(result).toEqual(JSON.stringify("Hello, World!"));
  expect((path.join as jest.Mock)).toHaveBeenCalled();
  expect((fs.writeFile as jest.Mock)).toHaveBeenCalled();
  expect((fs.unlink as jest.Mock)).toHaveBeenCalled();
  expect((exec as any)).toHaveBeenCalledWith(`node ${mockFileName}`, expect.any(Function));
});

it('handles errors in javascript code execution', async () => {
  const jsCode = "throw new Error('Error')";
  const mockFileName = "/mock/dir/tempFile.js";

  (path.join as jest.Mock).mockReturnValue(mockFileName);
  (exec as any).mockImplementation((cmd: any, callback: any) => {
    callback(new Error('Error'), "", "");
  });

  const result = await execute({ language: "javascript", code: jsCode });
  expect(result).toContain('Error');
});

it('executes typescript code successfully', async () => {
  const tsCode = "console.log('Hello, World!')";
  const mockFileName = "/mock/dir/tempFile.js";

  (path.join as jest.Mock).mockReturnValue(mockFileName);
  (exec as any).mockImplementation((cmd: any, callback: any) => {
    callback(null, "Hello, World!", "");
  });

  const result = await execute({ language: "typescript", code: tsCode });
  expect(result).toEqual(JSON.stringify("Hello, World!"));
  expect((path.join as jest.Mock)).toHaveBeenCalled();
  expect((fs.writeFile as jest.Mock)).toHaveBeenCalled();
  expect((fs.unlink as jest.Mock)).toHaveBeenCalled();
  expect((exec as any)).toHaveBeenCalledWith(`ts-node ${mockFileName}`, expect.any(Function));
});

it('handles errors in typescript code execution', async () => {
  const tsCode = "throw new Error('Error')";
  const mockFileName = "/mock/dir/tempFile.js";

  (path.join as jest.Mock).mockReturnValue(mockFileName);
  (exec as any).mockImplementation((cmd: any, callback: any) => {
    callback(new Error('Error'), "", "");
  });

  const result = await execute({ language: "typescript", code: tsCode });
  expect(result).toContain('Error');
});

it('handles invalid language', async () => {
  const result = await execute({ language: "invalid", code: "code" });
  expect(result).toContain('Unsupported language');
});
