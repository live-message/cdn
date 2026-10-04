export const dom = {
  create(tag, attrs = {}, content = "") {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
    if (content) el.innerHTML = content;
    return el;
  },

  exists(selector) {
    return document.querySelector(selector) !== null;
  },
};

const textCache = new Map();

export async function fetchTextCached(url) {
  if (textCache.has(url)) return textCache.get(url);

  const res = await fetch(url);

  if (!res.ok) throw new Error(`Не удалось загрузить: ${url}`);
  if (res.redirected) throw new Error(`Redirected to fallback: ${url}`);

  const text = await res.text();
  const isServerFallback =
    text.includes('id="app"') ||
    text.includes("id='app'");

  if (isServerFallback) {
    throw new Error(`Server fallback detected (not a real page): ${url}`);
  }

  textCache.set(url, text);
  return text;
}
