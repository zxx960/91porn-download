# 91porn-download

> 通过 Puppeteer 解析 91 视频真实 mp4 地址的 Node.js 小工具，仅用于技术研究与学习，请勿用于任何违法用途。

## 功能简介

- 提供一个简单的 Web 页面：输入 91 视频页面链接，一键解析真实视频地址；
- 后端使用 **Puppeteer** 启动无头浏览器，模拟真实访问；
- 从页面 HTML 中提取 `strencode2("...")` 加密字符串，解码后再从 `<source src="xxx.mp4">` 中提取真实 mp4 地址；
- 额外解析页面 `<title>` 文本，并去掉统一的 `Chinese homemade video` 后缀，返回更干净的标题；
- 前端支持一键复制视频地址、基础的状态提示与错误提示。

## 环境要求

- Node.js 16+（建议）
- 可以访问目标站点的网络环境

## 安装依赖

```bash
npm install
```

## 启动服务

```bash
node index.js
```

启动后默认监听：

- 前端页面：`http://localhost:3000/index.html`
- API 接口：`POST http://localhost:3000/api/getVideoUrlByPuppeteer`

## 前端使用说明

1. 打开浏览器访问 `http://localhost:3000/index.html`；
2. 在输入框中粘贴 91 视频播放页面链接，例如：
   `https://www.91porn.com/view_video.php?viewkey=xxxx`；
3. 点击「获取视频地址」按钮；
4. 解析成功后会显示：
   - 页面标题（已去掉 `Chinese homemade video` 字样）；
   - 真实 mp4 视频地址；
5. 点击「复制地址」即可将 mp4 链接复制到剪贴板。

## 接口说明

### 请求

- Method：`POST`
- URL：`/api/getVideoUrlByPuppeteer`
- Content-Type：`application/json`
- Body：

```json
{
  "url": "https://www.91porn.com/view_video.php?viewkey=xxxx"
}
```

### 响应示例（成功）

```json
{
  "success": true,
  "videoUrl": "https://.../xxx.mp4",
  "pageTitle": "踩头后入极品人妻母狗"
}
```

### 响应示例（失败）

```json
{
  "error": "未找到视频 mp4 地址"
}
```

或：

```json
{
  "error": "请求失败",
  "details": "Puppeteer 报错信息..."
}
```

## 注意事项

- 本项目仅用于技术研究与学习，不提供任何视频下载服务；
- 使用前请确保遵守所在地区的法律法规及目标网站的使用条款；
- 如需对解析逻辑、UA、等待策略等进行调整，可修改 `index.js` 中的相关代码。
