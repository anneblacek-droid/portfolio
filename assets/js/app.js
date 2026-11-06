/* ============================================================
   ZOU YAOHUI — PORTFOLIO
   Vanilla JS. No build step, no dependencies.
   ============================================================ */

(() => {
  "use strict";

  const SITE = window.SITE;
  const DATA = (SITE.projects || []).filter(
    (project) => project && project.slug && project.status !== "draft" && project.hidden !== true
  );
  const FEATURED = DATA.filter((project) => project.featured !== false).slice(0, 6);
  const PROJECT_FILTERS = Array.from(
    new Set(DATA.map((project) => project.filter || project.category).filter(Boolean))
  );
  const projectNumber = (project) => pad(DATA.findIndex((item) => item.slug === project.slug) + 1);
  const projectTotal = () => pad(DATA.length);
  const displayNameEn = SITE.nameEn
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
  const PROJECT_YEARS = DATA.map((project) => Number(project.year)).filter((year) => Number.isFinite(year));
  const YEAR_MIN = PROJECT_YEARS.length ? Math.min(...PROJECT_YEARS) : new Date().getFullYear();
  const YEAR_MAX = PROJECT_YEARS.length ? Math.max(...PROJECT_YEARS) : new Date().getFullYear();
  const YEAR_RANGE = YEAR_MIN === YEAR_MAX ? `${YEAR_MIN}` : `${YEAR_MIN}—${YEAR_MAX}`;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const app = $("#app");
  const headerIndex = $("#header-index");
  const progressBar = $(".scroll-progress i");
  const transition = $("#transition");
  const loader = $("#loader");
  const menu = $("#menu");
  const menuBtn = $("#menu-btn");
  const entry = $("#entry");
  const reel = $("#reel");
  const lightbox = $("#lightbox");
  const scriptReader = $("#script-reader");
  const toast = $("#toast");

  let currentRoute = null;
  let currentView = null;
  let transitioning = false;
  let queuedRoute = null;
  let siteReady = false;
  let revealEnabled = false;
  let menuOpen = false;
  let entered = false;
  let reelOpen = false;
  let lightboxOpen = false;
  let scriptOpen = false;
  const scriptState = { project: null, page: 0, pages: [] };
  let lastFocused = null;
  let toastTimer = 0;
  const queuedReveals = new Set();
  const scrollPositions = new Map();
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  /* ----------------------------------------------------------
     HELPERS
  ---------------------------------------------------------- */

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const nextFrame = () =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const getProject = (slug) => DATA.find((project) => project.slug === slug);

  const formatYear = () => new Date().getFullYear();

  const pad = (n, size = 2) => String(n).padStart(size, "0");

  const svgArrow = (direction = "up-right") => {
    if (direction === "right") return "→";
    if (direction === "up") return "↑";
    return "↗";
  };

  function syncIdentity() {
    $$(".brand__zh").forEach((el) => (el.textContent = SITE.name));
    $$(".brand__en").forEach((el) => (el.textContent = SITE.nameEn));
    const loaderName = $(".loader__name");
    if (loaderName) {
      const words = SITE.nameEn.split(/\s+/).filter(Boolean);
      let letterIndex = 0;
      loaderName.innerHTML = words.map((word, wordIndex) => {
        const letters = Array.from(word).map((letter) => {
          const delay = (0.08 + letterIndex * 0.055).toFixed(3);
          letterIndex += 1;
          return `<i style="animation-delay:${delay}s">${letter}</i>`;
        }).join("");
        return `<span class="loader__word${wordIndex > 0 ? " loader__word--italic" : ""}">${letters}</span>`;
      }).join("");
    }
    const loaderNote = $(".loader__note");
    if (loaderNote) {
      loaderNote.children[0].textContent = SITE.role;
      loaderNote.children[1].textContent = SITE.location.toUpperCase();
    }
    const loaderTop = $(".loader__top");
    if (loaderTop) loaderTop.children[0].textContent = `${SITE.nameEn} — VISUAL STUDIO`;
    const menuFoot = $(".menu__foot");
    if (menuFoot) {
      menuFoot.children[0].textContent = SITE.role;
      menuFoot.children[1].textContent = SITE.coordinates;
    }
    const menuMail = $('.menu__contact a[href^="mailto:"]');
    if (menuMail) {
      menuMail.href = `mailto:${SITE.email}`;
      menuMail.textContent = SITE.email;
    }
    const menuPhone = $('.menu__contact a[href^="tel:"]');
    if (menuPhone) {
      menuPhone.href = `tel:${SITE.phone}`;
      menuPhone.textContent = SITE.phone;
    }
    const menuPreview = $(".menu__preview img");
    if (menuPreview) menuPreview.src = SITE.hero?.image || "assets/works/paper-plane/hero.webp";
    const worksMenu = $('.menu__nav a[href="#/works"]');
    if (worksMenu && DATA[0]) worksMenu.dataset.preview = DATA[0].cover;

    const entryImage = $("#entry-image");
    if (entryImage && SITE.entry?.image) {
      entryImage.src = SITE.entry.image;
      entryImage.alt = SITE.entry.alt || "";
    }
    const entryName = $("#entry-name");
    if (entryName) entryName.textContent = SITE.name;
    const entryEn = $("#entry-en");
    if (entryEn) entryEn.textContent = SITE.nameEn;
    const entryRole = $("#entry-role");
    if (entryRole) entryRole.textContent = SITE.role;
    const entryKicker = $("#entry-kicker");
    if (entryKicker) entryKicker.textContent = SITE.entry?.note || "SELECTED WORKS";
    const entryLocation = $("#entry-location");
    if (entryLocation) entryLocation.textContent = SITE.hero?.location || SITE.location;
    const entryCount = $("#entry-count");
    if (entryCount) {
      const seriesCount = DATA.filter((project) => project.category?.includes("短剧")).length;
      const shortCount = DATA.filter((project) => project.category?.includes("短片") || project.category?.includes("复刻")).length;
      entryCount.textContent = `${pad(DATA.length)} PROJECTS / ${pad(seriesCount)} SERIES / ${pad(shortCount)} SHORTS`;
    }

    const description = `${SITE.name}，${SITE.role}。${SITE.intro?.[0] || ""}`;
    $('meta[name="description"]')?.setAttribute("content", description);
    $('meta[property="og:title"]')?.setAttribute("content", `${SITE.name} · ${SITE.role}`);
    $('meta[property="og:description"]')?.setAttribute("content", SITE.hero?.tagline?.replace(/<[^>]+>/g, "") || description);
    $('meta[name="twitter:title"]')?.setAttribute("content", `${SITE.name} · ${SITE.role}`);
    $('meta[name="twitter:description"]')?.setAttribute("content", SITE.hero?.tagline?.replace(/<[^>]+>/g, "") || description);
  }

  function parseRoute() {
    const raw = decodeURIComponent((location.hash || "#/").replace(/^#/, "")) || "/";
    const path = raw.startsWith("/") ? raw : `/${raw}`;

    if (/^\/?$/.test(path)) {
      return { name: "home", path: "/", key: "home" };
    }
    if (/^\/works\/?$/.test(path)) {
      return { name: "works", path: "/works", key: "works" };
    }
    if (/^\/about\/?$/.test(path)) {
      return { name: "about", path: "/about", key: "about" };
    }
    const workMatch = path.match(/^\/work\/([\w-]+)\/?$/);
    if (workMatch) {
      const project = getProject(workMatch[1]);
      if (project) {
        return {
          name: "work",
          path: `/work/${project.slug}`,
          key: `work/${project.slug}`,
          slug: project.slug
        };
      }
    }
    return { name: "404", path, key: `404/${path}` };
  }

  function routeMeta(route) {
    if (route.name === "work") {
      const project = getProject(route.slug);
      return {
        label: project ? project.titleEn : "PROJECT",
        small: `PROJECT / ${project ? projectNumber(project) : "00"}`,
        title: project ? `${project.title} · ${SITE.name}` : `作品 · ${SITE.name}`,
        index: `PROJECT / ${project ? projectNumber(project) : "00"}`
      };
    }
    if (route.name === "works") {
      return { label: "WORKS", small: "INDEX / 02", title: `作品索引 · ${SITE.name}`, index: "WORKS / 02" };
    }
    if (route.name === "about") {
      return { label: "ABOUT", small: "ABOUT / 03", title: `关于 · ${SITE.name}`, index: "ABOUT / 03" };
    }
    if (route.name === "404") {
      return { label: "404", small: "LOST / 00", title: `页面未找到 · ${SITE.name}`, index: "404 / 00" };
    }
    return {
      label: "INDEX",
      small: "INDEX / 01",
      title: `${SITE.name} · ${SITE.role}`,
      index: "INDEX / 01"
    };
  }

  function setHeader(route) {
    const meta = routeMeta(route);
    headerIndex.textContent = meta.index;
    document.title = meta.title;
    $$(".menu__nav a").forEach((link) => {
      const href = link.getAttribute("href");
      const active =
        (route.name === "home" && href === "#/") ||
        (route.name === "works" && href === "#/works") ||
        (route.name === "about" && href === "#/about");
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  /* ----------------------------------------------------------
     CONTENT — SHARED SECTIONS
  ---------------------------------------------------------- */

  function contactSection(options = {}) {
    const compact = options.compact === true;
    return `
      <section class="contact" id="contact">
        <div class="contact__top">
          <p class="kicker">CONTACT / 合作联系</p>
          <span class="contact__top-note">${compact ? "OPEN FOR SELECT PROJECTS" : "OPEN FOR COMMISSIONS & COLLABORATIONS"}</span>
        </div>
        <h2 class="contact__title">
          <span class="outline">LET'S</span>
          <span><em>make</em></span>
          <span>something<span class="dot"></span></span>
          <span class="contact__asterisk" aria-hidden="true">✳</span>
        </h2>
        <div class="contact__body">
          <div class="contact__intro">
            <p>有一个故事想说？<br />或者，只是想一起做点好东西。</p>
            <a class="contact__email" href="mailto:${SITE.email}" data-magnetic data-cursor="mail" data-cursor-label="WRITE">
              <span>${SITE.email}</span><i>↗</i>
            </a>
            ${SITE.wechatQr ? `
              <figure class="contact__qr">
                <img src="${SITE.wechatQr}" alt="微信二维码" loading="lazy" decoding="async" />
                <figcaption><span>WECHAT / 微信</span><b>扫码添加</b></figcaption>
              </figure>
            ` : ""}
          </div>
          <div class="contact__meta">
            <div class="contact__meta-item">
              <span>PHONE / 电话</span>
              <a href="tel:${SITE.phone}">${SITE.phone}</a>
            </div>
            <div class="contact__meta-item">
              <span>LOCAL TIME / 中国</span>
              <p data-clock>--:-- CST</p>
            </div>
            <div class="contact__meta-item">
              <span>LOCATION / 坐标</span>
              <p>${SITE.location} · ${SITE.coordinates}</p>
            </div>
            <div class="contact__meta-item">
              <span>AVAILABILITY / 合作</span>
              <p>Open for selected projects</p>
            </div>
          </div>
        </div>
        <footer class="footer">
          <span>© ${formatYear()} ${SITE.nameEn} STUDIO — ALL RIGHTS RESERVED</span>
          <div class="footer__links">
            <a href="#/works">WORKS</a>
            <a href="#/about">ABOUT</a>
            <a href="mailto:${SITE.email}">EMAIL</a>
          </div>
          <button type="button" class="to-top" data-to-top>BACK TO TOP <i>↑</i></button>
        </footer>
      </section>
    `;
  }

  function sectionHead(number, label, right) {
    return `
      <div class="section-head">
        <p class="eyebrow"><span style="color:var(--accent)">${number}</span> — ${label}</p>
        <p class="section-head__right">${right}</p>
      </div>
    `;
  }

  /* ----------------------------------------------------------
     CONTENT — HOME
  ---------------------------------------------------------- */

  function renderHome() {
    const cards = FEATURED.map((project, index) => `
      <a
        class="work-card reveal"
        href="#/work/${project.slug}"
        data-cursor="view"
        data-cursor-label="VIEW"
        data-reveal
        style="--d:${index * 50}ms"
      >
        <figure class="work-card__figure">
          <img src="${project.cover}" alt="${project.coverAlt || `${project.title} ${project.titleEn}`}" loading="lazy" decoding="async" style="object-position:${project.position}" />
          ${project.preview ? `
            <video class="work-card__preview" muted loop playsinline preload="none" data-preview-src="${project.preview}" poster="${project.cover}" aria-hidden="true"></video>
            <span class="work-card__preview-label" aria-hidden="true"><i></i> AUTO PREVIEW</span>
          ` : ""}
          <span class="work-card__num">${projectNumber(project)}</span>
          ${project.releaseLabel ? `<span class="status-badge${project.releaseLabel === "已上线" ? " is-online" : ""}">${project.releaseLabel}</span>` : ""}
        </figure>
        <div class="work-card__meta">
          <h3 class="work-card__title">${project.title}<em>${project.titleEn}</em></h3>
          <span class="work-card__year">${project.year}</span>
          <span class="work-card__cat">${project.categoryEn} · ${project.duration}</span>
          <span class="work-card__arrow">${svgArrow()}</span>
          <span class="work-card__line"></span>
        </div>
        <p class="work-card__logline">${project.logline}</p>
      </a>
    `).join("");

    const moreCard = FEATURED.length < 6 ? `
      <a
        class="work-card work-card--more reveal"
        href="#/works"
        data-cursor="link"
        data-cursor-label="INDEX"
        data-reveal
        style="--d:${FEATURED.length * 50}ms"
      >
        <div class="work-card__more">
          <span>MORE / 更多</span>
          <b aria-hidden="true">+</b>
          <p>作品持续更新中<br />ALL PROJECTS / 作品索引</p>
        </div>
        <div class="work-card__meta">
          <h3 class="work-card__title">更多作品<em>MORE WORKS</em></h3>
          <span class="work-card__year">${YEAR_RANGE}</span>
          <span class="work-card__cat">INDEX / 全部项目</span>
          <span class="work-card__arrow">↗</span>
          <span class="work-card__line"></span>
        </div>
      </a>
    ` : "";

    return `
      <section class="view home" data-view="home">
        <section class="hero" id="hero">
          <div class="hero__media">
            <img src="${SITE.hero?.image || "assets/works/paper-plane/hero.webp"}" alt="${SITE.hero?.alt || ""}" fetchpriority="high" decoding="async" />
          </div>
          <div class="hero__shade"></div>

          <div class="hero__topline">
            <span>${SITE.hero?.location || SITE.location.toUpperCase()}</span>
            <span>PORTFOLIO / ${new Date().getFullYear()}</span>
          </div>

          <p class="hero__en">${SITE.roleEn.toUpperCase()} — AVAILABLE WORLDWIDE</p>

          <div class="hero__content">
            <p class="eyebrow hero__eyebrow">${SITE.roleEn.toUpperCase()}</p>
            <h1 class="hero__name${Array.from(SITE.name).length > 2 ? " is-long" : ""}" data-split>${SITE.name}</h1>
            <p class="hero__tagline">${SITE.hero?.tagline || "在光与暗之间，<br />讲一个 <em>值得记住</em> 的故事。"}</p>
          </div>

          <div class="hero__side">
            <p class="hero__side-note">SELECTED WORKS<br />${YEAR_RANGE.replace("—", " — ")}</p>
            <button class="reel-btn" type="button" data-reel data-magnetic data-cursor="play" data-cursor-label="PLAY" aria-label="播放 Showreel 影像节选">
              <svg class="reel-btn__ring" viewBox="0 0 120 120" aria-hidden="true">
                <defs>
                  <path id="reel-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
                </defs>
                <text><textPath href="#reel-circle" startOffset="0">PLAY SHOWREEL · ${YEAR_RANGE} · </textPath></text>
              </svg>
              <span class="reel-btn__play" aria-hidden="true"></span>
            </button>
          </div>

          <div class="hero__foot">
            <span class="scroll-cue">SCROLL TO EXPLORE <i></i></span>
            <div class="hero__foot-right">
              <span class="hero__count"><b>${DATA.length ? "01" : "00"}</b> / ${projectTotal()}</span>
              <span>${SITE.roleEn.toUpperCase()}</span>
            </div>
          </div>
        </section>

        <section class="section section--manifesto">
          ${sectionHead("01", "MANIFESTO / 自述", "FILM · IMAGE · SPACE<br />CHINA / WORLDWIDE")}
          <div class="manifesto__grid">
            <h2 class="manifesto__title">
              <span class="line" data-split>影像不是答案。</span>
              <span class="line" data-split>它是一束光，</span>
              <span class="line" data-split>照见我们<span class="dim">说不出口</span>的部分。</span>
            </h2>
            <aside class="manifesto__aside reveal" data-reveal>
              <p class="en">A study of light, memory<br />and everything in between.</p>
              <p>我着迷于那些无法被语言完整说出的瞬间。摄影机的工作，不是解释，而是让它们被看见。</p>
              <div class="manifesto__sign"><i></i> ${SITE.nameEn} / ${new Date().getFullYear()}</div>
            </aside>
          </div>
          <figure class="manifesto__still" data-parallax data-parallax-scale="1.16">
            <img src="assets/works/shenjing/stills/still-01.webp" alt="《神经也是神》风清宗演武场剧照" loading="lazy" decoding="async" />
            <figcaption>FRAME 014 — 神经也是神 / EP01</figcaption>
          </figure>
        </section>

        <section class="section section--selected">
          <div class="selected-head">
            <h2><em>Selected</em> Works<span>精选作品 / ${YEAR_RANGE}</span></h2>
            <div class="selected-head__meta">
              <b>${projectTotal()}</b>
              <span>PROJECTS<br />DIRECTION · IMAGE</span>
            </div>
          </div>
          <div class="work-grid">${cards}${moreCard}</div>
          <div class="section-foot">
            <a class="text-link" href="#/works" data-cursor="link">ALL PROJECTS / 全部作品 <span></span></a>
          </div>
        </section>

        <section class="section section--approach">
          <div class="approach__head">
            <h2>Approach</h2>
            <p>我不追求把一切说清楚。比起解释，我更在意观看发生时，观众心里那一点轻微的偏移。</p>
          </div>
          <div class="approach__list">
            <div class="approach__row">
              <span class="approach__no">01</span>
              <h3 class="approach__title">先找到光<span>FIND THE LIGHT</span></h3>
              <p class="approach__text">光线先于故事存在。找到它，空间就有了情绪，人物才开始呼吸。</p>
              <span class="approach__arrow">↗</span>
            </div>
            <div class="approach__row">
              <span class="approach__no">02</span>
              <h3 class="approach__title">让空间说话<span>LET SPACE SPEAK</span></h3>
              <p class="approach__text">建筑、街道、海面，都是没有台词的演员。我让它们站到镜头前。</p>
              <span class="approach__arrow">↗</span>
            </div>
            <div class="approach__row">
              <span class="approach__no">03</span>
              <h3 class="approach__title">把沉默留下<span>KEEP THE SILENCE</span></h3>
              <p class="approach__text">最好的剪辑，知道什么时候停下来。留白不是空，是让观众进入。</p>
              <span class="approach__arrow">↗</span>
            </div>
          </div>
        </section>

        ${contactSection()}
      </section>
    `;
  }

  /* ----------------------------------------------------------
     CONTENT — WORKS INDEX
  ---------------------------------------------------------- */

  function renderWorks() {
    const filters = ["全部", ...PROJECT_FILTERS];
    const rows = DATA.map((project) => `
      <a
        class="work-row"
        href="#/work/${project.slug}"
        data-filter="${project.filter || project.category}"
        data-cover="${project.cover}"
        data-preview="${project.preview || ""}"
        data-cursor="view"
        data-cursor-label="VIEW"
      >
        <span class="work-row__no">${projectNumber(project)}</span>
        <span class="work-row__title">
          <b>${project.title}</b>
          <em>${project.titleEn}</em>
          ${project.releaseLabel ? `<span class="status-badge${project.releaseLabel === "已上线" ? " is-online" : ""}">${project.releaseLabel}</span>` : ""}
        </span>
        <span class="work-row__cat">${project.category} / ${project.categoryEn}</span>
        <span class="work-row__year">${project.year}</span>
        <span class="work-row__arrow">↗</span>
        <span class="work-row__thumb"><img src="${project.cover}" alt="" loading="lazy" /></span>
      </a>
    `).join("");

    return `
      <section class="view works" data-view="works">
        <header class="works__head">
          <p class="kicker">INDEX / 作品索引 <span class="faint">${YEAR_RANGE}</span></p>
          <h1 class="works__title">
            <em>Selected</em>
            <span>Works</span>
          </h1>
          <div class="works__sub">
            <p>${DATA.length} 部作品，${PROJECT_FILTERS.length} 种形态。<br />海外竖屏短剧、AI 短片与经典复刻。</p>
            <p class="en">Stories are not told.<br />They are allowed to happen.</p>
          </div>
        </header>

        <div class="works__toolbar">
          <div class="filters" role="group" aria-label="按类型筛选作品">
            ${filters.map((filter, index) => `
              <button
                type="button"
                class="filter${index === 0 ? " is-active" : ""}"
                data-filter="${filter}"
                aria-pressed="${index === 0 ? "true" : "false"}"
              >${filter === "全部" ? "ALL / 全部" : filter}</button>
            `).join("")}
          </div>
          <p class="works__count"><b id="work-count">${pad(DATA.length)}</b> PROJECTS</p>
        </div>

        <div class="works__list">${rows || `<p class="works__empty">作品整理中 / NEW WORK COMING SOON</p>`}</div>
        <div class="works-preview" id="works-preview" aria-hidden="true">
          <img src="" alt="" />
          <video muted loop playsinline preload="none"></video>
          <span class="works-preview__label">PREVIEW</span>
        </div>
        <div class="works__note">
          <span>SELECTED WORKS / ${YEAR_RANGE}</span>
          <span>${DATA.length ? "CLICK A TITLE TO ENTER THE PROJECT" : "PLEASE CHECK BACK SOON"}</span>
        </div>

        ${contactSection({ compact: true })}
      </section>
    `;
  }

  /* ----------------------------------------------------------
     CONTENT — WORK DETAIL
  ---------------------------------------------------------- */

  function renderFilm(project) {
    const episodes = (project.episodes || []).filter((episode) => episode.video?.src);
    const video = project.video || episodes[0]?.video;
    if (!video || !video.src) return "";
    const vertical = video.vertical === true || project.vertical === true;
    const poster = video.poster || project.cover;
    const duration = video.duration || project.duration || "";
    const captions = video.captions
      ? `<track kind="captions" src="${video.captions}" srclang="${video.lang || "zh"}" label="${video.langLabel || "中文"}" default />`
      : "";
    const episodeTabs = episodes.length
      ? `<div class="work-film__episodes" role="group" aria-label="选择集数">
          ${episodes.map((episode, index) => `
            <button
              type="button"
              class="episode-tab${index === 0 ? " is-active" : ""}"
              data-episode-src="${episode.video.src}"
              data-episode-poster="${episode.poster || episode.video.poster || project.cover}"
              data-episode-duration="${episode.duration || episode.video.duration || ""}"
              data-episode-label="${episode.label}"
              aria-pressed="${index === 0 ? "true" : "false"}"
            >
              <b>${episode.label}</b><span>${episode.title || ""}</span><em>${episode.duration || ""}</em>
            </button>
          `).join("")}
        </div>`
      : "";

    return `
      <section class="work-film${vertical ? " is-vertical" : ""}" id="film">
        <div class="work-film__head">
          <p class="kicker">WATCH / 正片</p>
          <span>${project.format || ""}${duration ? ` · ${duration}` : ""}</span>
        </div>
        ${episodeTabs}
        <div class="work-film__frame" data-video>
          <video class="work-film__video" playsinline preload="metadata" poster="${poster}" aria-label="${project.title} 正片">
            <source src="${video.src}" type="${video.mime || "video/mp4"}" />
            ${captions}
          </video>
          <button class="work-film__cover" type="button" data-video-toggle aria-label="播放 ${project.title}">
            <img src="${poster}" alt="" data-video-poster loading="lazy" />
            <span class="work-film__play" aria-hidden="true"><i></i><b>PLAY ${episodes.length ? "EPISODE" : "FILM"}</b><em data-video-duration>${duration}</em></span>
          </button>
          <div class="work-film__controls">
            <button type="button" class="video-btn video-btn--play" data-video-toggle aria-label="播放 / 暂停"><span class="video-icon"></span></button>
            <div class="work-film__scrub"><input type="range" min="0" max="1000" value="0" step="1" data-video-progress aria-label="播放进度" /></div>
            <span class="work-film__time" data-video-time>00:00 / 00:00</span>
            <button type="button" class="video-btn" data-video-mute aria-label="静音">SOUND</button>
            <button type="button" class="video-btn" data-video-full aria-label="全屏">FULL</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderScriptSection(project) {
    const script = project.script;
    if (!script || (!script.src && !(script.pages && script.pages.length))) return "";
    const pages = script.pages || [];
    const isStoryboard = script.kind === "storyboard";
    const meta = script.type === "pdf" ? "PDF" : `${pad(pages.length)} PAGES`;
    return `
      <section class="work-script" id="script">
        <div class="work-script__head">
          <p class="kicker">${isStoryboard ? "STORYBOARD / 分镜" : "SCREENPLAY / 剧本"}</p>
          <span>${script.note || "SELECTED PAGES"}</span>
        </div>
        <div class="work-script__card reveal" data-reveal>
          <span class="work-script__label">${isStoryboard ? "STORYBOARD" : "SCRIPT"}</span>
          <div class="work-script__copy">
            <p class="work-script__meta">${project.titleEn} · ${project.year} · ${meta}</p>
            <h2>${script.title || `${project.title} · 剧本`}</h2>
            <p>${script.intro || "从文字到影像，中间隔着一次观看。"}</p>
          </div>
          <button class="work-script__open" type="button" data-open-script="${project.slug}">
            READ THE ${isStoryboard ? "STORYBOARD" : "SCRIPT"} <span>↗</span>
          </button>
        </div>
      </section>
    `;
  }

  function renderWork(slug) {
    const project = getProject(slug);
    if (!project) return renderNotFound();

    const index = DATA.findIndex((item) => item.slug === project.slug);
    const next = DATA.length > 1 ? DATA[(index + 1) % DATA.length] : null;
    const number = projectNumber(project);
    const galleryItems = project.gallery || [];
    const gallery = galleryItems.map((item, i) => `
      <figure
        class="gallery-item"
        data-ratio="${item.ratio}"
        data-lightbox
        data-src="${item.src}"
        data-caption="${item.caption}"
        data-cursor="view"
        data-cursor-label="OPEN"
        tabindex="0"
        role="button"
        aria-label="查看图片：${item.caption}"
        style="--d:${i * 80}ms"
      >
        <div class="gallery-item__frame">
          <img src="${item.src}" alt="${project.title} — ${item.caption}" loading="lazy" decoding="async" />
        </div>
        <figcaption class="gallery-item__cap">
          <b>${item.caption}</b>
          <span>FIG. ${pad(i + 1)}</span>
        </figcaption>
      </figure>
    `).join("");

    const credits = (project.credits || []).map(([role, name]) => `
      <div class="detail-credits__row"><dt>${role}</dt><dd>${name}</dd></div>
    `).join("");

    return `
      <section class="view work-detail" data-view="work" style="--local-accent:${project.accent}">
        <section class="detail-hero">
          <div class="detail-hero__media" data-parallax data-parallax-scale="1.08">
            <img src="${project.hero || project.cover}" alt="${project.title} ${project.titleEn}" style="--pos:${project.position}" />
          </div>
          <div class="detail-hero__shade"></div>
          <div class="detail-hero__top">
            <a class="back-link" href="#/works"><i>←</i> ALL WORKS / 全部作品</a>
            <span>PROJECT ${number} OF ${projectTotal()}</span>
          </div>
          <div class="detail-hero__content">
            <div class="detail-hero__meta">
              <span>${project.year}</span>
              <span class="dot"></span>
              <span>${project.category} / ${project.categoryEn}</span>
              <span class="dot"></span>
              <span>${project.duration}</span>
              ${project.releaseLabel ? `<span class="status-badge${project.releaseLabel === "已上线" ? " is-online" : ""}">${project.releaseLabel}</span>` : ""}
            </div>
            <h1 class="detail-hero__title${Array.from(project.title).length > 6 ? " is-very-long" : Array.from(project.title).length > 3 ? " is-long" : ""}" data-split>${project.title}</h1>
            <p class="detail-hero__en">${project.titleEn}</p>
          </div>
          <div class="detail-hero__foot">
            <span>${project.format}</span>
            <span>SCROLL TO READ THE PROJECT</span>
          </div>
        </section>

        <section class="detail-intro">
          <span class="detail-intro__index">${number} / ${projectTotal()}</span>
          <div class="detail-intro__main">
            <p class="detail-intro__label reveal" data-reveal>SYNOPSIS / 故事简介</p>
            <p class="detail-intro__logline reveal" data-reveal>${project.logline}</p>
            <div class="detail-intro__body reveal" data-reveal style="--d:90ms">
              ${project.synopsis.map((paragraph) => `<p>${paragraph}</p>`).join("")}
            </div>
          </div>
          <aside class="detail-intro__aside reveal" data-reveal style="--d:180ms">
            <div class="credits-mini">
              ${(project.credits || []).slice(0, 4).map(([role, name]) => `<p><span>${role}</span>${name}</p>`).join("")}
            </div>
          </aside>
        </section>

        ${project.releaseNote ? `
          <div class="detail-release reveal" data-reveal>
            <span>${project.releaseLabel || "RELEASE"} / 发行状态</span>
            <p>${project.releaseNote}</p>
          </div>
        ` : ""}

        <div class="detail-marquee" aria-hidden="true">
          <div class="detail-marquee__track">
            ${Array.from({ length: 4 }, () => `
              <span>${project.tagline}</span><i></i>
              <span>${project.titleEn}</span><i></i>
            `).join("")}
          </div>
        </div>

        ${renderFilm(project)}

        ${galleryItems.length ? `<section class="detail-gallery">${gallery}</section>` : ""}

        ${renderScriptSection(project)}

        ${project.quote ? `
          <section class="detail-quote reveal" data-reveal>
            <blockquote>${project.quote}</blockquote>
            <p>${project.titleEn} / ${project.year}</p>
          </section>
        ` : ""}

        <section class="detail-credits">
          <h2>Credits</h2>
          <dl class="detail-credits__list">${credits}</dl>
          <div class="detail-credits__format">
            ${project.format}<br />
            ${project.role}<br />
            ${SITE.nameEn} STUDIO © ${project.year}
          </div>
        </section>

        ${next ? `
          <a class="next-work" href="#/work/${next.slug}" data-cursor="view" data-cursor-label="NEXT">
            <span class="next-work__bg"><img src="${next.cover}" alt="" loading="lazy" /></span>
            <span class="next-work__eyebrow">NEXT PROJECT / 下一部作品</span>
            <span class="next-work__title">${next.title}<em>${next.titleEn}</em></span>
            <span class="next-work__arrow">↗</span>
          </a>
        ` : ""}
      </section>
    `;
  }

  /* ----------------------------------------------------------
     CONTENT — ABOUT
  ---------------------------------------------------------- */

  function renderAbout() {
    const seriesCount = DATA.filter((project) => project.category?.includes("短剧")).length;
    const shortCount = DATA.filter((project) => project.category?.includes("短片") || project.category?.includes("复刻")).length;
    const dynamicValues = [DATA.length, seriesCount, shortCount];
    const stats = SITE.stats.map((stat, index) => {
      const value = Number.isFinite(dynamicValues[index]) ? dynamicValues[index] : stat.value;
      return `
        <div class="stat">
          <p class="stat__num"><b data-count="${value || 0}">0</b><i>${stat.suffix}</i></p>
          <p class="stat__label">${stat.label}<em>${stat.en}</em></p>
        </div>
      `;
    }).join("");

    const practice = SITE.capabilities.map((item) => `
      <div class="practice__row">
        <span class="practice__no">${item.no}</span>
        <h3 class="practice__title">${item.title}<span>${item.en}</span></h3>
        <p class="practice__text">${item.text}</p>
        <span class="practice__arrow">↗</span>
      </div>
    `).join("");

    const timeline = (SITE.workflow || SITE.timeline || []).map((item) => `
      <div class="timeline__item">
        <span class="timeline__year">${item.year}</span>
        <span class="timeline__title">${item.title}</span>
        <span class="timeline__en">${item.en}</span>
      </div>
    `).join("");

    return `
      <section class="view about" data-view="about">
        <header class="about__hero">
          <div class="about__topline">
            <span>ABOUT / 关于</span>
            <span>FILMMAKER / EDITOR — 2026</span>
          </div>
          <h1 class="about__name${Array.from(SITE.name).length > 2 ? " is-long" : ""}"><span class="about__name-text" data-split>${SITE.name}</span><i class="about__name-mark" aria-hidden="true"></i></h1>
          <div class="about__en">
            <span>${displayNameEn}</span>
            <div class="about__role">
              <b>${SITE.role}</b>
              <span>${SITE.roleEn.toUpperCase()}</span>
              <span>BASED IN ${SITE.location.toUpperCase()} · WORKING WORLDWIDE</span>
            </div>
          </div>
        </header>

        <div class="about__grid">
          <figure class="about__portrait reveal" data-reveal>
            <div class="about__portrait-frame">
              <img src="${SITE.aboutImage || "assets/media/about-frame.webp"}" alt="${SITE.aboutImageAlt || `${SITE.name}作品剧照`}" loading="lazy" decoding="async" />
            </div>
            <figcaption><span>${SITE.aboutImageCaption || "FILM STILL"}</span><span>${new Date().getFullYear()}</span></figcaption>
          </figure>
          <div class="about__copy">
            <p class="about__lead" data-split>${SITE.intro[0]}</p>
            <div class="about__body reveal" data-reveal style="--d:120ms">
              <p>${SITE.intro[1]}</p>
              ${SITE.aboutBody.map((paragraph) => `<p>${paragraph}</p>`).join("")}
            </div>
            <p class="about__sign">${displayNameEn}, ${new Date().getFullYear()}</p>
          </div>
        </div>

        <div class="about__stats">${stats}</div>

        <figure class="about__break" data-parallax data-parallax-scale="1.12">
          <img src="assets/works/wolf-king/hero.webp" alt="《狼王娶了女儿的旧爱》剧照" loading="lazy" decoding="async" />
          <figcaption>FRAME FROM THE WOLF KING / EP02</figcaption>
        </figure>

        <section class="about__practice">
          ${sectionHead("01", "PRACTICE / 创作", "DIRECTION · WRITING · EDIT · AI · PRODUCTION")}
          <div class="practice__list">${practice}</div>
        </section>

        <section class="about__timeline">
          ${sectionHead("02", "WORKFLOW / 工作方式", "STORY → IMAGE → RHYTHM → DELIVERY")}
          <div class="timeline__list">${timeline}</div>
        </section>

        ${contactSection()}
      </section>
    `;
  }

  function renderNotFound() {
    return `
      <section class="view not-found" data-view="404" style="min-height:100svh;display:grid;place-items:center;padding:var(--hdr-h) var(--gutter) 20vh;text-align:center">
        <div>
          <p class="kicker" style="justify-content:center">404 / LOST FRAME</p>
          <h1 style="font-family:var(--serif);font-size:clamp(100px,24vw,340px);font-weight:400;font-style:italic;line-height:.8;letter-spacing:-.06em">Lost.</h1>
          <p style="margin:28px 0 34px;color:var(--muted);font-size:13px;letter-spacing:.08em">这一帧不在片子里。</p>
          <a class="text-link" href="#/">BACK TO INDEX <span></span></a>
        </div>
      </section>
    `;
  }

  /* ----------------------------------------------------------
     TEXT SPLITTING
  ---------------------------------------------------------- */

  function splitElement(el) {
    if (!el || el.dataset.splitDone === "true") return;
    const original = el.textContent;
    let index = 0;

    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const fragment = document.createDocumentFragment();
          Array.from(child.textContent).forEach((char) => {
            if (char === " ") {
              fragment.appendChild(document.createTextNode(" "));
              return;
            }
            if (char === "\n") return;
            const wrap = document.createElement("span");
            wrap.className = "char-wrap";
            wrap.setAttribute("aria-hidden", "true");
            const inner = document.createElement("span");
            inner.className = "char";
            inner.textContent = char;
            inner.style.setProperty("--i", index++);
            wrap.appendChild(inner);
            fragment.appendChild(wrap);
          });
          child.replaceWith(fragment);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.tagName === "BR") return;
          walk(child);
        }
      });
    };

    el.setAttribute("aria-label", original);
    walk(el);
    el.dataset.splitDone = "true";
  }

  /* ----------------------------------------------------------
     REVEAL SYSTEM
  ---------------------------------------------------------- */

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        queuedReveals.add(el);
        if (revealEnabled) {
          el.classList.add("is-in");
          queuedReveals.delete(el);
        }
        revealObserver.unobserve(el);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
  );

  function observeReveal(el) {
    if (!el) return;
    if (!el.classList.contains("reveal") && !el.hasAttribute("data-split")) return;
    revealObserver.observe(el);
  }

  function flushReveals() {
    revealEnabled = true;
    queuedReveals.forEach((el) => {
      el.classList.add("is-in");
    });
    queuedReveals.clear();
  }

  /* ----------------------------------------------------------
     COUNTERS
  ---------------------------------------------------------- */

  function initCounters(root) {
    $$("[data-count]", root).forEach((el) => {
      if (el.dataset.countDone) return;
      const target = Number(el.dataset.count) || 0;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            observer.unobserve(el);
            el.dataset.countDone = "true";
            if (reducedMotion) {
              el.textContent = target;
              return;
            }
            const start = performance.now();
            const duration = 1500;
            const tick = (now) => {
              const progress = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              el.textContent = Math.round(eased * target);
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          });
        },
        { threshold: 0.4 }
      );
      observer.observe(el);
    });
  }

  /* ----------------------------------------------------------
     PARALLAX
  ---------------------------------------------------------- */

  let parallaxItems = [];

  function initParallax(root) {
    parallaxItems = $$("[data-parallax]", root).map((el) => ({
      el,
      img: el.querySelector("img"),
      scale: Number(el.dataset.parallaxScale) || 1.12,
      offset: 0
    })).filter((item) => item.img);
    updateParallax();
  }

  function updateParallax() {
    if (reducedMotion || !parallaxItems.length) return;
    const vh = window.innerHeight;
    parallaxItems.forEach((item) => {
      const rect = item.el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      const offset = Math.max(-70, Math.min(70, progress * -48));
      item.img.style.transform = `scale(${item.scale}) translate3d(0, ${offset.toFixed(2)}px, 0)`;
    });
  }

  /* ----------------------------------------------------------
     CURSOR + MAGNETIC
  ---------------------------------------------------------- */

  function initCursor() {
    if (!finePointer) return;
    document.documentElement.classList.add("has-cursor");
    const ring = $("#cursor");
    const dot = $("#cursor-dot");
    const label = $(".cursor__label", ring);
    const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
    const pos = { x: mouse.x, y: mouse.y };
    let visible = false;

    window.addEventListener("pointermove", (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      if (!visible) {
        visible = true;
        pos.x = mouse.x;
        pos.y = mouse.y;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
      dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
    }, { passive: true });

    document.addEventListener("pointerleave", () => {
      visible = false;
      ring.classList.add("is-hidden");
      dot.classList.add("is-hidden");
    });
    document.addEventListener("pointerenter", () => {
      ring.classList.remove("is-hidden");
      dot.classList.remove("is-hidden");
    });

    const tick = () => {
      pos.x += (mouse.x - pos.x) * 0.18;
      pos.y += (mouse.y - pos.y) * 0.18;
      ring.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const reset = () => {
      ring.classList.remove("is-view", "is-link", "is-drag");
      label.textContent = "";
    };

    document.addEventListener("pointerover", (event) => {
      const target = event.target.closest("[data-cursor]");
      if (target) {
        reset();
        const type = target.dataset.cursor;
        const text = target.dataset.cursorLabel || "";
        if (type === "view") ring.classList.add("is-view");
        else if (type === "play") {
          ring.classList.add("is-view");
          label.textContent = "PLAY";
          return;
        } else if (type === "mail") {
          ring.classList.add("is-view");
          label.textContent = "WRITE";
          return;
        } else {
          ring.classList.add("is-link");
        }
        label.textContent = text;
        return;
      }
      if (event.target.closest("a, button")) {
        reset();
        ring.classList.add("is-link");
      } else {
        reset();
      }
    });

    document.addEventListener("pointerout", (event) => {
      if (event.target.closest("[data-cursor]") && !event.relatedTarget?.closest("[data-cursor]")) {
        reset();
      }
    });
  }

  function initMagnetic(root) {
    if (!finePointer || reducedMotion) return;
    $$("[data-magnetic]", root).forEach((el) => {
      if (el.dataset.magneticBound) return;
      el.dataset.magneticBound = "true";
      const onMove = (event) => {
        const rect = el.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        el.style.transform = `translate3d(${x * 7}px, ${y * 7}px, 0)`;
      };
      const onLeave = () => {
        el.style.transform = "";
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
    });
  }

  /* ----------------------------------------------------------
     HERO AMBIENCE
  ---------------------------------------------------------- */

  function initHero(root) {
    if (!finePointer || reducedMotion) return;
    const hero = $(".hero", root);
    if (!hero) return;
    const media = $(".hero__media", hero);
    if (!media) return;
    hero.addEventListener("pointermove", (event) => {
      const x = (event.clientX / innerWidth - 0.5) * 10;
      const y = (event.clientY / innerHeight - 0.5) * 8;
      media.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    });
    hero.addEventListener("pointerleave", () => {
      media.style.transform = "";
    });
  }

  function initHoverPreviews(root) {
    if (!finePointer || reducedMotion) return;
    $$(".work-card__preview", root).forEach((video) => {
      const card = video.closest(".work-card");
      if (!card) return;
      let timer = 0;

      const stop = () => {
        clearTimeout(timer);
        card.classList.remove("is-previewing");
        video.pause();
        video.currentTime = 0;
      };

      const start = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (!video.src) {
            video.src = video.dataset.previewSrc;
            video.load();
          }
          video.muted = true;
          video.currentTime = 0;
          video.play().catch(() => card.classList.remove("is-previewing"));
        }, 280);
      };

      video.addEventListener("playing", () => card.classList.add("is-previewing"));
      video.addEventListener("error", () => card.classList.remove("is-previewing"));
      card.addEventListener("pointerenter", start);
      card.addEventListener("pointerleave", stop);
    });
  }

  /* ----------------------------------------------------------
     VIEW INIT
  ---------------------------------------------------------- */

  function initView(view, route) {
    currentView = view;
    $$("[data-split]", view).forEach(splitElement);
    $$(".reveal, [data-split]", view).forEach(observeReveal);
    initCounters(view);
    initParallax(view);
    initMagnetic(view);
    initHero(view);

    if (route.name === "works") initWorksView(view);
    if (route.name === "work") initWorkView(view);
    if (route.name === "home") initHomeView(view);

    updateClock();
  }

  function initHomeView(view) {
    initHoverPreviews(view);
    const reelButton = $("[data-reel]", view);
    if (reelButton) {
      initReelMedia();
      reelButton.addEventListener("click", openReel);
    }
  }

  function initWorksView(view) {
    const workRows = $$(".work-row", view);
    const filterButtons = $$(".filter", view);
    const count = $("#work-count", view);
    const preview = $("#works-preview", view);
    const previewImg = $("img", preview);
    const previewVideo = $("video", preview);
    const list = $(".works__list", view);
    const stopPreview = () => {
      if (!previewVideo) return;
      previewVideo.pause();
      previewVideo.currentTime = 0;
      preview.classList.remove("is-video");
    };
    if (previewVideo) {
      previewVideo.addEventListener("playing", () => preview.classList.add("is-video"));
      previewVideo.addEventListener("error", () => preview.classList.remove("is-video"));
    }
    let filterAnimating = false;

    filterButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        if (filterAnimating) return;
        const filter = button.dataset.filter;
        if (button.classList.contains("is-active")) return;
        filterAnimating = true;
        filterButtons.forEach((btn) => {
          const active = btn === button;
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-pressed", active ? "true" : "false");
        });

        if (!reducedMotion) {
          await list.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 180, easing: "ease-in", fill: "forwards" }
          ).finished;
        }

        let visible = 0;
        workRows.forEach((row) => {
          const show = filter === "全部" || row.dataset.filter === filter;
          row.hidden = !show;
          if (show) visible++;
        });
        count.textContent = pad(visible);

        if (!reducedMotion) {
          list.getAnimations?.().forEach((a) => a.cancel());
          await list.animate(
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: 420, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" }
          ).finished;
          list.getAnimations?.().forEach((a) => a.cancel());
          list.style.opacity = "";
        }
        filterAnimating = false;
      });
    });

    if (!finePointer || !preview) return;

    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let active = false;

    const loop = () => {
      if (active) {
        x += (tx - x) * 0.12;
        y += (ty - y) * 0.12;
        preview.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(1)`;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    view.addEventListener("pointermove", (event) => {
      const halfW = preview.offsetWidth / 2 + 18;
      const halfH = preview.offsetHeight / 2 + 18;
      tx = Math.min(Math.max(event.clientX, halfW), innerWidth - halfW);
      ty = Math.min(Math.max(event.clientY, halfH), innerHeight - halfH);
      if (!active) {
        x = tx;
        y = ty;
      }
    }, { passive: true });

    workRows.forEach((row) => {
      row.addEventListener("pointerenter", () => {
        previewImg.src = row.dataset.cover;
        previewImg.alt = "";
        preview.classList.add("is-visible");
        preview.classList.remove("is-video");
        if (previewVideo && row.dataset.preview) {
          if (previewVideo.src !== new URL(row.dataset.preview, location.href).href) {
            previewVideo.src = row.dataset.preview;
            previewVideo.load();
          }
          previewVideo.muted = true;
          previewVideo.currentTime = 0;
          previewVideo.play().catch(() => {});
        }
        active = true;
      });
      row.addEventListener("pointerleave", () => {
        preview.classList.remove("is-visible");
        stopPreview();
        active = false;
      });
    });

    view.addEventListener("pointerleave", () => {
      preview.classList.remove("is-visible");
      stopPreview();
      active = false;
    });
  }

  function initVideoPlayer(root) {
    const frame = $("[data-video]", root);
    if (!frame) return;
    const video = $("video", frame);
    const cover = $(".work-film__cover", frame);
    const progress = $("[data-video-progress]", frame);
    const time = $("[data-video-time]", frame);
    const mute = $("[data-video-mute]", frame);
    const full = $("[data-video-full]", frame);
    const coverImage = $("[data-video-poster]", frame);
    const coverDuration = $("[data-video-duration]", frame);
    const source = $("source", video);
    const tabs = $$(".episode-tab", root);
    if (!video) return;

    const formatTime = (value) => {
      if (!Number.isFinite(value)) return "00:00";
      const seconds = Math.max(0, Math.floor(value));
      return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
    };

    const sync = () => {
      const duration = video.duration || 0;
      const percent = duration ? (video.currentTime / duration) * 1000 : 0;
      if (progress && !progress.matches(":active")) progress.value = String(percent);
      progress?.style.setProperty("--p", `${percent / 10}%`);
      if (time) time.textContent = `${formatTime(video.currentTime)} / ${formatTime(duration)}`;
    };

    const toggle = () => {
      if (video.paused || video.ended) {
        video.play().catch(() => showToast("视频暂时无法播放，请检查文件路径"));
      } else {
        video.pause();
      }
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((item) => {
          const active = item === tab;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", active ? "true" : "false");
        });
        if (source) source.src = tab.dataset.episodeSrc;
        const episodePoster = tab.dataset.episodePoster;
        if (episodePoster) {
          video.poster = episodePoster;
          if (coverImage) coverImage.src = episodePoster;
        }
        if (coverDuration) coverDuration.textContent = tab.dataset.episodeDuration || "";
        video.pause();
        video.load();
        frame.classList.remove("is-playing");
        cover?.classList.remove("is-hidden");
        sync();
        video.play().catch(() => {});
      });
    });

    $$("[data-video-toggle]", frame).forEach((button) => button.addEventListener("click", toggle));
    video.addEventListener("click", toggle);
    video.addEventListener("timeupdate", sync);
    video.addEventListener("loadedmetadata", sync);
    video.addEventListener("play", () => {
      frame.classList.add("is-playing");
      cover?.classList.add("is-hidden");
    });
    video.addEventListener("pause", () => frame.classList.remove("is-playing"));
    video.addEventListener("ended", () => {
      frame.classList.remove("is-playing");
      cover?.classList.remove("is-hidden");
    });
    video.addEventListener("error", () => {
      frame.classList.add("has-error");
      showToast("视频文件未找到");
    });

    progress?.addEventListener("input", () => {
      if (video.duration) video.currentTime = (Number(progress.value) / 1000) * video.duration;
      sync();
    });

    mute?.addEventListener("click", () => {
      video.muted = !video.muted;
      mute.textContent = video.muted ? "MUTED" : "SOUND";
      mute.classList.toggle("is-muted", video.muted);
    });

    full?.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else frame.requestFullscreen?.().catch(() => {});
    });
  }

  function initWorkView(view) {
    initVideoPlayer(view);
    $$("[data-lightbox]", view).forEach((figure) => {
      const open = () => {
        openLightbox(figure.dataset.src, figure.dataset.caption, $("img", figure)?.alt || "");
      };
      figure.addEventListener("click", open);
      figure.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });

    $$("[data-open-script]", view).forEach((button) => {
      button.addEventListener("click", () => {
        const project = getProject(button.dataset.openScript);
        if (project) openScript(project);
      });
    });
  }

  /* ----------------------------------------------------------
     SCRIPT READER
  ---------------------------------------------------------- */

  function scriptBlockHtml(block) {
    const type = block.t || block.type || "action";
    const text = block.x || block.text || "";
    const zh = block.zh || "";
    const className = {
      scene: "sp-scene",
      action: "sp-action",
      char: "sp-character",
      character: "sp-character",
      paren: "sp-paren",
      dia: "sp-dialogue",
      dialogue: "sp-dialogue",
      trans: "sp-transition",
      transition: "sp-transition",
      title: "sp-title",
      center: "sp-center",
      space: "sp-space"
    }[type] || "sp-action";
    if (type === "space") return `<div class="sp-space"></div>`;
    return `<p class="${className}">${text}${zh ? `<span class="sp-zh">${zh}</span>` : ""}</p>`;
  }

  function renderScriptPage() {
    const script = scriptState.project?.script;
    if (!script) return;
    const page = scriptState.pages[scriptState.page] || [];
    const blocks = page.blocks || page;
    const pageLabel = $("#script-page");
    const body = $("#script-reader-body");
    body.innerHTML = `
      <article class="screenplay-page">
        <header class="screenplay-page__head">
          <span>${script.title || scriptState.project.title}</span>
          <span>${pad(scriptState.page + 1)}</span>
        </header>
        <div class="screenplay-page__body">${blocks.map(scriptBlockHtml).join("")}</div>
        <footer class="screenplay-page__foot">
          <span>${scriptState.project.titleEn} / ${scriptState.project.year}</span>
          <span>${script.source || "SHOOTING SCRIPT"}</span>
        </footer>
      </article>
    `;
    if (pageLabel) pageLabel.textContent = `${pad(scriptState.page + 1)} / ${pad(scriptState.pages.length)}`;
    const stage = $(".script-reader__stage");
    if (stage) stage.scrollTop = 0;
    const prev = $("#script-prev");
    const next = $("#script-next");
    if (prev) prev.disabled = scriptState.page === 0;
    if (next) next.disabled = scriptState.page >= scriptState.pages.length - 1;
  }

  function openScript(project) {
    const script = project.script;
    if (!script) return;
    closeMenu(true);
    closeReel();
    closeLightbox();
    scriptOpen = true;
    lastFocused = document.activeElement;
    scriptState.project = project;
    scriptState.page = 0;
    scriptState.pages = script.pages || [];
    scriptReader.classList.add("is-open");
    scriptReader.setAttribute("aria-hidden", "false");
    document.body.classList.add("script-open");
    const pdfLink = $("#script-pdf-link");
    const body = $("#script-reader-body");
    const pager = $(".script-reader__foot");
    const isPdf = script.type === "pdf" || /\.pdf($|\?)/i.test(script.src || "");
    const readerTitle = $("#script-reader-title");
    if (readerTitle) {
      readerTitle.textContent = script.kind === "storyboard"
        ? "STORYBOARD READER / 分镜"
        : "SCREENPLAY READER / 剧本";
    }

    if (isPdf && script.src) {
      if (pdfLink) {
        pdfLink.href = script.src;
        pdfLink.hidden = false;
      }
      if (pager) pager.hidden = true;
      body.innerHTML = `
        <div class="script-reader__pdf">
          <iframe src="${script.src}" title="${project.title} 剧本 PDF"></iframe>
          <p>如果浏览器没有显示 PDF，可以直接打开文件：<a href="${script.src}" target="_blank" rel="noopener">${script.src} ↗</a></p>
        </div>
      `;
    } else {
      if (pdfLink) pdfLink.hidden = true;
      if (pager) pager.hidden = false;
      renderScriptPage();
    }

    const stage = $(".script-reader__stage");
    if (stage) stage.scrollTop = 0;
    setTimeout(() => $("#script-close")?.focus({ preventScroll: true }), 300);
  }

  function closeScript() {
    if (!scriptOpen) return;
    scriptOpen = false;
    scriptReader.classList.remove("is-open");
    scriptReader.setAttribute("aria-hidden", "true");
    document.body.classList.remove("script-open");
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
  }

  /* ----------------------------------------------------------
     REEL
  ---------------------------------------------------------- */

  const reelState = { index: 0, timer: 0, clock: 0, started: 0 };
  let reelProjects = [];

  function initReelMedia() {
    const items = (FEATURED.length ? FEATURED : DATA).slice(0, 8);
    const media = $(".reel__media", reel);
    const bars = $("#reel-bars");
    const trigger = $("[data-reel]");
    reelProjects = items;
    if (!items.length) {
      trigger?.remove();
      return;
    }
    media.innerHTML = items.map((project, index) => `
      <img
        class="reel__img${index === 0 ? " is-active" : ""}"
        src="${project.cover}"
        alt=""
        ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}
        decoding="async"
      />
    `).join("");
    bars.innerHTML = items.map((_, index) => `<i${index === 0 ? ' class="is-active"' : ""}></i>`).join("");
    $("#reel-range").textContent = `SHOWREEL / STILLS · ${YEAR_RANGE}`;
    setReel(0);
  }

  function setReel(index) {
    if (!reelProjects.length) return;
    reelState.index = (index + reelProjects.length) % reelProjects.length;
    const project = reelProjects[reelState.index];
    const images = $$(".reel__img", reel);
    const bars = $$("#reel-bars i");
    images.forEach((img, i) => img.classList.toggle("is-active", i === reelState.index));
    bars.forEach((bar, i) => bar.classList.toggle("is-active", i === reelState.index));
    $("#reel-count", reel).textContent = `${pad(reelState.index + 1)} / ${pad(reelProjects.length)}`;
    $("#reel-cn", reel).textContent = project.title;
    $("#reel-en", reel).textContent = project.titleEn;
  }

  function reelTick() {
    if (!reelOpen) return;
    const elapsed = performance.now() - reelState.started;
    const totalFrames = Math.floor((elapsed / 1000) * 24);
    const frames = totalFrames % 24;
    const totalSeconds = Math.floor(elapsed / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);
    $("#reel-time", reel).textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
    reelState.clock = requestAnimationFrame(reelTick);
  }

  function openReel() {
    if (reelOpen || !reelProjects.length) return;
    closeMenu(true);
    closeScript();
    reelOpen = true;
    reelState.started = performance.now();
    lastFocused = document.activeElement;
    setReel(0);
    reel.classList.add("is-open");
    reel.setAttribute("aria-hidden", "false");
    document.body.classList.add("reel-open");
    clearInterval(reelState.timer);
    reelState.timer = setInterval(() => setReel(reelState.index + 1), 3400);
    cancelAnimationFrame(reelState.clock);
    reelState.clock = requestAnimationFrame(reelTick);
    setTimeout(() => $("#reel-close", reel)?.focus(), 500);
  }

  function closeReel() {
    if (!reelOpen) return;
    reelOpen = false;
    clearInterval(reelState.timer);
    cancelAnimationFrame(reelState.clock);
    reel.classList.remove("is-open");
    reel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("reel-open");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  /* ----------------------------------------------------------
     LIGHTBOX
  ---------------------------------------------------------- */

  function openLightbox(src, caption, alt) {
    const img = $("#lightbox-img");
    img.src = src;
    img.alt = alt || caption || "";
    $("#lightbox-caption").textContent = caption || "";
    $("#lightbox-index").textContent = "IMAGE / 01";
    lightboxOpen = true;
    lastFocused = document.activeElement;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    setTimeout(() => $("#lightbox-close").focus(), 200);
  }

  function closeLightbox() {
    if (!lightboxOpen) return;
    lightboxOpen = false;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    setTimeout(() => {
      if (!lightboxOpen) $("#lightbox-img").src = "";
    }, 500);
  }

  /* ----------------------------------------------------------
     MENU
  ---------------------------------------------------------- */

  function openMenu() {
    if (menuOpen) return;
    closeReel();
    closeLightbox();
    closeScript();
    menuOpen = true;
    lastFocused = document.activeElement;
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    menuBtn.setAttribute("aria-expanded", "true");
    menuBtn.setAttribute("aria-label", "关闭菜单");
    document.body.classList.add("menu-open");
    setTimeout(() => $(".menu__nav a", menu)?.focus({ preventScroll: true }), 600);
  }

  function closeMenu(immediate = false) {
    if (!menuOpen) return;
    menuOpen = false;
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "打开菜单");
    document.body.classList.remove("menu-open");
    if (!immediate && lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
  }

  function initMenu() {
    menuBtn.addEventListener("click", () => {
      if (menuOpen) closeMenu();
      else openMenu();
    });

    const preview = $(".menu__preview", menu);
    const previewImg = $("img", preview);

    $$(".menu__nav a", menu).forEach((link) => {
      link.addEventListener("pointerenter", () => {
        const src = link.dataset.preview;
        if (!src || !previewImg) return;
        preview.classList.add("is-switching");
        setTimeout(() => {
          previewImg.src = src;
          preview.classList.remove("is-switching");
        }, 140);
      });

      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href || !href.startsWith("#")) return;
        event.preventDefault();
        closeMenu(true);
        const target = href;
        setTimeout(() => {
          if (location.hash === target) {
            window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
          } else {
            location.hash = target;
          }
        }, 320);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (scriptOpen) closeScript();
        else if (reelOpen) closeReel();
        else if (lightboxOpen) closeLightbox();
        else if (menuOpen) closeMenu();
      }

      if (scriptOpen && !event.target.matches("input, textarea")) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          if (scriptState.page > 0) {
            scriptState.page -= 1;
            renderScriptPage();
          }
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          if (scriptState.page < scriptState.pages.length - 1) {
            scriptState.page += 1;
            renderScriptPage();
          }
        }
      }

      if (event.key === "Tab" && menuOpen) {
        const focusables = [menuBtn, ...$$("a, button", menu).filter((el) => el.offsetParent !== null)];
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }

      if (event.key === "Tab" && lightboxOpen) {
        const focusables = $$("button", lightbox).filter((el) => el.offsetParent !== null);
        if (!focusables.length) return;
        if (event.shiftKey) {
          event.preventDefault();
          focusables[focusables.length - 1].focus();
        }
      }
    });
  }

  /* ----------------------------------------------------------
     COPY + TOAST
  ---------------------------------------------------------- */

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1900);
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      try {
        const input = document.createElement("textarea");
        input.value = value;
        input.setAttribute("readonly", "");
        input.style.cssText = "position:fixed;opacity:0;left:-9999px";
        document.body.appendChild(input);
        input.select();
        const result = document.execCommand("copy");
        input.remove();
        return result;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  document.addEventListener("click", async (event) => {
    const copyBtn = event.target.closest("[data-copy]");
    if (copyBtn) {
      event.preventDefault();
      const ok = await copyText(copyBtn.dataset.copy);
      showToast(ok ? "微信号已复制 / WECHAT COPIED" : `请手动复制：${SITE.wechat}`);
      return;
    }
    const topBtn = event.target.closest("[data-to-top]");
    if (topBtn) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    }
  });

  /* ----------------------------------------------------------
     CLOCK
  ---------------------------------------------------------- */

  function updateClock() {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const text = `${formatter.format(new Date())} CST`;
    $$("[data-clock]").forEach((el) => {
      el.textContent = text;
    });
  }

  /* ----------------------------------------------------------
     PAGE TRANSITIONS + ROUTER
  ---------------------------------------------------------- */

  async function curtainIn(route) {
    const meta = routeMeta(route);
    const panels = $$(".transition__panels i");
    const label = $(".transition__label", transition);
    $("small", label).textContent = meta.small;
    $("span", label).textContent = meta.label;
    transition.classList.add("is-active");
    transition.setAttribute("aria-hidden", "false");
    label.style.opacity = "0";
    transition.classList.remove("is-readable");
    panels.forEach((panel) => {
      panel.getAnimations?.().forEach((animation) => animation.cancel());
      panel.style.transform = "translateY(101%)";
    });

    if (reducedMotion) {
      panels.forEach((panel) => {
        panel.style.transform = "translateY(0)";
      });
      transition.classList.add("is-readable");
      await wait(80);
      return;
    }

    await nextFrame();
    const animations = panels.map((panel, index) =>
      panel.animate(
        [{ transform: "translateY(101%)" }, { transform: "translateY(0)" }],
        {
          duration: 720,
          delay: index * 55,
          easing: "cubic-bezier(.76,0,.24,1)",
          fill: "both"
        }
      ).finished
    );
    await Promise.all(animations);
    panels.forEach((panel) => {
      panel.getAnimations?.().forEach((animation) => animation.cancel());
      panel.style.transform = "translateY(0)";
    });
    transition.classList.add("is-readable");
    await wait(100);
  }

  async function curtainOut() {
    const panels = $$(".transition__panels i");
    transition.classList.remove("is-readable");

    if (reducedMotion) {
      panels.forEach((panel) => {
        panel.style.transform = "translateY(101%)";
      });
      transition.classList.remove("is-active");
      transition.setAttribute("aria-hidden", "true");
      return;
    }

    await wait(100);
    const ordered = panels.slice().reverse();
    const animations = ordered.map((panel, index) =>
      panel.animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(-101%)" }],
        {
          duration: 760,
          delay: index * 48,
          easing: "cubic-bezier(.76,0,.24,1)",
          fill: "both"
        }
      ).finished
    );
    await Promise.all(animations);
    panels.forEach((panel) => {
      panel.getAnimations?.().forEach((animation) => animation.cancel());
      panel.style.transform = "translateY(101%)";
    });
    transition.classList.remove("is-active");
    transition.setAttribute("aria-hidden", "true");
  }

  function viewForRoute(route) {
    if (route.name === "works") return renderWorks();
    if (route.name === "about") return renderAbout();
    if (route.name === "work") return renderWork(route.slug);
    if (route.name === "404") return renderNotFound();
    return renderHome();
  }

  function renderRoute(route, scrollTop = 0) {
    const html = viewForRoute(route);
    app.innerHTML = html;
    window.scrollTo(0, scrollTop);
    currentRoute = route;
    const view = app.firstElementChild;
    setHeader(route);
    initView(view, route);
    view.classList.add("is-current");
    return view;
  }

  async function transitionTo(route) {
    if (transitioning) {
      queuedRoute = route;
      return;
    }
    if (!currentRoute) return;
    transitioning = true;
    revealEnabled = false;
    closeMenu(true);
    closeScript();

    const oldPath = currentRoute.path;
    scrollPositions.set(oldPath, window.scrollY);

    await curtainIn(route);
    const restore = scrollPositions.get(route.path) || 0;
    const view = renderRoute(route, restore);
    await nextFrame();
    updateParallax();
    await curtainOut();
    transitioning = false;
    revealEnabled = true;
    flushReveals();

    if (route.name === "home") {
      requestAnimationFrame(() => view.classList.add("is-entered"));
    }

    if (queuedRoute) {
      const next = queuedRoute;
      queuedRoute = null;
      if (next.key !== currentRoute.key) transitionTo(next);
    }
  }

  async function handleRouteChange() {
    const route = parseRoute();
    if (!currentRoute) {
      renderRoute(route);
      return;
    }
    if (route.key === currentRoute.key) return;
    await transitionTo(route);
  }

  /* ----------------------------------------------------------
     LOADER
  ---------------------------------------------------------- */

  function runLoader() {
    const count = $(".loader__count b", loader);
    const line = $(".loader__line i", loader);
    const duration = reducedMotion ? 420 : 1550;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2.2);
      count.textContent = String(Math.round(eased * 100)).padStart(2, "0");
      line.style.transform = `scaleX(${eased})`;
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        finishLoader();
      }
    };

    requestAnimationFrame(tick);
  }

  function finishLoader() {
    loader.classList.add("is-done");
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-gated");
    siteReady = true;
    updateParallax();
    setTimeout(() => {
      if (!entered) $("#entry-enter")?.focus({ preventScroll: true });
    }, 1200);
  }

  function enterPortfolio() {
    if (entered) return;
    entered = true;
    entry.classList.add("is-leaving");
    document.body.classList.remove("is-gated");
    document.body.classList.add("is-entered");
    window.scrollTo(0, 0);
    flushReveals();
    if (currentView) currentView.classList.add("is-entered");
    updateParallax();
    setTimeout(() => entry.remove(), 1300);
  }

  /* ----------------------------------------------------------
     SCROLL
  ---------------------------------------------------------- */

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
      if (siteReady) updateParallax();
      ticking = false;
    });
  }

  /* ----------------------------------------------------------
     BOOT
  ---------------------------------------------------------- */

  function boot() {
    syncIdentity();
    currentRoute = null;
    renderRoute(parseRoute());
    initCursor();
    initMenu();
    initViewEvents();
    runLoader();
    onScroll();
    updateClock();
    setInterval(updateClock, 30000);

    window.addEventListener("hashchange", handleRouteChange);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateParallax, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (reelOpen) clearInterval(reelState.timer);
      } else if (reelOpen) {
        clearInterval(reelState.timer);
        reelState.timer = setInterval(() => setReel(reelState.index + 1), 3400);
      }
    });
  }

  function initViewEvents() {
    $("#entry-enter").addEventListener("click", enterPortfolio);
    document.addEventListener("keydown", (event) => {
      if (!entered && event.key === "Tab") {
        event.preventDefault();
        $("#entry-enter")?.focus();
      }
    });
    $("#reel-close").addEventListener("click", closeReel);
    $("#lightbox-close").addEventListener("click", closeLightbox);
    $("#script-close").addEventListener("click", closeScript);
    $("#script-prev").addEventListener("click", () => {
      if (scriptState.page > 0) {
        scriptState.page -= 1;
        renderScriptPage();
      }
    });
    $("#script-next").addEventListener("click", () => {
      if (scriptState.page < scriptState.pages.length - 1) {
        scriptState.page += 1;
        renderScriptPage();
      }
    });
    scriptReader.addEventListener("click", (event) => {
      if (event.target === scriptReader) closeScript();
    });
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox || event.target.classList.contains("lightbox__stage")) {
        closeLightbox();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
