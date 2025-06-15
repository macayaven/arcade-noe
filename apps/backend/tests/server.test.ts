import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/server.js';

describe('Server Routes', () => {
  describe('GET /ping', () => {
    it('should return status 200 and {pong: true}', async () => {
      const fastify = buildServer();
      
      const response = await fastify.inject({
        method: 'GET',
        url: '/ping',
      });
      
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({ pong: true });
    });
  });
});
