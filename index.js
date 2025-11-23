const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const fs = require('fs');
const path = require('path');

const app = new Hono();
// 静态资源托管当前目录，方便访问前端测试页面
app.get('/', (c) => {
    const filePath = path.join(__dirname, 'index.html');
    const html = fs.readFileSync(filePath, 'utf-8');
    return c.html(html);
});

/**
 * 从 HTML 中提取 strencode2("%xx%xx...") 的内容
 */
function extractEncodedString(html) {
    const regex = /strencode2\("([^"]+)"\)/;
    const match = html.match(regex);
    return match ? match[1] : null;
}

/**
 * 从 HTML 中提取 <title> 文本
 */
function extractTitle(html) {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (!match) return null;

    let title = match[1].trim();
    // 去掉站点统一附加的 "Chinese homemade video" 文案
    title = title.replace(/\s*Chinese\s+homemade\s+video\s*/i, ' ').trim();
    return title;
}

/**
 * 解码出真正的视频 <source> 标签
 */
function decodeVideoSource(encodedStr) {
    try {
        return decodeURIComponent(encodedStr);
    } catch (error) {
        return null;
    }
}

/**
 * 从 <source src='xxx.mp4'> 中提取真实地址
 */
function extractMp4Url(sourceHtml) {
    const regex = /src=['"]([^'"]+\.mp4[^'"]*)['"]/;
    const match = sourceHtml.match(regex);
    return match ? match[1] : null;
}

/**
 * 使用 got-scraping 获取页面 HTML（模拟真实浏览器 TLS 指纹）
 */
async function fetchHtml(url) {
    const { gotScraping } = await import('got-scraping');
    const { body } = await gotScraping({
        url,
        headerGeneratorOptions: {
            browsers: [{ name: 'chrome', minVersion: 110 }],
            devices: ['desktop'],
            locales: ['zh-CN', 'en-US']
        },
        headers: {
            'Cookie': 'language=cn_CN'
        }
    });
    return body;
}

/**
 * API：输入 91porn 链接 → 输出真实 mp4
 */
// 旧的 puppeteer 版已移除，统一使用 got-scraping 轻量版

/**
 * API：输入 91porn 链接 → 输出真实 mp4
 */
app.post('/api/getVideoUrl', async (c) => {
    const body = await c.req.json();
    const { url } = body;

    if (!url) {
        return c.json({ error: "缺少参数 url" }, 400);
    }

    try {
        // 使用 got-scraping 获取页面 HTML
        const html = await fetchHtml(url);

        // 提取页面标题（如果有）
        const pageTitle = extractTitle(html);

        // 1. 提取 strencode2("xxxx")
        const encoded = extractEncodedString(html);
        if (!encoded) {
            return c.json({ error: "未找到加密视频字符串" });
        }

        // 2. 解码成 <source> 标签
        const sourceHtml = decodeVideoSource(encoded);
        if (!sourceHtml) {
            return c.json({ error: "解码失败" });
        }

        // 3. 提取 MP4 地址
        const realUrl = extractMp4Url(sourceHtml);
        if (!realUrl) {
            return c.json({ error: "未找到视频 mp4 地址" });
        }

        return c.json({
            success: true,
            videoUrl: realUrl,
            pageTitle
        });

    } catch (error) {
        console.error('抓取失败：', error.message);
        return c.json({ error: "请求失败", details: error.message });
    }
});

// 通过服务器代理真实视频地址，避免浏览器直接请求时跨域 / 防盗链导致的 Failed to fetch
app.get('/api/proxyDownload', async (c) => {
    const targetUrl = c.req.query('url');
    const filename = c.req.query('filename') || 'video.mp4';

    if (!targetUrl) {
        return c.text('缺少参数 url', 400);
    }

    try {
        const upstreamRes = await fetch(targetUrl, {
            headers: {
                // 尽量伪装成正常浏览器访问
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
                'Accept': '*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Connection': 'keep-alive',
                'Referer': targetUrl
            }
        });

        if (!upstreamRes.ok) {
            return c.text('上游请求失败: ' + upstreamRes.status, upstreamRes.status);
        }

        const headers = new Headers(upstreamRes.headers);
        headers.set('Content-Type', upstreamRes.headers.get('content-type') || 'application/octet-stream');
        headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

        return new Response(upstreamRes.body, {
            status: upstreamRes.status,
            headers
        });
    } catch (err) {
        console.error('proxyDownload error:', err.message);
        return c.text('下载失败: ' + err.message, 500);
    }
});

// 启动服务
const PORT = Number(process.env.PORT) || 3000;
serve({
    fetch: app.fetch,
    port: PORT,
    hostname: '0.0.0.0',
    onListen: () => {
        console.log(`接口已启动：http://localhost:${PORT}`);
    }
});
