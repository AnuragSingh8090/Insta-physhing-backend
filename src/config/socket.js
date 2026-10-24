/**
 * Singleton holder for the socket.io instance.
 *
 * The Express app (and the request-logger middleware) need to emit
 * events to connected clients, but the io server is created in
 * server.js after the Express app is built.  This module breaks the
 * circular dependency: server.js calls setIo() once the server is
 * ready, and any other module can call getIo() to access it.
 */
let io = null;

const setIo = (instance) => { io = instance; };
const getIo = () => io;

module.exports = { setIo, getIo };
