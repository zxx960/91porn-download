---
name: 91porn-download
description: 创建或重构一个基于 Node.js 的命令行视频下载工具，适用于获取 91porn 视频页面、提取经过 `strencode2(...)` 包裹的真实 mp4 地址、生成安全文件名并下载到本地。适合处理命令行参数、页面解析、标题清洗、下载保存、直链打印与错误输出等场景。除非用户明确要求，否则不要实现为网页界面、浏览器按钮、扩展或 userscript。
---

# 91porn-download

将此 skill 用于创建或修改命令行下载器。默认目标是生成一个可直接运行的 Node.js 脚本，而不是网页端交互工具。

如果用户没有指定别的实现方式，优先做成下面这种最小可用 CLI：

- 接收视频页 URL 作为第一个位置参数
- 接收输出目录作为第二个位置参数，可选
- 获取页面 HTML
- 提取并解码 `strencode2(...)` 中的内容
- 从解码结果中找出真实 `.mp4` 地址
- 提取标题并清洗成安全文件名
- 下载视频到本地
- 失败时输出清晰错误信息

## 核心流程

保持以下顺序：

1. 请求视频页面 HTML。
2. 从页面中提取 `strencode2(...)` 的编码字符串。
3. 使用 `decodeURIComponent` 解码。
4. 从解码后的 HTML 片段中提取真实 `.mp4` 地址。
5. 优先从页面标题区域提取可读标题。
6. 清洗标题并生成输出文件名。
7. 使用页面 URL 作为 `Referer` 下载视频。

## 解析要求

实现时优先贴近下面这些规则：

- `extractEncodedString` 同时支持 `strencode2("...")` 和 `strencode2('...')`
- 标题优先从 `<h4>`、其次 `<h1>`、最后 `<title>` 提取
- 标题清洗需要处理 HTML 实体、标签、连续空白和非法文件名字符
- 需要移除 `Chinese homemade video` 这类站点噪音文本
- `extractMp4Url` 至少支持：
  - 从 `<source src="...mp4">` 提取
  - 直接从解码片段中抓取 `https://...mp4` URL
- 输出文件扩展名优先从 mp4 URL 路径中推断，默认回退到 `.mp4`

## 网络请求要求

请求页面和下载视频时，默认遵守这些约定：

- 使用 Node.js 原生 `fetch`
- 带常见桌面浏览器 `User-Agent`
- 页面请求附带：
  - `Cookie: language=cn_CN`
  - `Referer: https://91porn.com/`
- 视频下载请求附带：
  - `Referer: <video page url>`
- `redirect: "follow"`
- 页面请求失败时报 `页面请求失败: HTTP xxx`
- 视频请求失败时报 `视频下载失败: HTTP xxx`

## 文件与下载要求

默认实现建议：

- 使用 `fs` 和 `path`
- 下载前自动创建输出目录
- 将 Web Stream 转为 Node Stream 后写入文件
- 输出以下信息，便于用户确认：
  - 标题
  - MP4 直链
  - 保存路径

如果用户没有额外要求，默认使用这种参数形式：

```bash
node download-91porn.js <video_page_url> [output_dir]
```

## 参考实现

如果用户要求“直接创建脚本”或“按默认方式实现”，优先基于下面这份结构生成代码：

```js
const fs = require("fs");
const path = require("path");

function extractEncodedString(html) {
  const patterns = [
    /strencode2\("([^"]+)"\)/,
    /strencode2\('([^']+)'\)/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function sanitizeTitle(value) {
  return (value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s*Chinese\s+homemade\s+video\s*/gi, " ")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html) {
  const preferredPatterns = [
    /<h4[^>]*>([\s\S]*?)<\/h4>/i,
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ];

  for (const pattern of preferredPatterns) {
    const match = html.match(pattern);
    const title = sanitizeTitle(match && match[1]);
    if (title && !/^Chinese homemade video$/i.test(title) && !/^video$/i.test(title)) {
      return title;
    }
  }

  return "video";
}

function extractMp4Url(decodedHtml) {
  const patterns = [
    /src=['"]([^'"]+\.mp4[^'"]*)['"]/i,
    /(https?:\/\/[^"'<> ]+\.mp4(?:\?[^"'<> ]*)?)/i,
  ];

  for (const pattern of patterns) {
    const match = decodedHtml.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function resolveOutputPath(outputDir, title, mp4Url) {
  const urlObject = new URL(mp4Url);
  const ext = path.extname(urlObject.pathname) || ".mp4";
  const fileName = `${title}${ext}`;
  return path.join(outputDir, fileName);
}

async function fetchText(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      ...headers,
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`页面请求失败: HTTP ${res.status}`);
  }

  return await res.text();
}

async function downloadFile(mp4Url, outputPath, referer) {
  const res = await fetch(mp4Url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
      "Accept": "*/*",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Referer": referer,
    },
    redirect: "follow",
  });

  if (!res.ok || !res.body) {
    throw new Error(`视频下载失败: HTTP ${res.status}`);
  }

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  const fileStream = fs.createWriteStream(outputPath);

  await new Promise((resolve, reject) => {
    const stream = require("stream");
    stream.Readable.fromWeb(res.body).pipe(fileStream);
    fileStream.on("finish", resolve);
    fileStream.on("error", reject);
  });
}

async function main() {
  const videoPageUrl = process.argv[2];
  const outputDir = process.argv[3] || process.cwd();

  if (!videoPageUrl) {
    throw new Error("用法: node download-91porn.js <video_page_url> [output_dir]");
  }

  const html = await fetchText(videoPageUrl, {
    "Cookie": "language=cn_CN",
    "Referer": "https://91porn.com/",
  });

  const title = extractTitle(html);
  const encoded = extractEncodedString(html);
  if (!encoded) {
    throw new Error("未找到页面中的编码视频数据");
  }

  let decodedHtml;
  try {
    decodedHtml = decodeURIComponent(encoded);
  } catch {
    throw new Error("页面中的视频数据解码失败");
  }

  const mp4Url = extractMp4Url(decodedHtml);
  if (!mp4Url) {
    throw new Error("未找到真实 MP4 地址");
  }

  const outputPath = resolveOutputPath(outputDir, title, mp4Url);

  console.log(`标题: ${title}`);
  console.log(`MP4: ${mp4Url}`);
  console.log(`保存到: ${outputPath}`);

  await downloadFile(mp4Url, outputPath, videoPageUrl);
  console.log("下载完成");
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
```

## 可选增强

只有在用户明确提出时，再增加这些能力：

- `--url`
- `--output`
- `--filename`
- `--print-only`
- 更完整的 HTML 实体解码
- 下载进度显示
- 重试逻辑
- 批量 URL 下载

默认不要因为“功能更全”就主动把脚本改成复杂 CLI 框架。

## 非目标实现

除非用户明确要求，否则不要实现成以下形式：

- 网页表单
- 页面按钮
- 浏览器扩展
- userscript
- 依赖人工点击页面元素的流程

## 验证方式

完成后优先验证：

- 位置参数是否能正确读取
- 页面请求头是否包含必要的 `Cookie` 与 `Referer`
- 是否能提取并解码 `strencode2(...)`
- 是否能成功提取真实 mp4 地址
- 是否能根据标题和 URL 扩展名生成输出路径
- 下载是否能写入本地文件
- 参数缺失、解析失败、下载失败时是否有明确报错

如果没有真实页面样本，至少验证参数处理、错误路径和主流程结构。
