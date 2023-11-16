import { downloadZMQ } from '@vscode/zeromq';
// Download all binaries for all platforms and all architectures

export function getZeroMQ(): typeof import("zeromq") | undefined {
    try {
        const zmq = require("zeromq") as typeof import("zeromq");
        return zmq;
    } catch {}
    try {
        downloadZMQ();
    } catch(e) {
        //throw(e);
        return undefined;
    }
    return require("zeromq") as typeof import("zeromq");
}