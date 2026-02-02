const { validateEnvironment, validateDirectories, validatePort } = require('../utils/startup');

describe('Startup Validation', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    it('should fail without JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      const result = validateEnvironment();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('JWT_SECRET');
    });

    it('should fail with short JWT_SECRET', () => {
      process.env.JWT_SECRET = 'short';
      const result = validateEnvironment();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should pass with valid JWT_SECRET', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      const result = validateEnvironment();
      expect(result.errors.length).toBe(0);
    });

    it('should use default PORT if not set', () => {
      delete process.env.PORT;
      const result = validateEnvironment();
      expect(process.env.PORT).toBe('5000');
    });

    it('should use default NODE_ENV if not set', () => {
      delete process.env.NODE_ENV;
      const result = validateEnvironment();
      expect(process.env.NODE_ENV).toBe('development');
    });
  });

  describe('validatePort', () => {
    it('should pass with available port', async () => {
      process.env.PORT = '5001'; // Use different port to avoid conflicts
      const result = await validatePort();
      expect(result.errors.length).toBe(0);
    });
  });
});
