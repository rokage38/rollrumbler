import { PeerServer } from 'peer';
PeerServer({ port: 9000, path: '/', host: '127.0.0.1' });
console.log('peer server on 127.0.0.1:9000');
