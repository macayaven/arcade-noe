import Fastify from 'fastify';
import { generateVariation } from './variation';

const server = Fastify({
  logger: true,
});

server.get('/ping', async (request, reply) => {
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
    await server.listen({ port: 3001, host: '0.0.0.0' }); // Port 3001 to avoid conflict if frontend is on 3000
    server.log.info(`Server listening on port 3001`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
