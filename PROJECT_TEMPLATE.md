# 新增一部作品

现在的站点已经是「作品驱动」：项目顺序、编号、首页精选、作品索引、类型筛选、Showreel、关于页统计和下一部作品都会自动更新。**不需要改任何数字。**

## 1. 建立作品文件夹

建议一个作品一个文件夹：

```text
assets/works/<slug>/
  cover.webp          # 封面 / 首页主图
  preview.mp4         # 鼠标悬停播放的 15 秒精彩片段
  film.mp4            # 正片（可选）
  poster.webp         # 视频封面（可选，不加就复用 cover）
  script.pdf          # 剧本 PDF（可选）
  still-01.webp       # 剧照（可选）
  still-02.webp
```

`slug` 用英文小写和连字符，例如 `animal-whisperer`、`paper-plane`。

图片建议：

- 封面：1600px 长边，WebP，质量 80–85
- 竖版封面：1100 × 1400
- 剧照：1400px 长边
- 视频：H.264 MP4，网页播放建议 1080p、8–15 Mbps

## 2. 在 `assets/js/data.js` 的 `projects` 数组里加一段

```js
{
  slug: "your-project",
  title: "作品中文名",
  titleEn: "YOUR PROJECT",
  year: "2026",
  category: "剧情短片",
  categoryEn: "NARRATIVE SHORT",
  filter: "剧情",                  // 会变成筛选按钮
  featured: true,                  // false = 不进入首页精选
  duration: "12′ 30″",
  format: "2.39:1 · COLOR · 5.1",
  role: "导演 / 编剧",
  accent: "#c96a35",               // 作品强调色
  cover: "assets/works/your-project/cover.webp",
  preview: "assets/works/your-project/preview.mp4", // 3 段精彩片段，约 15 秒，无音轨
  position: "50% 50%",             // 封面裁切焦点
  tagline: "一句宣传语",
  logline: "一句话故事梗概。",
  synopsis: [
    "第一段简介。",
    "第二段简介。"
  ],
  credits: [
    ["导演", "你的名字"],
    ["摄影指导", "……"],
    ["剪辑", "……"]
  ],
  quote: "作品里的一句台词或创作手记。",
  gallery: [
    {
      src: "assets/works/your-project/still-01.webp",
      caption: "剧照说明 / 2026",
      ratio: "wide"               // wide | portrait | square
    }
  ]
}
```

### 可选：单片正片

```js
video: {
  src: "assets/works/your-project/film.mp4",
  poster: "assets/works/your-project/poster.webp",
  duration: "12′ 30″",
  vertical: false,                // 竖屏项目改成 true
  mime: "video/mp4",
  captions: "assets/works/your-project/subtitles.vtt" // 可选
}
```

加上后，项目详情页会自动出现自定义播放器：播放、进度、声音、全屏，以及竖屏布局。

### 可选：分集短剧

分集项目使用 `episodes`，页面会自动生成 EP 切换条：

```js
episodes: [
  {
    label: "EP01",
    title: "第一集标题",
    duration: "3′ 36″",
    poster: "assets/works/your-project/cover.webp",
    video: {
      src: "assets/works/your-project/ep01.mp4",
      poster: "assets/works/your-project/cover.webp",
      duration: "3′ 36″",
      vertical: true
    }
  },
  {
    label: "EP02",
    title: "第二集标题",
    duration: "3′ 23″",
    poster: "assets/works/your-project/cover.webp",
    video: {
      src: "assets/works/your-project/ep02.mp4",
      poster: "assets/works/your-project/cover.webp",
      duration: "3′ 23″",
      vertical: true
    }
  }
]
```

### 发行状态

```js
releaseLabel: "已上线",          // 显示在首页卡片、索引、详情页
releaseNote: "完整 60 集已上线，可自行搜索观看。本站仅展示 EP59—EP60。"
```

待上线项目：

```js
releaseLabel: "待上线",
releaseNote: "预计 38 集，待上线，敬请期待。当前展示前五集。"
```

### 可选：剧本 PDF

```js
script: {
  type: "pdf",
  src: "assets/works/your-project/script.pdf",
  title: "YOUR PROJECT — SHOOTING SCRIPT",
  note: "SHOOTING DRAFT / 2026",
  intro: "一句话说明这份剧本的版本。"
}
```

点击 `READ THE SCRIPT` 会在站内阅读器中打开 PDF，同时提供新窗口打开。

### 可选：站内排版的文字剧本

```js
script: {
  type: "text",
  title: "YOUR PROJECT — SHOOTING SCRIPT",
  source: "SHOOTING DRAFT",
  note: "SELECTED PAGES",
  pages: [
    [
      { t: "scene", x: "第1场  夜  外  港口" },
      { t: "action", x: "雨落在空无一人的码头上。" },
      { t: "char", x: "阿哲" },
      { t: "paren", x: "（低声）" },
      { t: "dia", x: "Who is on the phone?", zh: "电话那头是谁？" },
      { t: "trans", x: "CUT TO:" }
    ],
    [
      { t: "scene", x: "第2场  夜  内  出租车" },
      { t: "action", x: "电台突然安静下来。" }
    ]
  ]
}
```

支持的块类型：

`scene` 场景标题、`action` 动作、`char` 人物、`paren` 括注、`dia` 对白、`trans` 转场、`title` 标题、`center` 居中、`space` 空行。

`zh` 是可选的第二行译文。

如果这份文件是分镜而不是剧本，加上：

```js
kind: "storyboard"
```

站内模块会自动把标题改为 **STORYBOARD / 分镜**，按钮改为 **READ THE STORYBOARD**。

## 3. 控制上线 / 首页

- `featured: false` — 保留在作品索引，但不上首页
- `status: "draft"` — 完全隐藏，路由也不会生成
- 首页默认取前 6 个 `featured` 作品；要展示更多，修改 `app.js` 顶部：

```js
const FEATURED = DATA.filter(...).slice(0, 6);
```

## 4. 自动更新的东西

加完这一条数据后，以下内容会全部自动处理：

- 首页精选卡片、作品总数
- 作品索引行、筛选分类、数量
- 项目详情路由 `#/work/<slug>`
- 项目编号 `01 / 07`、`02 / 07`
- Showreel 封面与进度条
- 下一部作品
- 关于页「精选作品 / 创作形态」统计
- 年份范围

不需要再手动改 `06`、`2023—2026` 之类的数字。
