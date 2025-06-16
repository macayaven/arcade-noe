// This test will use Vitest, assuming it's configured at the root
// and can run tests from workspace packages.
// We'll need to adjust Vitest config later if needed.

import { FastifyInstance } from 'fastify';
import { server } from '../index'; // Adjusted import path

describe('Backend API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = server; // Use the imported server instance
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /ping should return { pong: "it worked!" }', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ping',
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ pong: 'it worked!' });
  });
});
