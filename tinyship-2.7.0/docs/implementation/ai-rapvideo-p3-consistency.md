# AI Rap Video P3 一致性检查 — 2026-10-24

站内修复已部署至 [ai-rapvideo.co](https://ai-rapvideo.co/)，Worker 版本为 `e48747f0-ed29-41dd-aae6-245995501077`。站内公开页面与旧静态素材检查通过。2026-10-24，用户明确授权后，共享 Stripe 商品名称已改为 `AI Rap Video`；已读回验证名称、现有 Price ID 及 $4.99 USD 价格。本次只改远端商品名称，无需重新部署网站。

## 定价、退款与数据保留

| 项目 | 当前规则 | 证据 |
| --- | --- | --- |
| 定价 | 每条 $4.99 USD，单次支付，无订阅或自动续费 | 配置 amount=499、currency=usd；现有 Stripe active one_time Price 实时只读核对一致；页面所有金额检查一致 |
| 退款 | 确认生成失败后，全额退还 $4.99 USD 至原支付方式；临时网络/查询异常不直接视作生成失败 | 首页、付款弹窗、FAQ、条款已统一；现有退款实现补足未退金额 |
| 自动删除 | 每个上传图片或保存视频存储 24 小时后计划自动删除；后台执行可能延迟 | 本轮实时 R2 lifecycle list：uploads/、generated-videos/ 均 enabled，Expire objects after 1 days |

后台生成提示词、已有订单、R2 中工作流参考素材、数据库/模板/cookie 等现有资源标识按先前要求保留。本轮未迁移生成服务的媒体域名配置，也不属于“全仓库旧字符串清零”。已移除本站 public/ 中的旧图片副本，不影响后台 R2 参考资源。

## sitemap.xml 前后对比

本轮发布前已在线采集的 sitemap 与发布后完全一致，均仅保留首页；此前的 sitemap 清理没有被此次修改撤销。

发布前：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://ai-rapvideo.co/</loc></url>
</urlset>
```

发布后：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://ai-rapvideo.co/</loc></url>
</urlset>
```

两份快照：[发布前](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/ai-rap-p3-sitemap-before.xml>)、[发布后](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/ai-rap-p3-sitemap-after.xml>)。逐字相同：**是**。

补充原模板基准：Git HEAD `63d4c724cbc6aaa153f5226d7f98cb41574fabf4` 的代码生成结果为 7 条，域名是旧域名。此为 Git 代码快照重建结果，不是历史生产页面抓取：

```text
https://rumpelstiltskin-ai.co/
https://rumpelstiltskin-ai.co/best-rumpelstiltskin-ai-generators
https://rumpelstiltskin-ai.co/how-to-make-rumpelstiltskin-ai-video
https://rumpelstiltskin-ai.co/is-rumpelstiltskin-1987-real
https://rumpelstiltskin-ai.co/rumpelstiltskin-ai-video-generator
https://rumpelstiltskin-ai.co/rumpelstiltskin-dance-video
https://rumpelstiltskin-ai.co/rumpelstiltskin-meme
```

当前为 1 条 `https://ai-rapvideo.co/`。原 6 个内容页已全部移除；1987 别名原本为重定向，未进入 sitemap。

## 下线页面及验证

采用 HTTP **410 Gone**，同时返回 `X-Robots-Tag: noindex, follow`。在 canonical 处理前终止请求，**无 Location，不 301 到首页**。HEAD 同为 410，响应体为空。

| 路径 | GET | HEAD | noindex | Location |
| --- | --- | --- | --- | --- |
| `/best-rumpelstiltskin-ai-generators` | 410 | 410 | 是 | 无 |
| `/how-to-make-rumpelstiltskin-ai-video` | 410 | 410 | 是 | 无 |
| `/is-rumpelstiltskin-1987-real` | 410 | 410 | 是 | 无 |
| `/rumpelstiltskin-ai-video-generator` | 410 | 410 | 是 | 无 |
| `/rumpelstiltskin-dance-video` | 410 | 410 | 是 | 无 |
| `/rumpelstiltskin-meme` | 410 | 410 | 是 | 无 |
| `/1987-rumpelstiltskin` | 410 | 410 | 是 | 无 |

另外验证了 www、尾斜线和 query 形式，仍为 410。删除 7 个旧路由及专属文案、组件和样式后，前端路由包不再打包旧页面内容。21 张旧公开图片及旧示例 MP4 的全部 22 个地址均已验证返回 404/410，未跳转。

## 当前首页 SEO

- **主关键词**：`ai rap video`，未改变。
- **Title**：AI Rap Video Generator - Create Videos From Two Photos
- **H1**：AI Rap Video Generator
- **Description**：Create an AI rap video from two photos. Upload a photo of each person, choose portrait or landscape, then preview and download your video. No account required.
- **Canonical**：https://ai-rapvideo.co/

以上为部署后首页 HTML 实际采集值，原始记录：[test-results/ai-rap-p3-home-metadata.json](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/ai-rap-p3-home-metadata.json>)。

## 验证结果与剩余事项

- focused SEO/SSR/Stripe 单测：28/28 通过。
- TanStack typecheck、Cloudflare build、部署 dry run：通过。
- 正式域名 HTTP 检查：27/27 通过，包括 5 个现有公开页面、404、账户入口跳转、robots、sitemap、旧页 GET/HEAD 和旧素材移除。
- 公开页面 HTML、href/src/poster/alt 未发现旧主题残留；首页保留双图必传 FAQ、新 rap 视频与新流程图。
- **Stripe 已完成**：用户明确允许共享商品改名后，执行 `scripts/manual/ai-rap-p3-rename-stripe-product.mjs --apply`，仅把现有 Product.name 改为 `AI Rap Video`。执行后读回同一商品与同一 Price ID，金额仍为 499 美分、币种 USD。使用同一商品的旧站也会显示新名称，与授权一致。未创建真实结账会话、扣款、退款或 AI 生成。验证记录：[Stripe 改名与读回结果](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/ai-rap-p3-stripe-product-rename.log>)。

证据：[unit](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/ai-rap-p3-unit.log>)、[typecheck](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/ai-rap-p3-typecheck.log>)、[build](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/ai-rap-p3-build.log>)、[dry-run](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/ai-rap-p3-dry-run.log>)、[deploy](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/ai-rap-p3-deploy.log>)、[live](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/ai-rap-p3-live.log>)、[lifecycle](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/ai-rap-p3-lifecycle.log>)。

## 修改文件完整清单

下列为此次站点迁移累计工作树相对 Git HEAD 的新增、修改、删除记录，包含前几轮首页/SEO/素材修复和本轮 P3；不把它伪称为仅本轮增量。未提交的临时 .tmp/ 及验证产物不列入源码清单。主要 P3 增量为政策、支付展示/下载名、旧路由及资源删除、别名 410 和对应回归检查。

### 应用源码、配置与部署

- 删除：`apps/tanstack-app/src/comparison.css`
- 修改：[apps/tanstack-app/src/components/dance-maker.tsx](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/components/dance-maker.tsx>)
- 修改：[apps/tanstack-app/src/components/home-content.tsx](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/components/home-content.tsx>)
- 删除：`apps/tanstack-app/src/components/meme-articles.tsx`
- 修改：[apps/tanstack-app/src/components/site-footer.tsx](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/components/site-footer.tsx>)
- 删除：`apps/tanstack-app/src/components/tool-page-content.tsx`
- 删除：`apps/tanstack-app/src/components/tutorial-content.tsx`
- 修改：[apps/tanstack-app/src/components/video-examples.tsx](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/components/video-examples.tsx>)
- 修改：[apps/tanstack-app/src/lib/dance-examples.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/dance-examples.ts>)
- 删除：`apps/tanstack-app/src/lib/dance-fact-sources.ts`
- 删除：`apps/tanstack-app/src/lib/generator-comparison.ts`
- 修改：[apps/tanstack-app/src/lib/home-copy.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/home-copy.ts>)
- 修改：[apps/tanstack-app/src/lib/legal-copy.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/legal-copy.ts>)
- 删除：`apps/tanstack-app/src/lib/meme-article-copy.ts`
- 修改：[apps/tanstack-app/src/lib/page-registry.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/page-registry.ts>)
- 修改：[apps/tanstack-app/src/lib/seo.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/seo.ts>)
- 修改：[apps/tanstack-app/src/lib/site-copy.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/site-copy.ts>)
- 修改：[apps/tanstack-app/src/lib/site.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/site.ts>)
- 修改：[apps/tanstack-app/src/lib/sitemap.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/sitemap.ts>)
- 删除：`apps/tanstack-app/src/lib/tool-page-copy.ts`
- 删除：`apps/tanstack-app/src/lib/tutorial-copy.ts`
- 修改：[apps/tanstack-app/src/routeTree.gen.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/routeTree.gen.ts>)
- 删除：`apps/tanstack-app/src/routes/1987-rumpelstiltskin.tsx`
- 修改：[apps/tanstack-app/src/routes/api/video-generate/download.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/routes/api/video-generate/download.ts>)
- 删除：`apps/tanstack-app/src/routes/best-rumpelstiltskin-ai-generators.tsx`
- 删除：`apps/tanstack-app/src/routes/how-to-make-rumpelstiltskin-ai-video.tsx`
- 删除：`apps/tanstack-app/src/routes/is-rumpelstiltskin-1987-real.tsx`
- 删除：`apps/tanstack-app/src/routes/rumpelstiltskin-ai-video-generator.tsx`
- 删除：`apps/tanstack-app/src/routes/rumpelstiltskin-dance-video.tsx`
- 删除：`apps/tanstack-app/src/routes/rumpelstiltskin-meme.tsx`
- 修改：[apps/tanstack-app/src/start.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/start.ts>)
- 删除：`apps/tanstack-app/src/tool-pages.css`
- 修改：[apps/tanstack-app/vite.config.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/vite.config.ts>)
- 修改：[apps/tanstack-app/wrangler.jsonc](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/wrangler.jsonc>)
- 修改：[config.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/config.ts>)
- 修改：[config/videoPurchase.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/config/videoPurchase.ts>)
- 新增：[apps/tanstack-app/src/lib/retired-pages.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/retired-pages.ts>)

### 公开静态素材

- 删除：`apps/tanstack-app/public/images/dance/example-barn.png`
- 删除：`apps/tanstack-app/public/images/dance/example-couple.png`
- 删除：`apps/tanstack-app/public/images/dance/example-pet.png`
- 删除：`apps/tanstack-app/public/images/dance/generator-demo-cover.jpg`
- 删除：`apps/tanstack-app/public/images/dance/step-cast.png`
- 删除：`apps/tanstack-app/public/images/dance/step-cast.svg`
- 删除：`apps/tanstack-app/public/images/dance/step-download.png`
- 删除：`apps/tanstack-app/public/images/dance/step-download.svg`
- 删除：`apps/tanstack-app/public/images/dance/step-generate.png`
- 删除：`apps/tanstack-app/public/images/dance/step-generate.svg`
- 删除：`apps/tanstack-app/public/images/dance/step-template.svg`
- 删除：`apps/tanstack-app/public/images/dance/step-upload.png`
- 删除：`apps/tanstack-app/public/images/dance/step-upload.svg`
- 删除：`apps/tanstack-app/public/images/references/barn-scene.png`
- 删除：`apps/tanstack-app/public/images/references/costume-reference.png`
- 删除：`apps/tanstack-app/public/images/references/princess-default-v2.png`
- 删除：`apps/tanstack-app/public/images/references/princess-default.png`
- 删除：`apps/tanstack-app/public/images/tutorial/01-choose-photo.png`
- 删除：`apps/tanstack-app/public/images/tutorial/02-dance-setting.png`
- 删除：`apps/tanstack-app/public/images/tutorial/03-generate-video.png`
- 删除：`apps/tanstack-app/public/images/tutorial/04-download-video.png`
- 修改：[apps/tanstack-app/public/site.webmanifest](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/site.webmanifest>)
- 删除：`apps/tanstack-app/public/videos/rumpelstiltskin-ai-generator-demo.mp4`
- 新增：[apps/tanstack-app/public/images/examples/rap-neon-session.jpg](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/images/examples/rap-neon-session.jpg>)
- 新增：[apps/tanstack-app/public/images/examples/rap-orange-studio.jpg](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/images/examples/rap-orange-studio.jpg>)
- 新增：[apps/tanstack-app/public/images/examples/rap-street-duo.jpg](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/images/examples/rap-street-duo.jpg>)
- 新增：[apps/tanstack-app/public/images/rap/step-download.png](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/images/rap/step-download.png>)
- 新增：[apps/tanstack-app/public/images/rap/step-generate.png](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/images/rap/step-generate.png>)
- 新增：[apps/tanstack-app/public/images/rap/step-person-1.png](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/images/rap/step-person-1.png>)
- 新增：[apps/tanstack-app/public/images/rap/step-person-2.png](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/images/rap/step-person-2.png>)
- 新增：[apps/tanstack-app/public/videos/examples/rap-neon-session.mp4](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/videos/examples/rap-neon-session.mp4>)
- 新增：[apps/tanstack-app/public/videos/examples/rap-orange-studio.mp4](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/videos/examples/rap-orange-studio.mp4>)
- 新增：[apps/tanstack-app/public/videos/examples/rap-street-duo.mp4](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/videos/examples/rap-street-duo.mp4>)

### 测试、脚本与文档

- 修改：[scripts/manual/production-smoke.mjs](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/scripts/manual/production-smoke.mjs>)
- 修改：[scripts/manual/r2-upload-check.mjs](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/scripts/manual/r2-upload-check.mjs>)
- 修改：[scripts/manual/stage4-tutorial-capture.mjs](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/scripts/manual/stage4-tutorial-capture.mjs>)
- 修改：[scripts/manual/stage5-audit.mjs](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/scripts/manual/stage5-audit.mjs>)
- 修改：[scripts/manual/stripe-production-smoke.mjs](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/scripts/manual/stripe-production-smoke.mjs>)
- 修改：[tests/e2e/TEST-CATALOG.md](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/TEST-CATALOG.md>)
- 修改：[tests/e2e/seo.config.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/seo.config.ts>)
- 修改：[tests/e2e/specs/homepage.spec.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/specs/homepage.spec.ts>)
- 修改：[tests/e2e/specs/launch-maker.spec.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/specs/launch-maker.spec.ts>)
- 修改：[tests/e2e/specs/seo-foundation.spec.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/specs/seo-foundation.spec.ts>)
- 删除：`tests/e2e/specs/stage3-pages.spec.ts`
- 删除：`tests/e2e/specs/stage4-pages.spec.ts`
- 修改：[tests/e2e/specs/stage5-site.spec.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/specs/stage5-site.spec.ts>)
- 修改：[tests/unit/ai/dance-maker-ssr.test.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/unit/ai/dance-maker-ssr.test.ts>)
- 修改：[tests/unit/payment/video-stripe.test.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/unit/payment/video-stripe.test.ts>)
- 修改：[tests/unit/seo/foundation.test.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/unit/seo/foundation.test.ts>)
- 新增：[docs/implementation/ai-rapvideo-homepage.md](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/docs/implementation/ai-rapvideo-homepage.md>)
- 新增：[docs/implementation/ai-rapvideo-p3-consistency.md](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/docs/implementation/ai-rapvideo-p3-consistency.md>)
- 新增：[scripts/manual/ai-rap-p3-rename-stripe-product.mjs](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/scripts/manual/ai-rap-p3-rename-stripe-product.mjs>)
- 新增：[tests/e2e/specs/retired-pages.spec.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/specs/retired-pages.spec.ts>)
- 新增：[tests/e2e/specs/site-consistency.spec.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/specs/site-consistency.spec.ts>)
- 新增：[tests/unit/seo/retired-pages.test.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/unit/seo/retired-pages.test.ts>)
