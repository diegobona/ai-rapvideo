# 阶段 5：上线操作清单

> 2026-10-15 更新：网站现已部署，以下为阶段 5 的历史准备记录。当前数据库、媒体域名、部署命令和线上检查结果以 [Cloudflare 生产部署记录](./cloudflare-production-deployment.md) 为准；旧的数据库 ID、账号相关说明和宣传原文不再适用。

适用项目：TinyShip / TanStack Start / Cloudflare Workers。主域为 `https://rumpelstiltskin-ai.co`，Worker 名称为 `rumpelstiltskin-ai`。本阶段只完成本地代码与验收，没有部署 Worker、修改线上 DNS 或执行远程数据库迁移。

## 上线前先处理的现有缺口

- **部署时必须应用新增迁移。** 本地已应用 `0006_video_tasks.sql` 和 `0007_anonymous_video_trial.sql`。后者增加匿名用户标记、持久化免费次数和 IP 短期计数表。远程数据库本次未迁移；部署新版代码前，按下面步骤核对生产数据库并应用所有待执行迁移。
- **生成结果目前依赖供应商下载地址。** 这些地址不能当成永久文件存储。正式承诺历史记录或长期下载前，需要开发侧转存到 R2 并明确保留期限；否则应明确要求用户完成后及时下载。
- **已确认保留指定宣传原文。** 用户明确要求保留包含 `No Signup`、`in seconds`、`under a minute` 和 `30 seconds` 的标题/描述。现已支持免注册免费生成一次；实际渲染通常耗时几分钟，工具提示、正文、教程和比较表已说明等待时间，不将宣传时间当成实测结果。
- **自动找回密码尚未启用。** 未配置邮件时，页面提供真实支持邮箱，隐藏不可用的发送表单；其他未配置的社交/手机登录入口也不显示。需要自动找回功能时，配置并验证正式发信服务。

## 按顺序执行的人工操作

1. **核对服务信息和供应商账户。** 法律页已使用运营主体 `ColdStone co.`、联系邮箱 `zw83716@gmail.com`，地址分别为 `/privacy-policy`、`/terms-of-service`，均为 `noindex`。确认邮箱可以接收用户请求；确认 AutoDL 账户余额、ComfyUI 组 Token 和 `minimax_h3_lightx2v_v5` 工作流可用，并核对所用照片、固定素材及供应商的使用授权。当前工作流输出 10 秒视频。

2. **确认 Cloudflare 账号、域名和 D1 数据库。** 在 Cloudflare 确认 `rumpelstiltskin-ai.co` 已接入正确账号。项目配置中的 D1 名称为 `tinyship-db`、ID 为 `87ee7e74-c45a-447a-aa14-1a66130c306f`；此 ID 的云端归属尚未由本阶段验证，本地注册测试不代表线上数据库已准备好。先在控制台核实，必要时将实际名称和 ID 填入 `apps/tanstack-app/wrangler.jsonc` 的 `d1_databases`；不要盲目对未知数据库执行迁移。

