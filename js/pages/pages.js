import page from "https://cdn.jsdelivr.net/npm/page@1.11.6/+esm";
import { SEOManager } from "./seo.js";
import { ResourceManager } from "./resources.js";
import { fetchTextCached } from "./dom.js";

class SPARouter {
  constructor() {
    this.pagesDir = "/pages";
    this.defaultExtensions = ["html", "htm"];
    this.seoManager = new SEOManager();
    this.resourceManager = new ResourceManager();
  }

  async init() {
    await this.registerRoutes();
    page("*", (ctx) => this.handleRoute(ctx, null));
    page.start();
  }

  async registerRoutes() {
    try {
      const res = await fetch(`${location.origin}/routes.json`);
      const config = res.ok ? await res.json() : { routes: [] };

      config.routes.forEach((route) => {
        const pagePath = route.path.replace(/\{(\w+)\}/g, ":$1");
        page(pagePath, (ctx) => this.handleRoute(ctx, route));
      });
    } catch (error) {
      console.error("Ошибка загрузки routes.json:", error);
    }
  }

  async handleRoute(ctx, routeConfig) {
    try {
      let pageData;
      if (routeConfig) {
        pageData = await this.getPageData(routeConfig);
        pageData.params = ctx.params;
      } else {
        pageData = await this.resolveByConvention(ctx.path);
      }

      if (!pageData) {
        return this.show404(ctx.path);
      }

      this.renderPage(pageData);
    } catch (error) {
      console.error(`Ошибка загрузки страницы "${ctx.path}":`, error);
      this.show404(ctx.path);
    }
  }

  async resolveByConvention(path) {
    const cleanPath = path.split("?")[0].split("#")[0].replace(/\/{2,}/g, "/");
    let fileBase = cleanPath === "/" ? "home" : cleanPath.slice(1);
    if (fileBase.endsWith("/")) fileBase = fileBase.slice(0, -1);

    for (const ext of this.defaultExtensions) {
      try {
        const cached = await this.getCachedHtml(`${fileBase}.${ext}`);
        return { ...cached, seo: cached.extractedSEO, params: {} };
      } catch {
      }
    }
    return null;
  }

  renderPage(pageData) {
    this.resourceManager.clearPageResources();
    this.seoManager.update(pageData.seo);

    document.body.innerHTML = pageData.bodyContent;
    window.routeParams = pageData.params || {};

    this.resourceManager.loadStyles(pageData.styles);
    this.resourceManager.loadScripts(pageData.headScripts, "head");
    this.resourceManager.loadScripts(pageData.bodyScripts, "body");

    if (typeof window.onRouteLoad === "function") {
      window.onRouteLoad(pageData.params);
    }
  }

  async getPageData(routeConfig) {
    const cached = await this.getCachedHtml(routeConfig.page);
    return {
      ...cached,
      seo: routeConfig.seo || cached.extractedSEO,
    };
  }

  async getCachedHtml(pageFile) {
    const html = await fetchTextCached(`${this.pagesDir}/${pageFile}`);

    const doc = new DOMParser().parseFromString(html, "text/html");

    this.resolveRelativeUrls(doc, "script[src]", "src");
    this.resolveRelativeUrls(doc, 'link[rel="stylesheet"][href]', "href");

    const parsed = {
      bodyContent: doc.body.innerHTML,
      styles: Array.from(doc.head.querySelectorAll('link[rel="stylesheet"], style')),
      headScripts: Array.from(doc.head.querySelectorAll("script")),
      bodyScripts: Array.from(doc.body.querySelectorAll("script")),
      extractedSEO: this.extractSEO(doc.head),
    };

    return parsed;
  }

  resolveRelativeUrls(doc, selector, attr) {
    doc.querySelectorAll(selector).forEach((el) => {
      const value = el.getAttribute(attr);
      if (!value) return;
      if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(value)) return;
      if (value.startsWith("/") || value.startsWith("data:")) return;

      const resolvedUrl = new URL(value, `${location.origin}/`).pathname;
      el.setAttribute(attr, resolvedUrl);
    });
  }

  extractSEO(head) {
    const seo = {
      title: head.querySelector("title")?.textContent || "",
      description: head.querySelector('meta[name="description"]')?.content || "",
      keywords: head.querySelector('meta[name="keywords"]')?.content || "",
      author: head.querySelector('meta[name="author"]')?.content || "",
      robots: head.querySelector('meta[name="robots"]')?.content || "",
    };

    const ogTitle = head.querySelector('meta[property="og:title"]');
    const ogDesc = head.querySelector('meta[property="og:description"]');
    const ogImg = head.querySelector('meta[property="og:image"]');

    if (ogTitle) seo.ogTitle = ogTitle.content;
    if (ogDesc) seo.ogDescription = ogDesc.content;
    if (ogImg) seo.ogImage = ogImg.content;

    return seo;
  }

  async show404(path) {
    const pageData = await this.resolveByConvention("/404");
    if (pageData) {
      this.renderPage(pageData);
    } else {
      this.renderFallback404(path);
    }
  }

  renderFallback404(path) {
    document.title = "404";
    document.body.innerHTML = `
      <div style="text-align: center; padding: 50px;">
        <h1>❌ 404 - Page Not Found</h1>
        <p>Страница <strong>${path}</strong> не существует.</p>
        <a href="/" onclick="window.page('/'); return false;">На главную</a>
      </div>
    `;
  }
}

const router = new SPARouter();
router.init();
window.page = page;
