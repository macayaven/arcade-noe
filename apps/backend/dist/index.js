"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const variation_1 = require("./variation");
const server = (0, fastify_1.default)({
    logger: true,
});
server.get('/api/ping', async (request, reply) => {
    return { pong: 'it worked!' };
});
server.get('/api/variation/:id', async (request, reply) => {
    const { id } = request.params;
    if (!id) {
        reply.status(400).send({ error: 'Game ID is required' });
        return;
    }
    try {
        const variation = (0, variation_1.generateVariation)(id);
        return variation;
    }
    catch (error) {
        server.log.error(`Error generating variation for ID ${id}:`, error);
        reply.status(500).send({ error: 'Failed to generate variation' });
    }
});
const start = async () => {
    try {
        await server.listen({ port: 3002, host: '0.0.0.0' }); // Changed to port 3002 to avoid conflict
        server.log.info(`Server listening on port 3002`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
