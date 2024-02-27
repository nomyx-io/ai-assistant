import fs from 'fs';
import ts from 'typescript';
import codeModule from '../tools/codemod';

const codemod = codeModule.tools.action

jest.mock('fs');

describe('mainFunction function tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array if there are no selectors', () => {
    const fakeSourceCode = 'const x = 5;';
    (fs.readFileSync as any).mockReturnValueOnce(fakeSourceCode);
    (ts.createSourceFile as any).mockReturnValueOnce({ statements: [] });

    const result = codemod.getSelectorNodes({ filePath: 'fakePath.ts' });

    expect(result).toEqual([]);
  });

  it('should append code snippet correctly at the end of the file', () => {
    const fakeSourceCode = 'const x = 5;';
    const fakeSnippet = '\nconst y = 100;';
    const expectedOutput = 'const x = 5;\nconst y = 100;';

    (fs.readFileSync as any).mockReturnValueOnce(fakeSourceCode);
    (ts.createSourceFile as any).mockReturnValueOnce({ statements: [] });
    (ts.createPrinter().printNode as any).mockReturnValueOnce(expectedOutput);

    codemod.appendCode({ filePath: 'fakePath.ts', codeSnippet: fakeSnippet });
  });

  it('should return empty array if there are no selectors', () => {
    const fakeSourceCode = 'const x = 5;';
    (fs.readFileSync as any).mockReturnValueOnce(fakeSourceCode);
    (ts.createSourceFile as any).mockReturnValueOnce({ statements: [] });

    const result = codemod.getSelectorNodes({ filePath: 'fakePath.ts' });

    expect(result).toEqual([]);
  });
});

