---
name: 91porn-download
description: 创建或重构一个基于 Node.js 的命令行视频下载工具，适用于解析视频页面、提取真实 mp4 直链、生成安全文件名并下载到本地。适合处理需要命令行参数、错误输出、下载保存、直链打印等场景。除非用户明确要求，否则不要实现为网页界面、浏览器按钮或 userscript。
---

# 91porn-download

将此 skill 用于创建命令行下载器，而不是网页界面或浏览器侧交互。

如果存在多种实现路径，默认选择以下目标：

- 接收视频页 URL 作为命令行参数
- 获取页面 HTML
- 提取真实 mp4 地址
- 生成安全文件名
- 下载到本地文件
- 在失败时输出清晰错误

## 核心解析流程

保持以下顺序：

1. 获取视频页面 HTML。
2. 提取 `strencode2("...")`。
3. 使用 `decodeURIComponent` 解码捕获到的字符串。
4. 从解码后的 `<source ...>` 片段中提取真实 `.mp4` 地址。
5. 提取页面标题，并移除 `Chinese homemade video` 后缀。
6. 将标题清洗为安全文件名。

## 实现要求

创建命令行下载器时，优先满足这些要求：

- 支持位置参数或 `--url`
- 支持输出目录或输出文件名
- 失败时输出明确错误信息
- 可以只打印直链，也可以直接下载文件
- 代码尽量保持单文件可运行，再按需拆分

默认先做最小可用版本，再按需增加这些能力：

- `--url`
- `--output`
- `--filename`
- `--print-only`

## 直接使用核心代码

如果用户要求“直接创建下载器”，优先基于下面这份代码生成 CLI 文件。

推荐文件名：

- `cli.js`
- `download.js`
- `bin/91-download.js`

```js
const fs = require('fs');
const path = require('path');

function extractEncodedString(html) {
    const regex = /strencode2\("([^"]+)"\)/;
    const match = html.match(regex);
    return match ? match[1] : null;
}

function extractTitle(html) {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (!match) return 'video';

    return match[1]
        .trim()
        .replace(/\s*Chinese\s+homemade\s+video\s*/i, ' ')
        .replace(/[\\/:*?"<>|]/g, '_')
        .trim() || 'video';
}

function decodeVideoSource(encodedStr) {
    try {
        return decodeURIComponent(encodedStr);
    } catch {
        return null;
    }
}

function extractMp4Url(sourceHtml) {
    const regex = /src=['"]([^'"]+\.mp4[^'"]*)['"]/;
    const match = sourceHtml.match(regex);
    return match ? match[1] : null;
}

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
            Cookie: 'language=cn_CN'
        }
    });

    return body;
}

async function downloadFile(url, outputPath) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': url
        }
    });

    if (!res.ok) {
        throw new Error(`下载失败: ${res.status}`);
    }

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    const fileStream = fs.createWriteStream(outputPath);

    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on('error', reject);
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
    });
}

async function main() {
    const inputUrl = process.argv[2];
    const outputDir = process.argv[3] || '.';

    if (!inputUrl) {
        console.error('用法: node cli.js <video-page-url> [output-dir]');
        process.exit(1);
    }

    const html = await fetchHtml(inputUrl);
    const title = extractTitle(html);
    const encoded = extractEncodedString(html);

    if (!encoded) {
        throw new Error('未找到加密视频字符串');
    }

    const sourceHtml = decodeVideoSource(encoded);
    if (!sourceHtml) {
        throw new Error('解码失败');
    }

    const videoUrl = extractMp4Url(sourceHtml);
    if (!videoUrl) {
        throw new Error('未找到视频 mp4 地址');
    }

    const outputPath = path.join(outputDir, `${title}.mp4`);

    console.log(`标题: ${title}`);
    console.log(`直链: ${videoUrl}`);
    console.log(`保存到: ${outputPath}`);

    await downloadFile(videoUrl, outputPath);
    console.log('下载完成');
}

main().catch((error) => {
    console.error(`失败: ${error.message}`);
    process.exit(1);
});
```

## 非目标实现

除非用户明确要求，否则不要实现成以下形式：

- 网页表单
- 页面按钮
- 浏览器扩展
- userscript
- 依赖人工点击网页元素的流程

## 验证方式

完成后优先验证：

- 命令行参数是否能正确读取
- 是否能成功提取真实 mp4 地址
- 下载是否能写入本地文件
- 缺少参数、解析失败、下载失败时是否有明确报错

如果没有真实页面样本，就至少验证参数处理、错误输出和主流程结构是否正确。
