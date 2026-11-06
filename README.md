# 邹耀辉 · 影像作品集

导演 / 编剧 / 剪辑邹耀辉的个人作品集。视觉方向来自「深色底 + 巨型衬线字 + 电影感留白」，版式、交互与代码均为重新设计。

站点是**作品驱动**的：新增作品只加一个文件夹和一段数据，首页、索引、筛选、详情、Showreel、统计数字和下一部作品都会自动更新。当前收录 5 部作品：3 部海外竖屏短剧、2 部 AI 短片。

## 直接预览

双击 `index.html` 即可。所有字体、图片和脚本都在本地，不依赖网络。

如果想用本地服务器（更接近正式部署环境）：

```bash
python -m http.server 4173
# 打开 http://127.0.0.1:4173
```

## 页面结构

- 进入页：全屏剧照 + 姓名 + 「进入作品集」按钮
- `#/` — 首页：全屏影像、巨型姓名、Selected Works、创作方法
- `#/works` — 作品索引：悬浮预览、类型筛选、反色行交互
- `#/work/:slug` — 项目详情：沉浸式头图、分集播放器、发行状态、剧照、剧本/分镜、Credits、下一部作品
- `#/about` — 关于：巨型姓名、工作剧照、数字、创作能力、工作方式、联系
- 全站菜单、页面转场、Showreel、图片灯箱、微信二维码、中国时间

## 交互清单

- 首屏 Loader 计数 → 进入作品集交互
- 页面切换的竖向幕布转场
- 自定义光标：VIEW / PLAY / WRITE / OPEN 状态
- 磁吸按钮与作品卡片微视差
- 作品卡片鼠标悬停自动播放 15 秒精彩片段
- 作品索引鼠标跟随视频预览
- 分类筛选（FLIP 淡出 / 淡入）
- 全屏 Showreel：剧照轮播 + 时间码
- 项目剧照 Lightbox
- 菜单焦点陷阱、`Esc` 关闭、减少动态效果适配
- 移动端独立排版

## 换成你自己的内容

### 1. 文字与项目

身份、项目、视频与剧本信息集中在：

`assets/js/data.js`

剧本正文的逐页文字数据在：

`assets/js/scripts.js`

修改 `SITE` 里的姓名、邮箱、电话、微信二维码、简介与统计数字；修改 `projects` 数组里的项目标题、年份、类型、文案、Credits 和图片路径。

新增项目的完整模板和字段说明见 **[PROJECT_TEMPLATE.md](PROJECT_TEMPLATE.md)**。项目编号、作品总数、筛选按钮、Showreel 和统计数字都由数组自动计算，**不需要手动改数字**。

项目可选的 `video` 字段会自动生成自定义播放器；分集短剧使用 `episodes` 数组，自动生成集数切换。`preview` 字段指定鼠标悬停时播放的片段。`script` 字段支持站内排版文字剧本，或直接阅读 PDF；`script.kind: "storyboard"` 会把模块切换为「分镜」。

发行状态由 `releaseLabel` 和 `releaseNote` 控制，首页卡片、作品索引和详情页会同步显示。

### 2. 图片

每个作品现在使用独立文件夹：

```text
assets/works/<project-slug>/
  cover.webp       # 项目封面 / 首页卡片
  hero.webp        # 项目详情头图
  preview.mp4      # 鼠标悬停自动播放的精彩片段（约 15 秒）
  film.mp4         # 正片
  ep01.mp4 ...     # 分集短剧
  stills/          # 项目内页剧照
```

公共图片在 `assets/media/`：

- `about-frame.webp` — 关于页工作剧照
- `wechat-qr.webp` — 手机端可识别的微信二维码
- `og-cover.jpg` — 分享卡片（1200 × 630）

建议规格：

- 项目封面：竖版 1100 × 1900 或横版 1600 × 900，WebP
- 详情头图：1920 × 1080，WebP
- 内页剧照：1600 × 900，WebP
- 正片：H.264 MP4，竖屏 720 × 1282，横屏 1440 × 810
- 悬停预览：15 秒左右、无音轨，竖屏 540 × 962，横屏 960 × 540
- 当前 15 个主片合计约 414MB，单个最大约 46MB；6 个预览片合计约 11.4MB

### 3. 配色与字体

主样式在 `assets/css/style.css`，最上方 `:root` 变量：

```css
--ink: #0b0b0a;       /* 底色 */
--paper: #efe9df;     /* 纸张色 */
--accent: #d95332;    /* 朱砂红 */
--serif: "Bodoni Moda", ...;
--cjk: "Noto Serif SC", ...;
```

字体已本地化在 `assets/fonts/`：

- Bodoni Moda — 英文标题与数字
- Manrope — 标签与正文西文
- Noto Serif SC 子集 — 中文标题（只包含页面实际用到的汉字，约 190KB）

如果大幅修改中文文案，需要重新生成中文字体子集，或直接把 `--cjk` 换成本机字体栈（`Songti SC`, `SimSun`, `Source Han Serif SC` 等）。

### 4. Showreel

目前 `Showreel` 是「静帧节选」形式，自动读取首页精选作品的封面，最多 8 张，避免在没有视频素材时露出空白。

有真实 Showreel 视频后，可以把 `index.html` 中 `#reel` 的图片层替换成 `<video>`，或扩展 `app.js` 的 `openReel()` 接入真实播放器。单个项目的正片已经支持自定义播放器（`video` 字段）。

### 5. 剧本

项目支持两种剧本：

- `type: "pdf"` — 站内 PDF 阅读器 + 新窗口打开
- `type: "text"` — 按电影剧本格式排版，支持人物、对白、动作、场景、转场和分页

具体字段和示例见 **[PROJECT_TEMPLATE.md](PROJECT_TEMPLATE.md)**。

## 浏览器

面向现代浏览器：Chrome / Edge / Safari / Firefox 当前版本。

使用了 `IntersectionObserver`、Web Animations API、`svh` 单位、`backdrop-filter`；`prefers-reduced-motion` 下会自动关闭大部分动效。

## 素材说明

作品封面、剧照、视频与剧本均来自邹耀辉的项目文件。为了网页播放，视频已转码为 H.264 MP4，并保留原文件不动。

字体来自 Google Fonts，遵循 SIL Open Font License。当前站点为静态站，可直接部署到 GitHub Pages、Cloudflare Pages、Vercel 或任意静态服务器。
