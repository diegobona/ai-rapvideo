import { afterAll, beforeAll, expect, test } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { MEDIA_RETENTION_MS } from '../../../config/mediaRetention';

const requireApp = createRequire(resolve('apps/tanstack-app/package.json'));
const { Miniflare } = requireApp('miniflare');
const { build } = requireApp('esbuild');
let runtime: InstanceType<typeof Miniflare>;
let upstreamRequests = 0;

beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `
        import {createManagedVideoResultStorage} from './libs/ai/video-result-storage';
        export default {async fetch(request,env) {
          if(new URL(request.url).pathname==='/atomic') {
            const options={onlyIf:{etagDoesNotMatch:'*'}};
            const first=await env.R2_BUCKET.put('atomic.mp4','first',options);
            const second=await env.R2_BUCKET.put('atomic.mp4','second',options);
            return Response.json({first:!!first,second,body:await (await env.R2_BUCKET.get('atomic.mp4')).text()});
          }
          const task={id:'task_1',userId:'owner',provider:'autodl',model:'minimax-h3',createdAt:Date.now()};
          const source={provider:'autodl',model:'minimax-h3',videoUrl:'https://cg-comfyui-prod.tos-cn-beijing.volces.com/comfyui/outputs/test.mp4'};
          const store=createManagedVideoResultStorage({bucket:env.R2_BUCKET,publicUrl:'https://media.example',
            fetch:(url,options)=>env.UPSTREAM.fetch(url,options)});
          const saved=await store(task,source);
          const object=await env.R2_BUCKET.get(saved.storageKey);
          return Response.json({saved,uploaded:object.uploaded.getTime(),contentType:object.httpMetadata.contentType,
            cacheControl:object.httpMetadata.cacheControl,bytes:Array.from(new Uint8Array(await object.arrayBuffer()))});
        }};
      `,
      resolveDir: process.cwd(), loader: 'ts',
    },
    bundle: true, write: false, format: 'esm', platform: 'neutral',
  });
  runtime = new Miniflare({
    modules: true, script: result.outputFiles[0].text, compatibilityDate: '2026-03-17',
    r2Buckets: { R2_BUCKET: 'retention-output-test' },
    serviceBindings: {
      UPSTREAM: async () => {
        upstreamRequests++;
        return new Response(new Uint8Array([0, 0, 0, 1]), {
          headers: { 'Content-Type': 'video/mp4', 'Content-Length': '4' },
        });
      },
    },
  });
  await runtime.ready;
}, 20_000);
afterAll(async () => { await runtime?.dispose(); });

test('native Workers streams provider response into R2 and reuses it without resetting expiry', async () => {
  const response = await runtime.dispatchFetch('https://local/copy');
  expect(response.status).toBe(200);
  const first = await response.json();
  expect(first).toMatchObject({
    saved: { videoUrl: 'https://media.example/generated-videos/owner/task_1.mp4', storageKey: 'generated-videos/owner/task_1.mp4' },
    contentType: 'video/mp4', cacheControl: 'private, no-store', bytes: [0, 0, 0, 1],
  });
  expect(first.saved.expiresAt).toBe(first.uploaded + MEDIA_RETENTION_MS);
  const second = await (await runtime.dispatchFetch('https://local/copy')).json();
  expect(second.saved.expiresAt).toBe(first.saved.expiresAt);
  expect(upstreamRequests).toBe(1);
});

test('native R2 conditional PUT cannot overwrite an existing object', async () => {
  const response = await runtime.dispatchFetch('https://local/atomic');
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ first: true, second: null, body: 'first' });
});
