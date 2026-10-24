import { beforeAll, expect, test } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const requireApp = createRequire(resolve('apps/tanstack-app/package.json'));
const { Miniflare, createFetchMock } = requireApp('miniflare');
const { build } = requireApp('esbuild');
let script: string;

beforeAll(async () => {
  const bundled = await build({
    stdin: { resolveDir: process.cwd(), loader: 'ts', contents: `
      import {compshareCreateVideoTask,compshareQueryVideoTask} from './libs/ai/compshare-video';
      export default {async fetch(request) {
        try {
          const id = await compshareCreateVideoTask({provider:'compshare',model:'MiniMax-H3',prompt:'A fictional adult dances.',duration:10,size:'768P',aspectRatio:'9:16',idempotencyKey:'dance-runtime-order'});
          return Response.json({id,task:await compshareQueryVideoTask('MiniMax-H3',id)});
        } catch(error) {return Response.json({name:error.name,message:error.message},{status:500});}
      }};
    ` },
    bundle: true, write: false, platform: 'neutral', format: 'esm',
  });
  script = bundled.outputFiles[0].text;
});

test('the actual Workers runtime submits and polls with the original payment key', async () => {
  const mock = createFetchMock();
  mock.disableNetConnect();
  const pool = mock.get('https://cp.compshare.cn');
  pool.intercept({ path: '/minimax/v2/video_generation', method: 'POST', headers: {'idempotency-key':'dance-runtime-order'} }).reply(200, {task_id:'runtime-task'});
  pool.intercept({ path: '/minimax/v2/query/video_generation/runtime-task', method: 'GET' }).reply(200, {task:{id:'runtime-task',status:'running'}});
  const runtime = new Miniflare({ modules:true, script, compatibilityDate:'2026-03-17', compatibilityFlags:['nodejs_compat'], bindings:{COMPSHARE_API_KEY:'sk-ml-runtime-fixture'}, fetchMock:mock });
  try {
    const response = await runtime.dispatchFetch('https://runtime.test/');
    const body = await response.json();
    expect(body).toEqual({id:'runtime-task',task:{status:'processing'}});
    expect(response.status).toBe(200);
    mock.assertNoPendingInterceptors();
  } finally { await runtime.dispose(); }
}, 15000);

test('the actual Workers runtime rejects redirects instead of following the API key to another host', async () => {
  let calls = 0;
  const runtime = new Miniflare({ modules:true, script, compatibilityDate:'2026-03-17', compatibilityFlags:['nodejs_compat'], bindings:{COMPSHARE_API_KEY:'sk-ml-runtime-fixture'}, outboundService: async (request: Request) => {
    calls++;
    expect(new URL(request.url).hostname).toBe('cp.compshare.cn');
    return new Response(null, {status:302,headers:{location:'https://other.test/'}});
  } });
  try {
    const response = await runtime.dispatchFetch('https://runtime.test/');
    expect(await response.json()).toMatchObject({message:'Compshare API HTTP error: 302'});
    expect(response.status).toBe(500);
    expect(calls).toBe(1);
  } finally { await runtime.dispose(); }
}, 15000);
