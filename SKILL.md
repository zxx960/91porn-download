---
name: 91porn-download
description: 维护和扩展 91porn-download 项目，一个基于 Node.js、Hono 的本地视频地址解析工具，包含浏览器页面和 Tampermonkey 用户脚本。适用于在此仓库中处理解析逻辑、API 行为、代理下载流程、本地 Web UI，以及 `userscript/91_download_script.user.js` 中的 userscript 改动。
---

# 91porn-download

将这个仓库视为一个包含两个界面的轻量项目：

- 维护 `index.js` 中的本地 Node.js 服务。
- 维护 `userscript/91_download_script.user.js` 中的浏览器用户脚本。

当两边共享同一套解析逻辑时，优先保持改动同步、最小化。

## 项目结构

- `index.js`：Hono 服务、HTML 页面托管、提取辅助函数、`/api/getVideoUrl` 和 `/api/proxyDownload`。
- `index.html`：本地浏览器界面，用于输入页面链接并下载解析出的媒体地址。
- `userscript/91_download_script.user.js`：Tampermonkey 脚本，在页面本地解析并通过 `GM_download` 下载。
- `README.md`：面向使用者的说明和当前功能摘要。

## 核心解析流程

除非目标站点结构变化，否则保持以下顺序：

1. 获取视频页面 HTML。
2. 提取 `strencode2("...")`。
3. 使用 `decodeURIComponent` 解码捕获到的字符串。
4. 从解码后的 `<source ...>` 片段中提取真实 `.mp4` 地址。
5. 提取页面标题，并移除 `Chinese homemade video` 后缀。

如果解析规则变化，默认同时更新 Node 服务和 userscript，除非用户明确要求两者分离。

## 常见任务

### 更新提取逻辑

优先修改 `index.js` 中的这些辅助函数：

- `extractEncodedString`
- `extractTitle`
- `decodeVideoSource`
- `extractMp4Url`

随后把等价的正则或解码逻辑同步到 `userscript/91_download_script.user.js`。

### 修改 API 行为

除非用户明确要求 breaking change，否则保持这些接口约定稳定：

- `POST /api/getVideoUrl`
  - 请求体：`{ "url": "<video-page-url>" }`
  - 成功响应包含 `success`、`videoUrl`、`pageTitle`
- `GET /api/proxyDownload`
  - 查询参数：`url`，可选 `filename`
  - 以附件下载头透传上游流

如果变更了响应字段，需要在同一轮同步更新 `index.html` 和 `README.md`。

### 调整反爬或抓取行为

服务端目前使用 `got-scraping`，并附带浏览器风格请求头和固定 cookie。优先做小范围的 header、cookie、TLS 指纹调整，不要在没有明确要求时做大规模架构重写。

### 修改 userscript 交互

保持以下当前行为：

- 向页面注入一个下载按钮
- 在页面本地解析 HTML
- 基于 `document.title` 生成安全文件名
- 当 `GM_download` 失败时，退化为复制直链

除非用户明确要求，不要为 userscript 引入外部服务依赖。

## 验证方式

根据改动范围使用最小必要验证：

- 运行 `npm start`，确认 Hono 服务可以正常启动。
- 打开 `http://localhost:3000`，检查本地页面是否可访问。
- 如果只是解析逻辑重构，确认 `index.js` 与 `userscript/91_download_script.user.js` 的正则和解码路径仍然一致。

如果验证需要真实页面样本，而用户没有提供可测试链接，要明确说明限制，不要臆测结果。

## 编辑准则

- 优先做定点修改，不做无必要的大重写。
- 仅在解析或代理逻辑不直观时添加少量注释。
- 保留现有中文用户提示，除非任务明确要求改语言。
- 只要改动影响使用流程或可见行为，就同步更新 `README.md`。

## 范围约束

将此仓库视为技术研究和本地提取工具项目。除非用户明确要求，不要把它扩展成账号自动化、凭据处理或大规模抓取基础设施。
