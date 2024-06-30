import { ScriptValidator } from '../validator';

describe('ScriptValidator', () => {
  it('should validate a correct script', async () => {
    const validScript = 'console.log("Hello, World!");';
    const result = await ScriptValidator.validate(validScript);
    expect(result).toBe(true);
  });

  it('should reject an invalid script', async () => {
    const invalidScript = 'console.log("Unclosed string;';
    const result = await ScriptValidator.validate(invalidScript);
    expect(result).toBe(false);
  });
});
