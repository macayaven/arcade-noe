import Fastify from 'fastify';

const server = Fastify({
  logger: true,
});

server.get('/ping', async (request, reply) => {
  return { pong: 'it worked!' };
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
