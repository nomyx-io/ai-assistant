import codeModule from '../tools/codemod';

const codemod = codeModule.tools.action

import fs from 'fs';
import ts from 'typescript';
jest.mock('fs');

jest.mock('typescript', () => ({
    createSourceFile: jest.fn(),
    createPrinter: jest.fn(() => ({ printNode: jest.fn(), })),
    isFunctionDeclaration: jest.fn(),
    factory: { createNodeArray: jest.fn(), },
}));

describe('getSelectorNodes function tests', () => {
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
});

