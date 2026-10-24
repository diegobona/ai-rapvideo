# AI Rap Video 首页 SEO 与正文更新 — 2026-10-24

已按 P0-1 → P0-2 → P1-3 → P1-4 → P1-5 → P2-6 的顺序实施并发布至 [ai-rapvideo.co](https://ai-rapvideo.co/)。Worker 版本：`54b7c379-d17f-45cd-865e-e69723aa712e`。未新增子页，未修改 sitemap、robots、登录/注册或积分功能。

## view-source 验证结果

验证通过 HTTP GET 直接取得服务端原始 HTML，不依赖执行 JavaScript。采集时间：2026-10-24 13:59:54（北京时间，UTC+8）。

| 检查 | 结果 |
| --- | --- |
| 首页 HTTP | 200 |
| JSON-LD | head 中 1 个可解析的 @graph，包含 SoftwareApplication 与 FAQPage |
| SoftwareApplication | name=AI Rap Video Generator；category=MultimediaApplication；OS=Web；url=https://ai-rapvideo.co/；offers=4.99 USD |
| FAQ | 原有7条；JSON-LD、可见SSR问答、修改前在线原文三者逐条相等，无新增或改写 |
| OG image | https://ai-rapvideo.co/images/examples/rap-orange-studio.jpg，GET 200，真实像素与声明均1200×630 |
| Twitter | summary_large_image；title/description与OG相同，附同图与alt |
| 新增正文 | 三个H2及全部段落可在原始HTML直接看到；DOM顺序为步骤→新正文→示例，CSS排序同步 |
| 段落词数 | What Is=81词；Who It Is For为3段，每段50词 |
| 示例 | 5条本地MP4；1条720×1280竖版；所有视频与海报均HTTP200，caption含场景、描述、时长/方向及用途 |
| Explore | 保留3个锚点，每卡新增10词说明；全部目标存在 |
| 命名 | id=rap-maker；展示class/data-testid为rap-*；付款回跳片段同步 |
| sitemap | 与修改前逐字一致，只有https://ai-rapvideo.co/ |
| robots | 现有index, follow保持；未添加规则 |

原始证据：[修改前HTML](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/homepage-seo-before.html>)、[修改后HTML](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/homepage-seo-after.html>)、[完整验证JSON](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/homepage-seo-after.json>)、[源码验证日志](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/homepage-seo-view-source.log>)。

## 首页正文词数前后对比

统一口径：按DOM顺序连接SSR文本节点，移除script/style，排除header/footer，不计alt、输入值或CSS生成文字；英文词统计正则为 `/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g`。

| 范围 | 修改前 | 修改后 |
| --- | ---: | ---: |
| 正文内容区 .home-content（介绍、步骤、正文、示例、FAQ、Explore） | 534 | 907 |
| main（另含H1、副标题和工具区文字） | 700 | 1087 |

两种范围的修改后词数均在900–1100内。空白分词对照：main 698→1087；正文 532→907。这不是把JSON-LD中的FAQ再算一次。

正文文本：[修改前正文](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/homepage-seo-before.home-content.txt>)、[修改后正文](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/homepage-seo-after.home-content.txt>)。

## 最终 Title、H1 与描述

- 主词：`ai rap video`，未改变。
- Title（61字符）：AI Rap Video Generator – Make an AI Rap Video From Two Photos
- H1：AI Rap Video Generator
- 副标题：Turn two photos into an AI rap video with original verses and a beat.
- Description（保持原文）：Create an AI rap video from two photos. Upload a photo of each person, choose portrait or landscape, then preview and download your video. No account required.

## 素材与范围说明

新增大厅与屋顶示例来源为官方 [RapDuo](https://rapduo.app/) 的 [sample-lobby.mp4](https://img.rapduo.app/public/rapduo/s/sample-lobby.mp4) 与 [sample-rooftop.mp4](https://img.rapduo.app/public/rapduo/s/sample-rooftop.mp4)，都约12.096秒、有H264/AAC音视频轨，已本地完整解码及抽帧检查。

屋顶为明确标注的 **Portrait edit**：用原画面柔化背景组成720×1280竖版画布，保留原横版完整前景、两个人和麦克风，不冒充原生竖版生成。分享图从现有橙色录音棚视频抽帧，保持用户指定URL，实际导出1200×630。

$4.99单次价格、免登录、确认失败全额退款、24小时后计划自动删图的既有说明保持。后台提示词、模型、订单、cookie/session/API协议未更改；支付库唯一变更是成功/取消回跳锚点从旧id同步为#rap-maker。没有创建真实结账会话、扣款、退款或AI生成。

## 验证命令结果

- 聚焦SEO/SSR/Stripe单测：29/29通过，含新增可选分享标签与安全JSON-LD序列化回归。
- TanStack typecheck、生产build、SEO源码入口校验、Wrangler dry run：通过。
- 正式域名首页SEO HTTP测试：4/4通过。
- 发布后原始HTML、FAQ原文、词数、分享图真实像素、五视频海报、sitemap比较：全部通过。

日志：[unit](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/homepage-seo-unit.log>)、[typecheck](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/homepage-seo-typecheck.log>)、[build](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/homepage-seo-build.log>)、[dry-run](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/homepage-seo-dry-run.log>)、[deploy](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/homepage-seo-deploy.log>)、[live-tests](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/test-results/homepage-seo-live-tests.log>)。

## 本轮改动文件清单

以下只列本轮首页SEO更新涉及的文件；不把此前P3迁移累计改动混进来。新增素材属于静态文件，不是新增页面URL。

### 首页与 SEO

- 修改：[apps/tanstack-app/src/routes/index.tsx](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/routes/index.tsx>)
- 新增：[apps/tanstack-app/src/lib/home-structured-data.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/home-structured-data.ts>)
- 修改：[apps/tanstack-app/src/lib/seo.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/seo.ts>)
- 修改：[apps/tanstack-app/src/lib/page-registry.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/page-registry.ts>)
- 修改：[apps/tanstack-app/src/lib/home-copy.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/home-copy.ts>)
- 修改：[apps/tanstack-app/src/lib/dance-examples.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/lib/dance-examples.ts>)
- 修改：[apps/tanstack-app/src/components/home-content.tsx](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/components/home-content.tsx>)
- 修改：[apps/tanstack-app/src/components/video-examples.tsx](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/components/video-examples.tsx>)
- 修改：[apps/tanstack-app/src/components/dance-maker.tsx](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/components/dance-maker.tsx>)
- 修改：[apps/tanstack-app/src/components/dance-checkout-dialog.tsx](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/components/dance-checkout-dialog.tsx>)
- 修改：[apps/tanstack-app/src/home.css](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/home.css>)
- 修改：[apps/tanstack-app/src/motion-home.css](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/src/motion-home.css>)
- 修改：[libs/payment/video-stripe.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/libs/payment/video-stripe.ts>)

### 静态素材

- 更新为实际1200×630：[apps/tanstack-app/public/images/examples/rap-orange-studio.jpg](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/images/examples/rap-orange-studio.jpg>)
- 新增：[apps/tanstack-app/public/videos/examples/rap-lobby-duo.mp4](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/videos/examples/rap-lobby-duo.mp4>)
- 新增：[apps/tanstack-app/public/images/examples/rap-lobby-duo.jpg](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/images/examples/rap-lobby-duo.jpg>)
- 新增：[apps/tanstack-app/public/videos/examples/rap-rooftop-portrait.mp4](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/videos/examples/rap-rooftop-portrait.mp4>)
- 新增：[apps/tanstack-app/public/images/examples/rap-rooftop-portrait.jpg](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/apps/tanstack-app/public/images/examples/rap-rooftop-portrait.jpg>)

### 测试与手动验证脚本

- 新增：[tests/e2e/specs/homepage-seo.spec.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/specs/homepage-seo.spec.ts>)
- 修改：[tests/e2e/specs/homepage.spec.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/specs/homepage.spec.ts>)
- 修改：[tests/e2e/specs/site-consistency.spec.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/specs/site-consistency.spec.ts>)
- 修改：[tests/e2e/specs/launch-maker.spec.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/specs/launch-maker.spec.ts>)
- 修改：[tests/e2e/seo.config.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/seo.config.ts>)
- 修改：[tests/e2e/TEST-CATALOG.md](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/e2e/TEST-CATALOG.md>)
- 修改：[tests/unit/seo/foundation.test.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/unit/seo/foundation.test.ts>)
- 修改：[tests/unit/payment/video-stripe.test.ts](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/tests/unit/payment/video-stripe.test.ts>)
- 修改：[scripts/manual/production-smoke.mjs](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/scripts/manual/production-smoke.mjs>)
- 修改：[scripts/manual/stage4-tutorial-capture.mjs](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/scripts/manual/stage4-tutorial-capture.mjs>)
- 修改：[scripts/manual/stripe-production-smoke.mjs](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/scripts/manual/stripe-production-smoke.mjs>)

### 文档

- 新增：[docs/superpowers/plans/2026-10-24-homepage-seo.md](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/docs/superpowers/plans/2026-10-24-homepage-seo.md>)
- 新增：[docs/implementation/ai-rapvideo-homepage-seo.md](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/docs/implementation/ai-rapvideo-homepage-seo.md>)
- 修改：[docs/implementation/ai-rapvideo-homepage.md](<D:/Asideproject/！Overseas网站项目/ai-rapvideo/tinyship-2.7.0/docs/implementation/ai-rapvideo-homepage.md>)

顺序更新（2026-10-24）：上文“步骤→新正文→示例”及对应源码快照属于此前发布的历史记录，已被用户本次要求“工具→示例→步骤→正文”覆盖。当前要求为示例区紧接工具区，其后依次是制作步骤、What Is、Who It Is For、Why Two Photos、FAQ、Explore；历史源码快照保持原样。

该顺序已部署为 `2fc98e7d-294a-4b11-a4ed-aeacfadc588d`。正式站 HTML 与实际交付 CSS 均已验证：工具 order=2、示例=3、步骤=4、正文=5；四项首页线上回归通过，五条示例保留。