3. **确认 R2 并配置正式媒体域名。** 现有桶为 `rumpelstiltskin-ai-uploads`，绑定名 `R2_BUCKET`；当前公开地址为 `https://pub-7344a28ff09f475d9e99f883230bb927.r2.dev`。在 R2 → 该桶 → Settings → Custom Domains 连接一个媒体域名，再把 `wrangler.jsonc` 的 `R2_PUBLIC_URL` 改为其 HTTPS 地址。不要用 CNAME 直接指向 `r2.dev`。Cloudflare 将 `r2.dev` 定义为限流的开发地址，正式流量应使用自定义域名。[官方说明](https://developers.cloudflare.com/r2/buckets/public-buckets/)

   验证两个固定对象在新地址下可访问：`references/rumpelstiltskin-v2/princess-default-v2.png`、`references/rumpelstiltskin-v2/barn-scene.png`。这里的 R2 地址是公开对象地址，持有链接的人可以访问照片；按隐私页说明处理用户删除请求，不要把公开桶描述成私有存储。

4. **准备生产密钥。** 在 `apps/tanstack-app/.env.production.local` 中准备 `AUTODL_API_KEY` 和独立的生产 `BETTER_AUTH_SECRET`（至少 32 字符的随机值）。此文件受现有忽略规则保护，不要提交或贴到聊天里。不要把包含本地 URL 的 `.dev.vars` 整份当成生产配置；它也不会自动变成云端密钥。生产 `APP_BASE_URL`、`BETTER_AUTH_URL` 已在 `wrangler.jsonc` 设置为主域。

   如果开放找回密码，配置 `RESEND_API_KEY`、已验证发信域名对应的 `EMAIL_DEFAULT_FROM`，并实际收一次重置邮件。当前邮箱注册没有强制验证；短信、社交登录、付费只在启用对应功能时配置。若开放 Stripe 收款，另外核对正式商品/价格、`STRIPE_SECRET_KEY`、`STRIPE_PUBLIC_KEY`、`STRIPE_WEBHOOK_SECRET` 和实际 webhook，不要把脚手架默认套餐当成已开通的业务。

5. **执行远程迁移，再构建部署。** 先完成上面的代码缺口和资源核对。下面命令在 PowerShell 中执行，使用项目已安装的 Wrangler 4.85.0，不升级依赖；依赖管理版本为仓库指定的 pnpm 9.4.0。`login`、远程迁移与部署由你执行，本阶段未执行。D1 迁移命令明确使用 `--remote`。[D1 官方命令说明](https://developers.cloudflare.com/d1/wrangler-commands/)

   ```powershell
   Set-Location 'D:\Asideproject\！Overseas网站项目\rumpelstiltskin-ai.co\tinyship-2.7.0\apps\tanstack-app'
   node node_modules/wrangler/bin/wrangler.js login
   node node_modules/wrangler/bin/wrangler.js whoami
   node node_modules/wrangler/bin/wrangler.js d1 migrations list DB --remote --config wrangler.jsonc
   node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --remote --config wrangler.jsonc
   node ../../node_modules/typescript/bin/tsc --noEmit
   node scripts/cloudflare-vite.mjs build
   node node_modules/wrangler/bin/wrangler.js deploy --config dist/server/wrangler.json --dry-run
   node node_modules/wrangler/bin/wrangler.js deploy --config dist/server/wrangler.json --secrets-file .env.production.local
   ```

   部署使用构建生成的 `dist/server/wrangler.json`；修改配置请改源文件 `wrangler.jsonc` 后重新构建。`--secrets-file` 可与代码一起上传密钥，避免先上线一个缺密钥的版本；本地 CLI 已确认支持该参数。[Cloudflare 部署说明](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)、[密钥说明](https://developers.cloudflare.com/workers/configuration/secrets/)

6. **核对线上域名、HTTPS 和跳转。** 源配置已列出裸域及 `www` 两个 Custom Domains。部署后在 Worker → Settings → Domains & Routes 确认两者有效、证书生效；`www` 请求必须到达 Worker 才能执行代码中的 301。裸域返回页面；`https://www.rumpelstiltskin-ai.co/rumpelstiltskin-meme?test=1` 应 301 到裸域同路径。检查 HTTP 最终进入 HTTPS，canonical 始终为无查询参数的 HTTPS 裸域 URL。[Custom Domains 官方说明](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

7. **在线上走一次完整用户流程。** 在未登录的新浏览器会话中上传照片，确认直接生成一次，等待完成后播放并下载 MP4；刷新不应重复提交。随后在同一浏览器注册、退出、登录，再在另一浏览器登录该账号，均不应获得第二次免费机会。由开发侧以受控失败验证退款和机会恢复，避免为了测试重复购买生成。检查站内链接、法律页、移动端及浏览器查看源代码；首页和内页的 H1/正文应直接出现在 HTML 中。确认 `/robots.txt` 可抓取、`/sitemap.xml` 包含主页加六个内容/工具页，共 7 个可索引页面；登录、账户、付费与法律页保留 `noindex`，不放入 sitemap。

8. **统计已接入 PostHog。** 只采集基础访问与来源，不采集生成、下载、点击等操作。后台 Web Analytics → Channels → AI 查看 AI 来源访客数。公开项目 Token/Host 位于仓库根目录 `.env.production`，统一入口仍是 `src/components/site-analytics.tsx`。不要再添加 Cloudflare/Plausible 的重复统计脚本。变更配置后需要重新构建部署；当前配置与验收记录见 [PostHog 接入说明](./posthog-analytics.md)。

9. **提交 Google Search Console。** 添加 Domain property `rumpelstiltskin-ai.co`，按其给出的 TXT 值在 Cloudflare DNS 验证所有权，验证后保留该记录。然后在 Sitemaps 提交 `https://rumpelstiltskin-ai.co/sitemap.xml`。用 URL Inspection 检查首页与六个内页，确认实时测试可访问、canonical 正确后申请收录；不要提交 `noindex` 资源页。[所有权验证](https://support.google.com/webmasters/answer/9008080)、[提交 sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

10. **上线后回看运行情况。** 检查 Worker 错误、AutoDL 余额与失败任务退款、R2 请求、Search Console 的抓取/索引结果。提交 sitemap 不保证收录；若出现误加 `noindex`、robots 屏蔽、404 或域名跳转循环，先修正再重新检测。对比页引用的免费额度等信息有变动时，按官方页面更新，不增加未经要求的路由。

## 当前范围

免费限制配置在 `config/videoTrial.ts`：签名访客 Cookie 最长一年；同一 Cloudflare 客户端 IP 每小时最多创建 10 个访客会话、上传 20 次、提交 5 次生成请求。浏览器/账号总额度为一次成功视频，不按天重置；任务失败并退款后可重试。这是匿名访问的成本控制，不能保证识别同一个自然人：清 Cookie、换浏览器与换网络仍可能绕过匿名身份识别。本地无可信 Cloudflare IP 时不启用 IP 计数。详见 `anonymous-video-trial.md`。

SEO 的索引范围是首页和六个主题内页。当前 10 个资源页为 6 个认证页面、2 个支付结果页和 2 个法律页，均不参与搜索索引；目前没有独立的账户或结账页面，统一 SEO 工具已为此类路径设置默认 noindex。没有新增泛词主题页，没有多语言路径或子域名，没有填写统计 ID，也没有实际部署。
