// ==UserScript==
// @name         91Porn 视频一键下载 (本地解析版)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  在 91Porn 视频页面添加一键下载按钮，本地解析真实地址并下载为中文文件名，无需服务器
// @author       You
// @match        *://*.91porn.com/view_video.php*
// @match        *://*.91porn.com/index.php*
// @icon         https://www.91porn.com/favicon.ico
// @grant        GM_download
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    // 样式注入
    const style = document.createElement('style');
    style.innerHTML = `
        .download-btn-91 {
            display: inline-block;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            text-decoration: none;
            font-weight: bold;
            margin-left: 10px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            font-size: 14px;
            border: none;
            transition: all 0.3s ease;
            vertical-align: middle;
        }
        .download-btn-91:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            color: white;
        }
        .download-btn-91:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
    `;
    document.head.appendChild(style);

    // 初始化
    function init() {
        // 优先查找 #videodetails，其次找 .login_register_header
        const container = document.querySelector('#videodetails') || document.querySelector('.login_register_header');
        
        if (!container) return;

        const btn = document.createElement('button');
        btn.className = 'download-btn-91';
        btn.innerHTML = '⬇️ 下载视频';
        btn.title = '本地解析并下载';
        // 增加一点顶部间距，以免贴太紧
        btn.style.marginTop = '15px';
        btn.style.marginBottom = '15px';
        
        container.appendChild(btn);

        btn.onclick = function(e) {
            e.preventDefault();
            handleDownload(btn);
        };
    }

    // 核心逻辑：本地解析
    function handleDownload(btn) {
        try {
            btn.disabled = true;
            btn.innerHTML = '🔍 解析中...';

            const html = document.body.innerHTML;

            // 1. 提取加密字符串
            // 对应 nodejs 里的: /strencode2\("([^"]+)"\)/
            const regexEncode = /strencode2\("([^"]+)"\)/;
            const matchEncode = html.match(regexEncode);
            
            if (!matchEncode) {
                throw new Error("未找到加密视频地址，可能是需要登录或视频已失效");
            }

            const encoded = matchEncode[1];

            // 2. 解码
            // 对应 nodejs 里的: decodeURIComponent
            const sourceHtml = decodeURIComponent(encoded);

            // 3. 提取 mp4
            // 对应 nodejs 里的: /src=['"]([^'"]+\.mp4[^'"]*)['"]/
            const regexMp4 = /src=['"]([^'"]+\.mp4[^'"]*)['"]/;
            const matchMp4 = sourceHtml.match(regexMp4);

            if (!matchMp4) {
                throw new Error("解码成功但未找到 MP4 地址");
            }

            const realUrl = matchMp4[1];
            
            // 4. 获取标题
            let title = document.title.replace(/\s*Chinese\s+homemade\s+video\s*/i, '').trim();
            // 清理非法字符
            title = title.replace(/[\\/:*?"<>|]/g, '_').trim();
            if (!title.endsWith('.mp4')) title += '.mp4';

            console.log('解析成功:', title, realUrl);

            // 5. 触发下载
            btn.innerHTML = '🚀 开始下载...';
            
            GM_download({
                url: realUrl,
                name: title,
                saveAs: true,
                onload: () => {
                    btn.innerHTML = '✅ 下载完成';
                    btn.disabled = false;
                    setTimeout(() => btn.innerHTML = '⬇️ 再次下载', 3000);
                },
                onerror: (err) => {
                    console.error(err);
                    btn.innerHTML = '❌ 下载失败 (点击复制链接)';
                    btn.disabled = false;
                    btn.onclick = () => {
                        GM_setClipboard(realUrl);
                        alert('直链已复制到剪贴板！\n请使用迅雷等工具下载。\n\n' + realUrl);
                    };
                }
            });

        } catch (err) {
            console.error(err);
            btn.innerHTML = '❌ 解析失败';
            btn.disabled = false;
            alert('解析失败：' + err.message);
        }
    }

    window.addEventListener('load', init);
})();
