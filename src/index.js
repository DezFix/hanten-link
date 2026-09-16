/* Hanten share-link worker (test).
 *  /m?s=SOURCE&u=/rel/url&p=https://source/...  ->  OG page for messenger bots,
 *  full landing with cover for humans. Metadata is fetched server-side,
 *  so no CORS issues. Static Pages site stays as fallback.
 */

const MIRRORS = {
	// test set; extend with primary mirrors per source as needed
	COMX: "https://com-x.life",
};

const BOT_RE =
	/telegrambot|whatsapp|vkshare|viber|discordbot|twitterbot|facebookexternalhit|skypeuripreview|line\/|slackbot|linkedinbot|ok\.ru|mail\.ru/i;

const FETCH_UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const ICON = "https://dezfix.github.io/icon.png";
const DOWNLOAD = "https://github.com/DezFix/Hanten/releases/latest";

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (url.pathname === "/" || url.pathname === "") {
			return Response.redirect("https://dezfix.github.io/", 302);
		}
		if (url.pathname !== "/m") {
			return new Response("Not found", { status: 404 });
		}
		const q = url.searchParams;
		const source = q.get("s") || q.get("source") || "";
		const rel = q.get("u") || q.get("url") || "";
		const pub = q.get("p") || q.get("publicUrl") || "";
		const fallbackName = q.get("n") || q.get("name") || "";

		const target = pub || (MIRRORS[source] && rel ? MIRRORS[source] + rel : null);
		const meta = target ? await getMeta(request, target, fallbackName) : { title: fallbackName, cover: null, desc: null };

		const ua = request.headers.get("User-Agent") || "";
		if (BOT_RE.test(ua)) {
			return botPage(url, meta);
		}
		return humanPage(meta, { source, rel, pub });
	},
};

async function getMeta(request, target, fallbackName) {
	const empty = { title: fallbackName, cover: null, desc: null };
	try {
		const cache = caches.default;
		const key = new Request("https://meta.local/?u=" + encodeURIComponent(target));
		const hit = await cache.match(key);
		if (hit) return await hit.json();
		const res = await fetch(target, {
			headers: { "User-Agent": FETCH_UA, Accept: "text/html" },
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) return empty;
		const html = await res.text();
		const meta = {
			title: og(html, "og:title") || tagTitle(html) || fallbackName,
			cover: absUrl(og(html, "og:image"), target),
			desc: og(html, "og:description") || metaName(html, "description") || null,
		};
		await cache.put(
			key,
			new Response(JSON.stringify(meta), {
				headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=600" },
			}),
		);
		return meta;
	} catch (e) {
		return empty;
	}
}

function og(html, prop) {
	let m = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]*content=["']([^"']+)`, "i"));
	if (m) return decodeEntities(m[1]);
	m = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*property=["']${prop}["']`, "i"));
	return m ? decodeEntities(m[1]) : null;
}

function metaName(html, name) {
	let m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']+)`, "i"));
	if (m) return decodeEntities(m[1]);
	m = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*name=["']${name}["']`, "i"));
	return m ? decodeEntities(m[1]) : null;
}

function tagTitle(html) {
	const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	return m ? decodeEntities(m[1].trim()) : null;
}

function absUrl(href, base) {
	if (!href) return null;
	try {
		return new URL(href, base).toString();
	} catch (e) {
		return null;
	}
}

function decodeEntities(s) {
	return s
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#039;|&#39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">");
}

function esc(s) {
	return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function appLink(source, rel) {
	return (
		"hanten://manga/manga?s=" +
		encodeURIComponent(source) +
		"&u=" +
		encodeURIComponent(rel)
	);
}

function botPage(pageUrl, meta) {
	const title = meta.title || "Манга в Hanten";
	const html = `<!DOCTYPE html><html><head><meta charset="utf-8">` +
		`<meta property="og:type" content="website">` +
		`<meta property="og:site_name" content="Hanten">` +
		`<meta property="og:title" content="${esc(title)}">` +
		(meta.desc ? `<meta property="og:description" content="${esc(meta.desc.slice(0, 300))}">` : "") +
		(meta.cover ? `<meta property="og:image" content="${esc(meta.cover)}">` : `<meta property="og:image" content="${ICON}">`) +
		`<meta name="twitter:card" content="summary_large_image">` +
		`<meta property="og:url" content="${esc(pageUrl.toString())}">` +
		`</head><body><a href="${esc(pageUrl.toString())}">${esc(title)}</a></body></html>`;
	return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function humanPage(meta, ref) {
	const title = meta.title || "Открыть мангу в Hanten";
	const app = appLink(ref.source, ref.rel);
	const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">` +
		`<meta name="viewport" content="width=device-width, initial-scale=1">` +
		`<title>${esc(title)} — Hanten</title><link rel="icon" type="image/png" href="${ICON}">` +
		`<style>:root{color-scheme:dark;--bg:#141824;--card:#20263c;--accent:#e0685c;--text:#f0ebf5;--muted:#a7aec7}` +
		`*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text)}` +
		`body::before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(600px 400px at 50% -5%,rgba(224,104,92,.16),transparent 60%)}` +
		`.wrap{max-width:560px;margin:0 auto;padding:48px 20px;text-align:center;position:relative;animation:rise .5s ease both}` +
		`@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}` +
		`.cover{max-width:220px;border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.5)}` +
		`.icon{width:84px;height:84px;border-radius:22px;box-shadow:0 12px 34px rgba(224,104,92,.35)}` +
		`h1{font-size:22px;margin:18px 0 6px}.sub{color:var(--muted);font-size:14px;margin:0 0 14px}` +
		`.desc{color:var(--muted);font-size:14px;line-height:1.6;margin:0 0 22px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}` +
		`.btn{display:block;padding:15px;border-radius:14px;text-decoration:none;font-weight:700;margin:10px 0;transition:transform .18s ease}` +
		`.btn:hover{transform:translateY(-2px)}.primary{background:var(--accent);color:#221016}` +
		`.secondary{background:var(--card);color:var(--text);border:1px solid #2c3452;font-weight:400}` +
		`.note{color:var(--muted);font-size:13px;margin-top:24px}.note a{color:var(--accent)}</style></head><body>` +
		`<div class="wrap">` +
		(meta.cover
			? `<img class="cover" src="${esc(meta.cover)}" alt="">`
			: `<img class="icon" src="${ICON}" alt="Hanten">`) +
		`<h1>${esc(title)}</h1>` +
		(ref.source ? `<p class="sub">Источник: ${esc(ref.source)}</p>` : "") +
		(meta.desc ? `<p class="desc">${esc(meta.desc.slice(0, 400))}</p>` : "") +
		`<a class="btn primary" href="${esc(app)}">Открыть в приложении</a>` +
		(ref.pub ? `<a class="btn secondary" href="${esc(ref.pub)}">Читать на сайте источника</a>` : "") +
		`<a class="btn secondary" href="${DOWNLOAD}">Скачать Hanten</a>` +
		`<p class="note">Нет приложения? Поставьте APK с <a href="${DOWNLOAD}">GitHub</a> — ссылка откроется автоматически.</p>` +
		`</div><script>(function(){if(/Android/i.test(navigator.userAgent)){` +
		`var f=document.createElement("iframe");f.style.display="none";f.src=${JSON.stringify(app)};` +
		`document.body.appendChild(f);setTimeout(function(){f.remove()},2000);}})();<\/script></body></html>`;
	return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
