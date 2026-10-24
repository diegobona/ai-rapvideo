import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Use the installed runtime directly: no newer Vitest pool/plugin is required.
const requireApp = createRequire(resolve('apps/tanstack-app/package.json'));
const { Miniflare } = requireApp('miniflare');
const { build } = requireApp('esbuild');
let runtime: InstanceType<typeof Miniflare>;
let directory: string;
let bundle: string;
const calls = new Map<string, number>();
const outcomes = new Map<string, string>();
const gates = new Map<string, Promise<void>>();

async function start() {
  runtime = new Miniflare({
    modules: true, script: bundle, compatibilityDate: '2026-03-17',
    compatibilityFlags: ['nodejs_compat'],
    durableObjects: { PAID_VIDEO_RECOVERY: { className: 'TestRecovery', useSQLite: true } },
    durableObjectsPersist: join(directory, 'objects'),
    d1Databases: { DB: 'recovery-test' }, d1Persist: join(directory, 'd1'),
    serviceBindings: {
      TEST_RECONCILE: async (request: Request) => {
        const id = new URL(request.url).pathname.slice(1);
        calls.set(id, (calls.get(id) || 0) + 1);
        await gates.get(id);
        return Response.json({ state: outcomes.get(id) || 'processing' },
          { status: outcomes.get(id) === 'outage' ? 503 : 200 });
      },
    },
  });
  await runtime.ready;
}
async function control(id: string, action: string) {
  const response = await runtime.dispatchFetch(`http://local/${action}?id=${id}`);
  expect(response.status).toBe(200);
  return response.json();
}
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'paid-video-recovery-'));
  const result = await build({
    stdin: {
      contents: `
        import { PaidVideoRecovery } from './apps/tanstack-app/src/lib/paid-video-recovery-object';
        export class TestRecovery extends PaidVideoRecovery {
          async inspect() {
            return {seed:await this.ctx.storage.get('seed'), alarm:await this.ctx.storage.getAlarm(),
              sqlite:this.ctx.storage.sql.exec('SELECT 1 AS n').one().n};
          }
          async fire() { await this.ctx.storage.setAlarm(Date.now() + 1); }
        }
        export default { async fetch(request,env) {
          const url=new URL(request.url), id=url.searchParams.get('id');
          const stub=env.PAID_VIDEO_RECOVERY.getByName(id);
          if(url.pathname==='/wake') await stub.wake(id);
          if(url.pathname==='/fire') await stub.fire();
          return Response.json(await stub.inspect());
        }};
      `,
      resolveDir: process.cwd(), loader: 'ts',
    },
    bundle: true, write: false, format: 'esm', platform: 'neutral',
    external: ['cloudflare:workers', 'node:async_hooks'],
    plugins: [{
      name: 'local-only-domain-boundaries',
      setup(plugin: any) {
        plugin.onResolve({ filter: /^@libs\/database$/ }, () => ({ path: 'database', namespace: 'test' }));
        plugin.onResolve({ filter: /^@libs\/ai\/paid-video$/ }, () => ({ path: 'domain', namespace: 'test' }));
        plugin.onResolve({ filter: /paid-dance-service$/ }, () => ({ path: 'dependencies', namespace: 'test' }));
        plugin.onLoad({ filter: /.*/, namespace: 'test' }, (args: { path: string }) => ({
          contents: args.path === 'database' ? `
            import {AsyncLocalStorage} from 'node:async_hooks';
            const db=new AsyncLocalStorage();
            export const withD1=(binding,fn)=>db.run(binding,fn);
            export const currentDb=()=>db.getStore();
          ` : args.path === 'dependencies' ? `
            export const paidDanceDependencies=async (_stripe,recovery)=>{
              if(recovery!==false) throw new Error('Alarm must not RPC itself');
              return {validateInputs:async()=>{}};
            };
          ` : `
            import {env} from 'cloudflare:workers';
            import {currentDb} from '@libs/database';
            export const reconcilePaidVideoPurchase=async(id,deps)=>{
              if(deps.scheduleRecovery) throw new Error('Self RPC');
              await deps.validateInputs({},'owner');
              const db=currentDb(); if(!db) throw new Error('Missing D1 context');
              await db.prepare('SELECT 1').first();
              const response=await env.TEST_RECONCILE.fetch('http://private/'+id);
              if(!response.ok) throw new Error('Simulated temporary outage');
              return response.json();
            };
          `,
          loader: 'js',
        }));
      },
    }],
  });
  bundle = result.outputFiles[0].text;
  await start();
}, 20_000);
afterAll(async () => {
  await runtime?.dispose();
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('seed and alarm persist across a real runtime restart and purchase objects remain separate', async () => {
  const one = await control('restart-one', 'wake');
  const two = await control('restart-two', 'wake');
  expect(one).toMatchObject({ seed: { purchaseId: 'restart-one', version: 1 }, sqlite: 1 });
  expect(one.alarm).toBeGreaterThan(Date.now());
  expect(two.seed.purchaseId).toBe('restart-two');
  await runtime.dispose();
  await start();
  expect(await control('restart-one', 'inspect')).toEqual(one);
  expect(await control('restart-two', 'inspect')).toEqual(two);
}, 15_000);

test('an actual alarm runs without browser traffic and keeps a durable retry through repeated failures', async () => {
  outcomes.set('outage', 'outage');
  await control('outage', 'wake');
  for (let n = 1; n <= 8; n++) {
    await control('outage', 'fire');
    await vi.waitFor(() => expect(calls.get('outage')).toBe(n));
    await vi.waitFor(async () => {
      const snapshot = await control('outage', 'inspect');
      expect(snapshot.alarm).toBeGreaterThan(Date.now() + 30_000);
      expect(snapshot.seed.purchaseId).toBe('outage');
    });
  }
  outcomes.set('outage', 'succeeded');
  await control('outage', 'fire');
  await vi.waitFor(async () => expect((await control('outage', 'inspect')).alarm).toBeNull());
  expect((await control('outage', 'inspect')).seed).toBeUndefined();
}, 15_000);

test('terminal cleanup preserves a concurrent wake and stops only after its newer work is checked', async () => {
  let release!: () => void;
  gates.set('race', new Promise<void>((resolve) => { release = resolve; }));
  outcomes.set('race', 'expired');
  await control('race', 'wake');
  await control('race', 'fire');
  await vi.waitFor(() => expect(calls.get('race')).toBe(1));
  const newer = await control('race', 'wake');
  expect(newer.seed.version).toBe(2);
  release();
  gates.delete('race');
  await vi.waitFor(async () => {
    const snapshot = await control('race', 'inspect');
    expect(snapshot.seed.version).toBe(2);
    expect(snapshot.alarm).toBeGreaterThan(Date.now());
  });
  await control('race', 'fire');
  await vi.waitFor(async () => expect((await control('race', 'inspect')).alarm).toBeNull());
  // A later real settlement can restart a terminal object's schedule.
  outcomes.set('race', 'processing');
  await control('race', 'wake');
  await control('race', 'fire');
  await vi.waitFor(() => expect(calls.get('race')).toBe(3));
  expect((await control('race', 'inspect')).alarm).toBeGreaterThan(Date.now());
}, 15_000);
