# 91porn-download

> 一个基于 Node.js、Hono 和 `got-scraping` 的本地视频地址解析工具，包含网页界面和 Tampermonkey 用户脚本。仅用于技术研究与学习，请勿用于任何违法用途。

## 项目简介

这个项目提供两种使用方式：

- 本地启动一个 Web 服务，在页面里输入视频页链接，解析真实的 MP4 地址；
- 安装 Tampermonkey 用户脚本，在目标页面内直接注入下载按钮并本地解析。

当前项目的核心思路是：

1. 获取目标页面 HTML；
2. 提取页面中的 `strencode2("...")` 加密字符串；
3. 使用 `decodeURIComponent` 解码出真实的 `<source ...>` 片段；
4. 从中提取 `.mp4` 播放地址；
5. 读取页面标题，并去掉 `Chinese homemade video` 后缀，生成更干净的文件名。

## 功能特性

- 使用 `got-scraping` 模拟真实浏览器请求，尽量提升解析成功率；
- 提供本地网页界面，支持输入链接、解析地址、复制地址、下载视频；
- 提供 `/api/proxyDownload` 代理下载接口，减少浏览器直接跨域请求失败的问题；
- 提供 Tampermonkey 用户脚本，可在页面内一键下载；
- 自动清理标题中的固定后缀，并生成相对友好的文件名。

## 环境要求

- Node.js 18 或更高版本
- 可访问目标站点的网络环境
- 如果要使用 userscript，需要安装 Tampermonkey 或兼容扩展

## 安装依赖

```bash
npm install
```

## 本地运行

启动服务：

```bash
npm start
```

开发模式：

```bash
npm run dev
```

默认启动地址：

```text
http://localhost:3000
```

## 网页界面使用方式

1. 启动服务后，打开 `http://localhost:3000`。
2. 在输入框中粘贴视频播放页链接，例如：

```text
https://www.91porn.com/view_video.php?viewkey=xxxx
```

3. 点击“获取视频地址”。
4. 成功后可以看到：
   页面标题
   真实 MP4 地址
5. 点击“复制地址”可复制直链，点击“下载视频”可通过后端代理发起下载。

## Userscript 使用方式

用户脚本文件位于：

```text
userscript/91_download_script.user.js
```

使用步骤：

1. 在浏览器中安装 Tampermonkey。
2. 导入 `userscript/91_download_script.user.js`。
3. 打开匹配的视频页面。
4. 页面加载后会自动插入“下载视频”按钮。
5. 点击按钮后，脚本会在当前页面内解析真实地址，并调用 `GM_download` 下载。
6. 如果浏览器或站点限制导致下载失败，脚本会退化为复制直链，方便用其他工具下载。

## API 说明

### `POST /api/getVideoUrl`

请求体：

```json
{
  "url": "https://www.91porn.com/view_video.php?viewkey=xxxx"
}
```

成功响应示例：

```json
{
  "success": true,
  "videoUrl": "https://example.com/video.mp4",
  "pageTitle": "示例标题"
}
```

失败响应示例：

```json
{
  "error": "未找到加密视频字符串"
}
```

### `GET /api/proxyDownload`

查询参数：

- `url`：真实视频地址
- `filename`：可选，自定义下载文件名

用途：

- 通过服务端代理真实视频资源；
- 尽量避免浏览器直接请求媒体地址时出现跨域或防盗链导致的下载失败。

## Docker 运行

构建镜像：

```bash
docker build -t 91porn-download .
```

启动容器：

```bash
docker run --rm -p 3000:3000 91porn-download
```

启动后访问：

```text
http://localhost:3000
```

## 主要文件说明

- `index.js`：后端服务与解析逻辑
- `index.html`：本地网页界面
- `userscript/91_download_script.user.js`：Tampermonkey 用户脚本
- `Dockerfile`：Docker 镜像构建配置
- `SKILL.md`：面向 Codex/Agent 的仓库工作说明

## 注意事项

- 本项目仅用于技术研究与学习，不提供任何在线服务；
- 使用前请自行确认符合当地法律法规及目标站点使用条款；
- 如果目标站点页面结构变化，可能需要同步修改 `index.js` 和 `userscript/91_download_script.user.js` 中的解析规则；
- 如果只是调试解析逻辑，建议优先从 `extractEncodedString`、`extractTitle`、`decodeVideoSource`、`extractMp4Url` 这几个函数开始排查。
