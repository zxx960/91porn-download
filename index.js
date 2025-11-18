const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());
// 静态资源托管当前目录，方便访问前端测试页面
app.use(express.static(__dirname));

/**
 * 从 HTML 中提取 strencode2("%xx%xx...") 的内容
 */
function extractEncodedString(html) {
    const regex = /strencode2\("([^"]+)"\)/;
    const match = html.match(regex);
    return match ? match[1] : null;
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
 * 使用 Puppeteer 打开页面并返回完整 HTML
 */
async function fetchHtmlWithPuppeteer(url) {
    const browser = await puppeteer.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        });

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60 * 1000
        });

        const html = await page.content();
        return html;
    } finally {
        await browser.close();
    }
}

/**
 * API：输入 91porn 链接 → 输出真实 mp4
 */
// 旧的 axios 版接口已移除，统一使用 Puppeteer 版本

/**
 * 基于 Puppeteer 的 API：输入 91porn 链接 → 输出真实 mp4
 */
app.post('/api/getVideoUrlByPuppeteer', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: "缺少参数 url" });
    }

    try {
        // 使用真实浏览器获取页面 HTML
        const html = await fetchHtmlWithPuppeteer(url);

        // 1. 提取 strencode2("xxxx")
        const encoded = extractEncodedString(html);
        if (!encoded) {
            return res.json({ error: "未找到加密视频字符串" });
        }

        // 2. 解码成 <source> 标签
        const sourceHtml = decodeVideoSource(encoded);
        if (!sourceHtml) {
            return res.json({ error: "解码失败" });
        }

        // 3. 提取 MP4 地址
        const realUrl = extractMp4Url(sourceHtml);
        if (!realUrl) {
            return res.json({ error: "未找到视频 mp4 地址" });
        }

        return res.json({
            success: true,
            videoUrl: realUrl
        });

    } catch (error) {
        console.error('Puppeteer 抓取失败：', error.message);
        return res.json({ error: "请求失败", details: error.message });
    }
});

// 启动服务
app.listen(3000, () => {
    console.log("接口已启动：http://localhost:3000");
});
