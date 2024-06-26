const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

async function busybox(command, ...args) {
  try {
    switch (command) {
      case 'ls':
        return await listFiles(args[0] || '.');
      case 'cat':
        return await readFile(args[0]);
      case 'echo':
        return args.join(' ');
      case 'touch':
        return await createFile(args[0]);
      case 'rm':
        return await removeFile(args[0]);
      case 'mkdir':
        return await createDirectory(args[0]);
      case 'rmdir':
        return await removeDirectory(args[0]);
      case 'cp':
        return await copyFile(args[0], args[1]);
      case 'mv':
        return await moveFile(args[0], args[1]);
      case 'pwd':
        return process.cwd();
      case 'date':
        return new Date().toString();
      case 'whoami':
        return process.env.USER || process.env.USERNAME || 'Unknown';
      case 'uname':
        return `${process.platform} ${process.arch}`;
      default:
        return `Unknown command: ${command}`;
    }
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function listFiles(dir) {
  const files = await fs.readdir(dir);
  return files.join('\n');
}

async function readFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return content;
}

async function createFile(filePath) {
  await fs.writeFile(filePath, '');
  return `File created: ${filePath}`;
}

async function removeFile(filePath) {
  await fs.unlink(filePath);
  return `File removed: ${filePath}`;
}

async function createDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
  return `Directory created: ${dirPath}`;
}

async function removeDirectory(dirPath) {
  await fs.rmdir(dirPath, { recursive: true });
  return `Directory removed: ${dirPath}`;
}

async function copyFile(source, destination) {
  await fs.copyFile(source, destination);
  return `File copied from ${source} to ${destination}`;
}

async function moveFile(source, destination) {
  await fs.rename(source, destination);
  return `File moved from ${source} to ${destination}`;
}

// Example usage:
async function main() {
  console.log(await busybox('ls', '.'));
  console.log(await busybox('echo', 'Hello', 'World'));
  console.log(await busybox('cat', 'nonexistent.txt'));
  console.log(await busybox('pwd'));
  console.log(await busybox('date'));
  console.log(await busybox('whoami'));
  console.log(await busybox('uname'));
  console.log(await busybox('invalid_command'));
}

main();