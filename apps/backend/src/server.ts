import Fastify, { FastifyInstance } from 'fastify';

/**
 * Builds and configures the Fastify server instance
 * @returns Configured Fastify server instance
 */
export function buildServer(): FastifyInstance {
  const server = Fastify({
    logger: true,
  });

  // Register routes
  server.get('/ping', async () => {
    return { pong: true };
  });

  return server;
}

export default buildServer;
