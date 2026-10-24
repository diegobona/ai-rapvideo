import { describe, expect, test } from 'vitest';
import { isAllowedAutoDlVideoUrl, isAllowedDanceVideoUrl } from '../../../apps/tanstack-app/src/lib/video-download';

const origin = 'https://cg-comfyui-prod.tos-cn-beijing.volces.com';
const video = `${origin}/comfyui/outputs/example-video.mp4`;

describe('Compshare and historical AutoDL download hosts', () => {
  const compshare = 'https://compshare-files.cn-wlcb.ufileos.com/media/prod/tenant/main/task-attempt-1.mp4';
  test.each([compshare, `${compshare}?ufileattname=task.mp4`, video])('allows the actual provider output: %s', url => {
    expect(isAllowedDanceVideoUrl(url)).toBe(true);
  });
  test.each([
    compshare.replace('ufileos.com', 'ufileos.com.attacker.test'),
    compshare.replace('/media/prod/', '/another/'),
    compshare.replace('https://', 'http://'),
    compshare.replace('https://', 'https://user:pass@'),
    compshare.replace('/main/', '/main/../'),
    compshare.replace('/main/', '/%2e%2e/'),
    `${compshare}#fragment`,
    ` ${compshare}`,
    compshare.replace('ufileos.com/', 'ufileos.com:444/'),
    'https://127.0.0.1/media/prod/output.mp4',
  ])('rejects unrelated or ambiguous provider URLs: %s', url => {
    expect(isAllowedDanceVideoUrl(url)).toBe(false);
  });
});

describe('AutoDL video download URL allowlist', () => {
  test.each([
    video,
    `${origin}:443/comfyui/outputs/example-video.mp4`,
    `${origin}/comfyui/outputs/2026/10/generated_001.mp4`,
    `${video}?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=test%2F20261014&X-Tos-Signature=example`,
    `${video}?file_name=video%20example.mp4&literal_hash=%23`,
  ])('allows the provider video location and signed query: %s', (value) => {
    expect(isAllowedAutoDlVideoUrl(value)).toBe(true);
  });

  test.each([
    undefined,
    null,
    {},
    42,
    '',
    '/comfyui/outputs/example-video.mp4',
    video.replace('https:', 'http:'),
    video.replace('https:', 'file:'),
    video.replace('cg-comfyui-prod', 'another-bucket'),
    video.replace('volces.com', 'volces.com.attacker.example'),
    video.replace('volces.com', 'volces.com.'),
    video.replace('https://', 'https://user:password@'),
    video.replace('https://', 'https://@'),
    video.replace('https://', 'https://cg-comfyui-prod.tos-cn-beijing.volces.com@attacker.example/'),
    video.replace('volces.com/', 'volces.com:444/'),
    video.replace('volces.com/', 'volces.com:0443/'),
    video.replace('cg-comfyui-prod', '%63g-comfyui-prod'),
    `${origin}/another-directory/example-video.mp4`,
    `${origin}/comfyui/outputs-backup/example-video.mp4`,
    `${origin}/comfyui/outputs/example-video.png`,
    `${origin}/comfyui/outputs/`,
    `${origin}/comfyui/outputs/.mp4`,
    `${video}#fragment`,
    `${video}?signature=example#fragment`,
    `${video} `,
    ` ${video}`,
    `${video}\n`,
    video.replace('outputs/', 'outputs/\t'),
    video.replace('/comfyui/', '\\comfyui/'),
    video.replace('https://', 'https:\\\\'),
    `${origin}/comfyui/outputs/../outputs/example-video.mp4`,
    `${origin}/comfyui/outputs/./example-video.mp4`,
    `${origin}/comfyui/outputs/nested/../example-video.mp4`,
    `${origin}/comfyui/outputs/%2e%2e/outputs/example-video.mp4`,
    `${origin}/comfyui/outputs/%252e%252e/example-video.mp4`,
    `${origin}/comfyui/outputs/%2fexample-video.mp4`,
    `${origin}/comfyui/outputs/example-video%2emp4`,
    `${origin}/comfyui/outputs/example-video%5c.mp4`,
    `${origin}/comfyui//outputs/example-video.mp4`,
    `${origin}/comfyui/outputs//example-video.mp4`,
    `${origin}/comfyui/outputs/视频.mp4`,
  ])('rejects unsupported or ambiguous URLs: %s', (value) => {
    expect(isAllowedAutoDlVideoUrl(value)).toBe(false);
  });

  test('limits the complete URL including the signed query to 8192 characters', () => {
    const prefix = `${video}?signature=`;
    const maximumUrl = `${prefix}${'a'.repeat(8192 - prefix.length)}`;
    expect(isAllowedAutoDlVideoUrl(maximumUrl)).toBe(true);
    expect(isAllowedAutoDlVideoUrl(`${maximumUrl}a`)).toBe(false);
  });
});
