import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
console.log('Site statique préparé dans dist/. Pour recevoir les demandes, utiliser le serveur Node.');
