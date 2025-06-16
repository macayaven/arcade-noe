import Fastify from 'fastify';
import { generateVariation } from './variation';

const server = Fastify({
  logger: true,
});

server.get('/api/ping', async (request, reply) => {
  return { pong: 'it worked!' };
});

server.get('/api/variation/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  if (!id) {
    reply.status(400).send({ error: 'Game ID is required' });
    return;
  }
  try {
    const variation = generateVariation(id);
    return variation;
  } catch (error) {
    server.log.error(`Error generating variation for ID ${id}:`, error);
    reply.status(500).send({ error: 'Failed to generate variation' });
  }
});

const start = async () => {
  try {
    await server.listen({ port: 3002, host: '0.0.0.0' }); // Changed to port 3002 to avoid conflict
    server.log.info(`Server listening on port 3002`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
