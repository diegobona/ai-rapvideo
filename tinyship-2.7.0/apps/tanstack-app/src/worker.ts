import server from '@tanstack/react-start/server-entry';
export { PaidVideoRecovery } from './lib/paid-video-recovery-object';

// Keep TanStack's installed server entry and fetch behavior intact.
export default {
  fetch: server.fetch,
};
