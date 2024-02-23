import path from "path";

const { execute_python_code } = require('./path/to/your/module');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

jest.mock('fs');
jest.mock('path');
jest.mock('child_process', () => {
  return {
    exec: jest.fn(),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});


it('executes python code successfully', async () => {
    const pythonCode = "print('Hello, World!')";
    const mockFileName = "/mock/dir/tempFile.py";
    
    // Mocking path and fs functionality
    path.join.mockReturnValue(mockFileName);
    fs.writeFileSync.mockResolvedValue(undefined);
    fs.unlinkSync.mockResolvedValue(undefined);
  
    // Mocking child_process functionality
    exec.mockImplementation((cmd, callback) => {
      callback(null, "Hello, World!", "");
    });
  
    const result = await execute_python_code({ python: pythonCode });
    expect(result).toEqual(JSON.stringify("Hello, World!"));
    expect(path.join).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalled();
    expect(exec).toHaveBeenCalledWith(`python ${mockFileName}`, expect.any(Function));
  });

  it('handles errors in python code execution', async () => {
    const pythonCode = "raise Exception('Error')";
    const mockFileName = "/mock/dir/tempFile.py";
    
    // Setup mocks as before but change exec mock
    path.join.mockReturnValue(mockFileName);
    fs.writeFileSync.mockResolvedValue(undefined);
    fs.unlinkSync.mockResolvedValue(undefined);
    exec.mockImplementation((cmd, callback) => {
      callback(new Error('Error'), "", "");
    });
  
    const result = await execute_python_code({ python: pythonCode });
    expect(result).toContain('Error');
    // Assert other mocks were called as before
  });