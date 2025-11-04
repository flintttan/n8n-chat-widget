/**
 * N8N Chat Widget - 可嵌入式AI聊天组件
 * 使用方法:
 * 1. 在HTML中引入必要的依赖:
 *    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
 *    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
 * 2. 引入本组件:
 *    <script src="n8n-chat-widget.js"></script>
 * 3. 初始化:
 *    <script>
 *      N8NChatWidget.init({
 *        webhookUrl: 'http://your-n8n-webhook-url',
 *        title: '在线客服',
 *        description: '有任何问题都可以问我',
 *        // ...其他配置
 *      });
 *    </script>
 */

(function(window) {
    'use strict';

    // 默认配置
    const DEFAULT_CONFIG = {
        // 必填项
        webhookUrl: '',

        // 显示文案
        title: 'AI助手',
        description: '智能问答',
        placeholder: '请输入您的问题...',
        emptyStateTitle: '开始对话',
        emptyStateDescription: '我可以帮助您解答问题',

        // 按钮文本
        sendButtonText: '发送',
        newChatButtonText: '新对话',

        // 颜色配置
        primaryColor: '#0A1F2A',
        primaryColorLight: '#1A3A44',
        accentColor: '#FF7557',
        backgroundColor: '#F8FAFA',
        surfaceColor: '#FFFFFF',
        highlightColor: '#FF1D5E',
        textColor: '#111827',
        textColorLight: '#374151',
        textColorMuted: '#6B7280',

        // 布局配置
        position: 'bottom-right', // 可选: bottom-right, bottom-left
        buttonSize: 56, // 浮动按钮大小(px) - 优化尺寸
        chatWidth: 420, // 聊天窗口宽度(px) - 更宽阔
        chatHeight: 600, // 聊天窗口高度(px) - 更高

        // 功能配置
        enableFileUpload: true, // 是否允许上传文件
        fileUploadTypes: 'image', // 文件上传类型: 'image', 'pdf', 'csv', 'all', 或自定义 MIME 类型如 'image/*,application/pdf'
        enableHistory: true, // 是否启用历史记录
        maxHistoryItems: 50,
        enableResize: true, // 是否启用窗口调整大小

        // 自定义请求头
        customHeaders: {}, // 自定义HTTP请求头，例如: { 'X-Custom-Token': 'abc123' }

        // 自定义图标
        buttonIcon: '💬',
        closeIcon: '✕',

        // z-index配置
        zIndex: 9999
    };

    let config = {};
    let isOpen = false;
    let currentSessionId = null;
    let chatHistory = [];
    let currentChatIndex = -1;
    let currentFiles = [];
    let isRequesting = false; // 防连击标志
    let currentAbortController = null; // 用于中断请求

    const STORAGE_KEY = 'n8n_chat_widget_history';

    // 生成随机会话ID
    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }

    // 创建样式
    function createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            :root {
                --n8n-chat-primary: ${config.primaryColor};
                --n8n-chat-primary-light: ${config.primaryColorLight};
                --n8n-chat-accent: ${config.accentColor};
                --n8n-chat-background: ${config.backgroundColor};
                --n8n-chat-surface: ${config.surfaceColor};
                --n8n-chat-highlight: ${config.highlightColor};
                --n8n-chat-text: ${config.textColor};
                --n8n-chat-text-light: ${config.textColorLight};
                --n8n-chat-text-muted: ${config.textColorMuted};
            }

            .n8n-chat-widget-container {
                position: fixed;
                ${config.position === 'bottom-left' ? 'left' : 'right'}: 20px;
                bottom: 20px;
                z-index: ${config.zIndex};
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }

            .n8n-chat-widget-button {
                width: ${config.buttonSize}px;
                height: ${config.buttonSize}px;
                border-radius: 50%;
                background: var(--n8n-chat-highlight);
                color: white;
                border: none;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                /*
                 * 当弹窗打开时，浮动按钮会与窗口发生层叠；
                 * 明确为按钮和弹窗设置层级，保证弹窗在按钮之上，
                 * 同时保留按钮在关闭状态下的正常显示。
                 */
                position: relative;
                z-index: 1;
            }

            .n8n-chat-widget-button:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
            }

            .n8n-chat-widget-button.open {
                background: var(--n8n-chat-primary);
            }

            .n8n-chat-widget-window {
                position: absolute;
                ${config.position === 'bottom-left' ? 'left' : 'right'}: 0;
                bottom: ${config.buttonSize + 20}px;
                width: ${config.chatWidth}px;
                height: ${config.chatHeight}px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                display: none;
                flex-direction: column;
                overflow: hidden;
                animation: slideUp 0.3s ease-out;
                min-width: 300px;
                min-height: 400px;
                /* 始终高于悬浮按钮，防止被其遮挡 */
                z-index: 2;
            }

            .n8n-chat-widget-window.open {
                display: flex;
            }

            /* 边框调整手柄 */
            .n8n-chat-resize-edge-top {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                cursor: ns-resize;
            }

            .n8n-chat-resize-edge-left {
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0;
                width: 4px;
                cursor: ew-resize;
            }

            .n8n-chat-resize-edge-right {
                position: absolute;
                top: 0;
                bottom: 0;
                right: 0;
                width: 4px;
                cursor: ew-resize;
            }

            /* 角落调整手柄 */
            .n8n-chat-resize-corner-tl {
                position: absolute;
                top: 0;
                left: 0;
                width: 12px;
                height: 12px;
                cursor: nwse-resize;
            }

            .n8n-chat-resize-corner-tr {
                position: absolute;
                top: 0;
                right: 0;
                width: 12px;
                height: 12px;
                cursor: nesw-resize;
            }

            /* 手柄悬停效果 */
            .n8n-chat-resize-edge-top:hover,
            .n8n-chat-resize-edge-left:hover,
            .n8n-chat-resize-edge-right:hover {
                background: rgba(255, 117, 87, 0.2);
            }

            .n8n-chat-resize-corner-tl:hover,
            .n8n-chat-resize-corner-tr:hover {
                background: radial-gradient(circle at center, rgba(255, 117, 87, 0.3), transparent);
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .n8n-chat-header {
                background: var(--n8n-chat-primary);
                color: white;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 2px solid var(--n8n-chat-accent);
                gap: 12px;
            }

            .n8n-chat-header-info {
                flex: 1;
                min-width: 0;
            }

            .n8n-chat-header-info h3 {
                margin: 0 0 2px 0;
                font-size: 15px;
                font-weight: 600;
            }

            .n8n-chat-header-info p {
                margin: 0;
                font-size: 12px;
                opacity: 0.85;
            }

            .n8n-chat-header-actions {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
            }

            .n8n-chat-header-btn {
                background: transparent;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background 0.2s;
                flex-shrink: 0;
            }

            .n8n-chat-header-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .n8n-chat-messages {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 12px 16px;
                background: var(--n8n-chat-background);
                min-height: 0;
                width: 100%;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;

                /* 隐藏滚动条但保留滚动功能 - Firefox */
                scrollbar-width: none;
                /* 隐藏滚动条但保留滚动功能 - IE/Edge */
                -ms-overflow-style: none;
            }

            /* 隐藏滚动条但保留滚动功能 - Chrome/Safari/Opera */
            .n8n-chat-messages::-webkit-scrollbar {
                display: none;
                width: 0;
                height: 0;
            }

            /* 兼容方案：通过JS切换状态类，避免 :has 选择器在少数环境中的兼容性问题 */
            .n8n-chat-messages.has-messages {
                justify-content: flex-start;
                align-items: stretch;
            }
            .n8n-chat-messages.is-empty {
                justify-content: center;
                align-items: center;
                overflow-y: hidden; /* 空状态不显示滚动条，内容垂直居中 */
            }

            .n8n-chat-message {
                display: flex;
                margin-bottom: 12px;
                gap: 8px;
                animation: fadeIn 0.3s ease-out;
                position: relative;
            }

            .n8n-chat-message:hover .n8n-chat-copy-btn {
                opacity: 1;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .n8n-chat-message.user {
                flex-direction: row-reverse;
            }

            /* 左侧消息(assistant)的复制按钮紧贴右侧边框外 */
            .n8n-chat-message.assistant .n8n-chat-copy-btn {
                right: -32px;
                left: auto;
            }

            /* 右侧消息(user)的复制按钮紧贴左侧边框外 */
            .n8n-chat-message.user .n8n-chat-copy-btn {
                left: -26px;
                right: auto;
            }

            .n8n-chat-avatar {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                flex-shrink: 0;
                /* 确保头像始终显示在最上层，不被复制按钮等覆盖 */
                position: relative;
                z-index: 2;
            }

            .n8n-chat-message.user .n8n-chat-avatar {
                background: var(--n8n-chat-highlight);
                color: white;
            }

            .n8n-chat-message.assistant .n8n-chat-avatar {
                background: var(--n8n-chat-accent);
                color: white;
            }

            .n8n-chat-content {
                max-width: 75%;
                min-width: 100px;
                background: var(--n8n-chat-surface);
                padding: 8px 12px;
                border-radius: 8px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
                border: 1px solid #E5E7EB;
                word-wrap: break-word;
                word-break: break-word;
                overflow-wrap: break-word;
                color: var(--n8n-chat-text);
                line-height: 1.5;
                font-size: 13px;
                position: relative;
            }

            .n8n-chat-copy-btn {
                position: absolute;
                top: 4px;
                right: -32px;
                background: var(--n8n-chat-background);
                border: 1px solid var(--n8n-chat-border, #E5E7EB);
                color: var(--n8n-chat-text);
                width: 24px;
                height: 24px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                transition: all 0.2s;
                padding: 0;
                opacity: 0;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                z-index: 1;
            }

            .n8n-chat-copy-btn:hover {
                background: var(--n8n-chat-accent);
                color: white;
                border-color: var(--n8n-chat-accent);
                transform: scale(1.05);
            }

            .n8n-chat-copy-btn:active {
                transform: scale(0.95);
            }

            .n8n-chat-content img {
                max-width: 200px;
                max-height: 200px;
                object-fit: cover;
                border-radius: 8px;
                margin: 4px;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .n8n-chat-content img:hover {
                opacity: 0.9;
                transform: scale(1.05);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            }

            .n8n-chat-images-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 8px;
            }

            .n8n-chat-images-grid img {
                width: 120px;
                height: 120px;
                margin: 0;
                flex-shrink: 0;
            }

            /* 图片查看器 */
            .n8n-image-viewer {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                z-index: ${config.zIndex + 100};
                display: none;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease-out;
            }

            .n8n-image-viewer.active {
                display: flex;
            }

            .n8n-image-viewer-content {
                max-width: 95%;
                max-height: 95%;
                position: relative;
            }

            .n8n-image-viewer-img {
                max-width: 100%;
                max-height: 95vh;
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            }

            .n8n-image-viewer-close {
                position: absolute;
                top: -40px;
                right: 0;
                background: transparent;
                border: none;
                color: white;
                font-size: 32px;
                cursor: pointer;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .n8n-image-viewer-close:hover {
                transform: scale(1.1);
            }

            .n8n-chat-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                flex: 1;
                text-align: center;
                padding: 40px 20px;
                color: var(--n8n-chat-text-muted);
                width: 100%;
            }

            .n8n-chat-empty-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }

            .n8n-chat-empty h4 {
                margin: 0 0 8px 0;
                font-size: 18px;
                color: var(--n8n-chat-primary);
            }

            .n8n-chat-empty p {
                margin: 0;
                font-size: 14px;
            }

            .n8n-chat-input-area {
                border-top: 1px solid #E5E7EB;
                padding: 16px;
                background: white;
                overflow: visible;
            }

            .n8n-chat-input-wrapper {
                display: flex;
                gap: 8px;
                align-items: flex-end;
                background: var(--n8n-chat-background);
                border: 1px solid #E5E7EB;
                border-radius: 12px;
                padding: 8px 12px;
                transition: all 0.2s ease;
            }

            .n8n-chat-input-wrapper:focus-within {
                border-color: var(--n8n-chat-accent);
                box-shadow: inset 0 0 0 1px var(--n8n-chat-accent), 0 0 0 3px rgba(255, 117, 87, 0.1);
                background: white;
            }

            .n8n-chat-input-controls {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .n8n-chat-input {
                flex: 1;
                padding: 0;
                border: none;
                background: transparent;
                font-size: 14px;
                resize: none;
                min-height: 24px;
                max-height: 200px;
                font-family: inherit;
                transition: all 0.2s ease;
                line-height: 1.5;
                overflow-wrap: break-word;
                word-break: break-word;
                white-space: pre-wrap;
                overflow-y: auto;
                overflow-x: hidden;
            }

            .n8n-chat-input.single-line {
                height: 24px;
                overflow: hidden;
            }

            .n8n-chat-input.multi-line {
                height: auto;
            }

            .n8n-chat-input:focus {
                outline: none;
            }

            .n8n-chat-input::placeholder {
                color: var(--n8n-chat-text-muted);
            }

            .n8n-chat-send-btn {
                padding: 6px 12px;
                background: var(--n8n-chat-accent);
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 500;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 60px;
            }

            .n8n-chat-send-btn:hover:not(:disabled) {
                background: #FF6040;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(255, 117, 87, 0.3);
            }

            .n8n-chat-send-btn:active:not(:disabled) {
                transform: translateY(0);
            }

            .n8n-chat-send-btn:disabled {
                background: #CBD5E0;
                cursor: not-allowed;
                transform: none;
                opacity: 0.6;
            }

            .n8n-chat-stop-btn {
                padding: 8px 14px;
                background: #EF4444;
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: 500;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }

            .n8n-chat-stop-btn:hover {
                background: #DC2626;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
            }

            .n8n-chat-upload-btn {
                width: 32px;
                height: 32px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 18px;
                transition: all 0.2s;
                color: var(--n8n-chat-text-muted);
            }

            .n8n-chat-upload-btn:hover {
                background: rgba(0, 0, 0, 0.05);
                color: var(--n8n-chat-text);
            }

            .n8n-chat-file-preview {
                display: none;
                gap: 6px;
                padding: 8px 0;
                overflow-x: auto;
            }

            .n8n-chat-file-preview.active {
                display: flex;
            }

            .n8n-chat-file-chip {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 8px;
                border: 1px solid #E5E7EB;
                border-radius: 8px;
                background: var(--n8n-chat-background);
                font-size: 12px;
            }

            .n8n-chat-file-thumb {
                width: 24px;
                height: 24px;
                object-fit: cover;
                border-radius: 4px;
            }

            .n8n-chat-file-remove {
                background: transparent;
                border: none;
                color: var(--n8n-chat-text-muted);
                cursor: pointer;
                padding: 2px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .n8n-chat-file-remove:hover {
                color: #EF4444;
            }

            .n8n-chat-loading {
                display: inline-flex;
                gap: 4px;
            }

            .n8n-chat-loading span {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--n8n-chat-accent);
                animation: dotPulse 1.4s infinite ease-in-out;
            }

            .n8n-chat-loading span:nth-child(1) { animation-delay: 0s; }
            .n8n-chat-loading span:nth-child(2) { animation-delay: 0.2s; }
            .n8n-chat-loading span:nth-child(3) { animation-delay: 0.4s; }

            @keyframes dotPulse {
                0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                40% { opacity: 1; transform: scale(1.2); }
            }

            /* 流式响应光标 */
            .n8n-chat-cursor {
                display: inline-block;
                width: 2px;
                height: 1em;
                background: var(--n8n-chat-accent);
                animation: blink 0.8s step-end infinite;
                margin-left: 2px;
                vertical-align: text-bottom;
            }

            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
            }

            .n8n-chat-streaming .n8n-chat-content {
                animation: contentFadeIn 0.2s ease-out;
            }

            @keyframes contentFadeIn {
                from { opacity: 0.7; }
                to { opacity: 1; }
            }

            /* 历史记录侧边栏 */
            .n8n-chat-history-sidebar {
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 240px;
                background: var(--n8n-chat-surface);
                border-right: 1px solid #E5E7EB;
                transform: translateX(-100%);
                transition: transform 0.3s ease;
                display: flex;
                flex-direction: column;
                z-index: 10;
            }

            .n8n-chat-history-sidebar.open {
                transform: translateX(0);
            }

            .n8n-chat-history-header {
                padding: 12px;
                border-bottom: 1px solid #E5E7EB;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .n8n-chat-history-header h4 {
                font-size: 14px;
                font-weight: 600;
                color: var(--n8n-chat-text);
                margin: 0;
            }

            .n8n-chat-history-close {
                background: transparent;
                border: none;
                color: var(--n8n-chat-text-muted);
                cursor: pointer;
                font-size: 16px;
                padding: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .n8n-chat-history-list {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
            }

            .n8n-chat-history-item {
                padding: 10px 12px;
                margin-bottom: 6px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid transparent;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }

            .n8n-chat-history-item:hover {
                background: var(--n8n-chat-background);
                border-color: var(--n8n-chat-accent);
            }

            .n8n-chat-history-item.active {
                background: rgba(255, 117, 87, 0.08);
                border-color: var(--n8n-chat-accent);
            }

            .n8n-chat-history-item-content {
                flex: 1;
                min-width: 0;
            }

            .n8n-chat-history-item-title {
                font-size: 13px;
                font-weight: 500;
                color: var(--n8n-chat-text);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .n8n-chat-history-item-time {
                font-size: 11px;
                color: var(--n8n-chat-text-muted);
                margin-top: 2px;
            }

            .n8n-chat-history-delete {
                background: transparent;
                border: none;
                color: var(--n8n-chat-text-muted);
                cursor: pointer;
                opacity: 0;
                transition: all 0.2s;
                padding: 4px;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .n8n-chat-history-item:hover .n8n-chat-history-delete {
                opacity: 1;
            }

            .n8n-chat-history-delete:hover {
                color: #EF4444;
            }

            .n8n-chat-history-empty {
                text-align: center;
                padding: 40px 20px;
                color: var(--n8n-chat-text-muted);
                font-size: 13px;
            }

            .n8n-chat-new-btn {
                margin: 12px;
                padding: 10px 14px;
                background: var(--n8n-chat-highlight);
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: 500;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }

            .n8n-chat-new-btn:hover {
                background: #e8195c;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(255, 29, 94, 0.3);
            }

            /* Markdown 样式 */
            .n8n-chat-content p {
                margin: 0 0 8px 0;
            }

            .n8n-chat-content p:last-child {
                margin-bottom: 0;
            }

            .n8n-chat-content code {
                background: rgba(17, 24, 39, 0.06);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 13px;
            }

            .n8n-chat-content pre {
                background: var(--n8n-chat-background);
                padding: 10px;
                border-radius: 8px;
                overflow: auto;
                margin: 8px 0;
                font-size: 13px;
            }

            .n8n-chat-content pre code {
                background: transparent;
                padding: 0;
            }

            /* JSON 优化显示样式 */
            .json-result {
                background: #FFFFFF;
                border: 1px solid var(--n8n-chat-border, #E5E7EB);
                border-radius: 8px;
                padding: 12px;
                margin: 8px 0;
            }

            .json-compact {
                display: grid;
                row-gap: 6px;
            }

            .kv-row {
                display: grid;
                grid-template-columns: 140px 1fr;
                gap: 8px;
                align-items: start;
                padding: 4px 0;
            }

            .kv-key {
                font-weight: 600;
                color: var(--n8n-chat-text);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .kv-val {
                color: var(--n8n-chat-text-light);
                word-break: break-word;
            }

            .json-compact-list {
                list-style: none;
                padding: 0;
                margin: 0;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 6px;
            }

            .json-compact-list li {
                background: var(--n8n-chat-background);
                border: 1px solid var(--n8n-chat-border, #E5E7EB);
                border-radius: 6px;
                padding: 6px 8px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-size: 12px;
            }

            .json-block-wrapper {
                position: relative;
            }

            .json-hover-toolbar {
                position: absolute;
                top: 6px;
                right: 6px;
                display: none;
                gap: 6px;
            }

            .json-block-wrapper:hover .json-hover-toolbar {
                display: flex;
            }

            .json-toggle-btn {
                padding: 4px 8px;
                border: 1px solid var(--n8n-chat-border, #E5E7EB);
                background: var(--n8n-chat-background);
                color: var(--n8n-chat-text);
                border-radius: 6px;
                font-size: 0.75rem;
                cursor: pointer;
                transition: all 0.2s;
            }

            .json-toggle-btn:hover {
                background: var(--n8n-chat-border, #F3F4F6);
            }

            .json-beautified {
                display: none;
            }

            .json-beautified.active {
                display: block;
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                .n8n-chat-widget-window {
                    position: fixed;
                    left: 10px !important;
                    right: 10px !important;
                    bottom: 10px !important;
                    width: calc(100% - 20px) !important;
                    height: calc(100vh - 20px) !important;
                    max-height: calc(100vh - 20px) !important;
                    max-width: none !important;
                }

                .n8n-chat-content {
                    max-width: 85%;
                }

                .n8n-chat-empty {
                    padding: 30px 15px;
                }

                .n8n-chat-empty-icon {
                    font-size: 40px;
                }

                .n8n-chat-empty h4 {
                    font-size: 16px;
                }

                .n8n-chat-empty p {
                    font-size: 13px;
                }
            }

            @media (max-width: 480px) {
                .n8n-chat-widget-button {
                    width: 48px;
                    height: 48px;
                    font-size: 20px;
                }

                .n8n-chat-history-sidebar {
                    width: 200px;
                }

                .n8n-chat-content {
                    max-width: 90%;
                    font-size: 12px;
                }

                .n8n-chat-input {
                    font-size: 13px;
                }
            }
        `;
        return style;
    }

    // 创建HTML结构
    function createWidgetHTML() {
        const container = document.createElement('div');
        container.className = 'n8n-chat-widget-container';
        const acceptTypes = config.enableFileUpload ? getAcceptedFileTypes() : 'image/*';
        container.innerHTML = `
            <button class="n8n-chat-widget-button" id="n8nChatToggle">
                ${config.buttonIcon}
            </button>
            <div class="n8n-chat-widget-window" id="n8nChatWindow">
                ${config.enableResize ? `
                    <div class="n8n-chat-resize-edge-top"></div>
                    ${config.position === 'bottom-left' ?
                        '<div class="n8n-chat-resize-edge-right"></div><div class="n8n-chat-resize-corner-tr"></div>' :
                        '<div class="n8n-chat-resize-edge-left"></div><div class="n8n-chat-resize-corner-tl"></div>'
                    }
                ` : ''}
                <!-- Image Viewer -->
                <div class="n8n-image-viewer" id="n8nImageViewer">
                    <div class="n8n-image-viewer-content">
                        <button class="n8n-image-viewer-close" id="n8nImageViewerClose">✕</button>
                        <img class="n8n-image-viewer-img" id="n8nImageViewerImg" src="" alt="Preview">
                    </div>
                </div>
                <div class="n8n-chat-header">
                    <div class="n8n-chat-header-info">
                        <h3>${config.title}</h3>
                        <p>${config.description}</p>
                    </div>
                    <div class="n8n-chat-header-actions">
                        ${config.enableHistory ? `
                            <button class="n8n-chat-header-btn" id="n8nHistoryBtn" title="历史记录">
                                📋
                            </button>
                        ` : ''}
                        <button class="n8n-chat-header-btn" id="n8nChatClose">
                            ${config.closeIcon}
                        </button>
                    </div>
                </div>
                ${config.enableHistory ? `
                    <div class="n8n-chat-history-sidebar" id="n8nHistorySidebar">
                        <div class="n8n-chat-history-header">
                            <h4>历史记录</h4>
                            <button class="n8n-chat-history-close" id="n8nHistoryClose">✕</button>
                        </div>
                        <button class="n8n-chat-new-btn" id="n8nNewChatBtn">
                            ✨ ${config.newChatButtonText}
                        </button>
                        <div class="n8n-chat-history-list" id="n8nHistoryList"></div>
                    </div>
                ` : ''}
                <div class="n8n-chat-messages" id="n8nChatMessages">
                    <div class="n8n-chat-empty">
                        <div class="n8n-chat-empty-icon">${config.buttonIcon}</div>
                        <h4>${config.emptyStateTitle}</h4>
                        <p>${config.emptyStateDescription}</p>
                    </div>
                </div>
                <div class="n8n-chat-input-area">
                    <div class="n8n-chat-file-preview" id="n8nFilePreview"></div>
                    <div class="n8n-chat-input-wrapper">
                        ${config.enableFileUpload ? `
                            <button class="n8n-chat-upload-btn" id="n8nUploadBtn" title="上传文件">
                                📎
                            </button>
                            <input type="file" id="n8nFileInput" accept="${acceptTypes}" multiple style="display: none;">
                        ` : ''}
                        <textarea
                            id="n8nChatInput"
                            class="n8n-chat-input single-line"
                            placeholder="${config.placeholder}"
                            rows="1"
                        ></textarea>
                        <button class="n8n-chat-send-btn" id="n8nSendBtn">
                            ${config.sendButtonText}
                        </button>
                    </div>
                </div>
            </div>
        `;
        return container;
    }

    // 初始化事件监听
    function initEventListeners() {
        const toggleBtn = document.getElementById('n8nChatToggle');
        const closeBtn = document.getElementById('n8nChatClose');
        const sendBtn = document.getElementById('n8nSendBtn');
        const input = document.getElementById('n8nChatInput');
        const uploadBtn = document.getElementById('n8nUploadBtn');
        const fileInput = document.getElementById('n8nFileInput');
        const chatWindow = document.getElementById('n8nChatWindow');

        toggleBtn.addEventListener('click', toggleChat);
        closeBtn.addEventListener('click', closeChat);
        sendBtn.addEventListener('click', sendMessage);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        input.addEventListener('input', autoResizeTextarea);

        // 监听窗口大小变化,自动重新计算输入框状态
        let resizeTimeout;
        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (input.value.trim()) {
                    autoResizeTextarea();
                }
            }, 100);
        });
        resizeObserver.observe(chatWindow);

        // 监听全局窗口大小变化
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (input.value.trim()) {
                    autoResizeTextarea();
                }
            }, 100);
        });

        if (config.enableFileUpload) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', handleFileSelect);

            // 支持拖拽和粘贴
            chatWindow.addEventListener('dragover', (e) => e.preventDefault());
            chatWindow.addEventListener('drop', handleFileDrop);
            document.addEventListener('paste', handlePaste);
        }

        // 历史记录相关事件
        if (config.enableHistory) {
            const historyBtn = document.getElementById('n8nHistoryBtn');
            const historyClose = document.getElementById('n8nHistoryClose');
            const newChatBtn = document.getElementById('n8nNewChatBtn');

            if (historyBtn) {
                historyBtn.addEventListener('click', () => toggleHistorySidebar());
            }
            if (historyClose) {
                historyClose.addEventListener('click', () => toggleHistorySidebar(false));
            }
            if (newChatBtn) {
                newChatBtn.addEventListener('click', startNewChat);
            }
        }

        // 图片查看器事件
        const imageViewerClose = document.getElementById('n8nImageViewerClose');
        const imageViewer = document.getElementById('n8nImageViewer');

        if (imageViewerClose) {
            imageViewerClose.addEventListener('click', closeImageViewer);
        }
        if (imageViewer) {
            imageViewer.addEventListener('click', (e) => {
                if (e.target === imageViewer) {
                    closeImageViewer();
                }
            });
        }

        // ESC键关闭图片查看器
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && imageViewer && imageViewer.classList.contains('active')) {
                closeImageViewer();
            }
        });
    }

    // 初始化窗口大小调整
    function initWindowResize() {
        if (!config.enableResize) return;

        const chatWindow = document.getElementById('n8nChatWindow');
        const STORAGE_SIZE_KEY = 'n8n_chat_widget_size';

        // 从 localStorage 加载尺寸
        const loadSavedSize = () => {
            try {
                const saved = localStorage.getItem(STORAGE_SIZE_KEY);
                if (saved) {
                    const { width, height } = JSON.parse(saved);
                    chatWindow.style.width = width + 'px';
                    chatWindow.style.height = height + 'px';
                }
            } catch (e) {
                console.warn('Failed to load saved window size:', e);
            }
        };

        // 保存尺寸到 localStorage
        const saveSize = (width, height) => {
            try {
                localStorage.setItem(STORAGE_SIZE_KEY, JSON.stringify({ width, height }));
            } catch (e) {
                console.warn('Failed to save window size:', e);
            }
        };

        // 调整大小处理
        const handleResize = (handle, startX, startY) => {
            const rect = chatWindow.getBoundingClientRect();
            const startWidth = rect.width;
            const startHeight = rect.height;
            const minWidth = 300;
            const minHeight = 400;

            const onMouseMove = (e) => {
                let newWidth = startWidth;
                let newHeight = startHeight;

                if (handle.includes('top')) {
                    newHeight = startHeight + (startY - e.clientY);
                }
                if (handle.includes('left')) {
                    newWidth = startWidth + (startX - e.clientX);
                }
                if (handle.includes('right')) {
                    newWidth = startWidth + (e.clientX - startX);
                }

                // 应用约束
                newWidth = Math.max(minWidth, newWidth);
                newHeight = Math.max(minHeight, newHeight);

                chatWindow.style.width = newWidth + 'px';
                chatWindow.style.height = newHeight + 'px';
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                const finalWidth = parseInt(chatWindow.style.width);
                const finalHeight = parseInt(chatWindow.style.height);
                saveSize(finalWidth, finalHeight);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        // 绑定事件
        const bindHandle = (selector, handleType) => {
            const handle = chatWindow.querySelector(selector);
            if (handle) {
                handle.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    handleResize(handleType, e.clientX, e.clientY);
                });
            }
        };

        bindHandle('.n8n-chat-resize-edge-top', 'top');
        bindHandle('.n8n-chat-resize-edge-left', 'left');
        bindHandle('.n8n-chat-resize-edge-right', 'right');
        bindHandle('.n8n-chat-resize-corner-tl', 'top-left');
        bindHandle('.n8n-chat-resize-corner-tr', 'top-right');

        // 加载保存的尺寸
        loadSavedSize();
    }

    // 加载历史记录
    function loadChatHistory() {
        if (!config.enableHistory) return;

        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                chatHistory = JSON.parse(saved);
                renderHistoryList();
            }
        } catch (e) {
            console.warn('Failed to load chat history:', e);
            chatHistory = [];
        }
    }

    // 保存历史记录
    function saveChatHistory() {
        if (!config.enableHistory) return;

        try {
            // 限制历史数量
            if (chatHistory.length > config.maxHistoryItems) {
                chatHistory = chatHistory.slice(-config.maxHistoryItems);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
        } catch (e) {
            console.warn('Failed to save chat history:', e);
        }
    }

    // 渲染历史列表
    function renderHistoryList() {
        const listEl = document.getElementById('n8nHistoryList');
        if (!listEl) return;

        if (chatHistory.length === 0) {
            listEl.innerHTML = '<div class="n8n-chat-history-empty">暂无历史记录</div>';
            return;
        }

        // 按时间倒序排列
        const sorted = [...chatHistory].reverse();

        listEl.innerHTML = sorted.map((chat, idx) => {
            const realIdx = chatHistory.length - 1 - idx;
            const isActive = realIdx === currentChatIndex;
            return `
                <div class="n8n-chat-history-item ${isActive ? 'active' : ''}" data-index="${realIdx}">
                    <div class="n8n-chat-history-item-content" onclick="N8NChatWidget.loadChat(${realIdx})">
                        <div class="n8n-chat-history-item-title">${escapeHTML(chat.title || '新对话')}</div>
                        <div class="n8n-chat-history-item-time">${formatTime(chat.timestamp)}</div>
                    </div>
                    <button class="n8n-chat-history-delete" onclick="N8NChatWidget.deleteChat(event, ${realIdx})" title="删除">
                        ✕
                    </button>
                </div>
            `;
        }).join('');
    }

    // 格式化时间
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';

        return date.toLocaleDateString('zh-CN');
    }

    // HTML 转义
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 新建对话
    function startNewChat() {
        currentChatIndex = -1;
        currentSessionId = generateSessionId();
        currentFiles = [];

        const messagesContainer = document.getElementById('n8nChatMessages');
        messagesContainer.innerHTML = `
            <div class="n8n-chat-empty">
                <div class="n8n-chat-empty-icon">${config.buttonIcon}</div>
                <h4>${config.emptyStateTitle}</h4>
                <p>${config.emptyStateDescription}</p>
            </div>
        `;
        // 空状态：让容器处于居中、无滚动条的模式
        updateMessagesContainerState();

        renderFilePreview();
        renderHistoryList();
        toggleHistorySidebar(false);
    }

    // 加载历史对话
    function loadChatByIndex(index) {
        if (index < 0 || index >= chatHistory.length) return;

        currentChatIndex = index;
        const chat = chatHistory[index];
        currentSessionId = chat.sessionId;

        const messagesContainer = document.getElementById('n8nChatMessages');
        messagesContainer.innerHTML = '';

        chat.messages.forEach(msg => {
            addMessageToDOM(msg.role, msg.content, msg.imageData);
        });

        renderHistoryList();
        toggleHistorySidebar(false);
        updateMessagesContainerState();
    }

    // 删除历史对话
    function deleteChatByIndex(event, index) {
        event.stopPropagation();

        if (!confirm('确定要删除这条历史记录吗？')) return;

        if (index === currentChatIndex) {
            startNewChat();
        } else if (index < currentChatIndex) {
            currentChatIndex--;
        }

        chatHistory.splice(index, 1);
        saveChatHistory();
        renderHistoryList();
        showToast('历史记录已删除');
    }

    // 切换历史侧边栏
    function toggleHistorySidebar(show) {
        const sidebar = document.getElementById('n8nHistorySidebar');
        if (!sidebar) return;

        if (typeof show === 'boolean') {
            if (show) {
                sidebar.classList.add('open');
            } else {
                sidebar.classList.remove('open');
            }
        } else {
            sidebar.classList.toggle('open');
        }
    }

    // 保存当前对话
    function saveCurrentChat(role, content, imageData) {
        if (!config.enableHistory) return;

        if (currentChatIndex === -1) {
            // 新对话
            const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
            chatHistory.push({
                title: title,
                timestamp: Date.now(),
                sessionId: currentSessionId,
                messages: []
            });
            currentChatIndex = chatHistory.length - 1;
        }

        const currentChat = chatHistory[currentChatIndex];
        currentChat.messages.push({
            role: role,
            content: content,
            imageData: imageData
        });

        // 更新时间戳
        currentChat.timestamp = Date.now();

        saveChatHistory();
        renderHistoryList();
    }

    // JSON 格式化工具函数

    // 从文本中提取 JSON
    function extractJSON(text) {
        // 方法1: 匹配 ```json ... ``` 代码块
        const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
        const match = text.match(jsonBlockRegex);

        if (match && match[1]) {
            try {
                const jsonData = JSON.parse(match[1].trim());
                return { isJSON: true, data: jsonData, original: text };
            } catch (e) {
                // 继续尝试其他方法
            }
        }

        // 方法2: 匹配任意代码块 ``` ... ```
        const codeBlockRegex = /```\s*([\s\S]*?)\s*```/;
        const codeMatch = text.match(codeBlockRegex);

        if (codeMatch && codeMatch[1]) {
            try {
                let cleaned = codeMatch[1].trim();
                if (/^(json|javascript|js)\b/i.test(cleaned)) {
                    cleaned = cleaned.replace(/^[^\n]*\n/, '');
                }
                const jsonData = JSON.parse(cleaned);
                return { isJSON: true, data: jsonData, original: text };
            } catch (e) {
                // 继续尝试其他方法
            }
        }

        // 方法3: 查找平衡的 JSON 对象
        try {
            let depth = 0;
            let startIndex = -1;
            let endIndex = -1;

            for (let i = 0; i < text.length; i++) {
                if (text[i] === '{') {
                    if (depth === 0) startIndex = i;
                    depth++;
                } else if (text[i] === '}') {
                    depth--;
                    if (depth === 0 && startIndex !== -1) {
                        endIndex = i + 1;
                        break;
                    }
                }
            }

            if (startIndex !== -1 && endIndex !== -1) {
                const jsonString = text.substring(startIndex, endIndex);
                const jsonData = JSON.parse(jsonString);
                return { isJSON: true, data: jsonData, original: text };
            }
        } catch (e) {
            // JSON 解析失败
        }

        return { isJSON: false, data: null, original: text };
    }

    // 格式化 JSON 为 HTML
    function formatJSONResponse(jsonData) {
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        };

        // 通用对象渲染
        const renderKV = (obj) => {
            let html = '<div class="json-compact">';
            for (const key of Object.keys(obj)) {
                const value = obj[key];
                let valStr;

                if (Array.isArray(value)) {
                    if (value.every(x => x === null || ['string','number','boolean'].includes(typeof x))) {
                        valStr = escapeHtml(value.join(', '));
                    } else {
                        valStr = escapeHtml(JSON.stringify(value));
                    }
                } else if (value && typeof value === 'object') {
                    valStr = escapeHtml(JSON.stringify(value));
                } else {
                    valStr = escapeHtml(value);
                }

                html += `<div class="kv-row"><div class="kv-key">${escapeHtml(key)}</div><div class="kv-val">${valStr}</div></div>`;
            }
            html += '</div>';
            return html;
        };

        // 通用数组渲染
        const renderArray = (arr) => {
            if (arr.length === 0) return '<div class="json-compact">[]</div>';

            const allPrimitive = arr.every(x => x === null || ['string','number','boolean'].includes(typeof x));

            if (allPrimitive) {
                return `<ul class="json-compact-list">${arr.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
            }

            return `<div class="json-compact">${escapeHtml(JSON.stringify(arr))}</div>`;
        };

        let html = '<div class="json-result">';
        if (Array.isArray(jsonData)) {
            html += renderArray(jsonData);
        } else if (jsonData && typeof jsonData === 'object') {
            html += renderKV(jsonData);
        } else {
            html += `<div class="json-compact">${escapeHtml(String(jsonData))}</div>`;
        }
        html += '</div>';

        return html;
    }

    // 增强 JSON 代码块
    function enhanceJSONCodeBlocks(messageContentEl) {
        if (!messageContentEl) return;

        const pres = Array.from(messageContentEl.querySelectorAll('pre > code'));

        pres.forEach((codeEl) => {
            const lang = (codeEl.className || '').toLowerCase();
            const raw = codeEl.textContent || '';

            let jsonData = null;
            const tryParse = (s) => {
                try {
                    return JSON.parse(s);
                } catch (_) {
                    return null;
                }
            };

            if (lang.includes('language-json')) {
                jsonData = tryParse(raw);
            } else {
                const t = raw.trim();
                if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
                    jsonData = tryParse(raw);
                }
            }

            if (!jsonData) return;

            const pre = codeEl.parentElement;
            const wrapper = document.createElement('div');
            wrapper.className = 'json-block-wrapper';
            pre.parentElement.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);

            const beautified = document.createElement('div');
            beautified.className = 'json-beautified active';
            beautified.innerHTML = formatJSONResponse(jsonData);
            wrapper.appendChild(beautified);

            const hoverBar = document.createElement('div');
            hoverBar.className = 'json-hover-toolbar';

            const btnMd = document.createElement('button');
            btnMd.className = 'json-toggle-btn';
            btnMd.textContent = '⌘';

            const btnBeaut = document.createElement('button');
            btnBeaut.className = 'json-toggle-btn';
            btnBeaut.textContent = '✨';
            btnBeaut.style.display = 'none';

            hoverBar.appendChild(btnMd);
            hoverBar.appendChild(btnBeaut);
            wrapper.appendChild(hoverBar);

            // 默认显示美化版
            pre.style.display = 'none';

            btnMd.addEventListener('click', (e) => {
                e.stopPropagation();
                beautified.classList.remove('active');
                pre.style.display = '';
                btnMd.style.display = 'none';
                btnBeaut.style.display = '';
            });

            btnBeaut.addEventListener('click', (e) => {
                e.stopPropagation();
                pre.style.display = 'none';
                beautified.classList.add('active');
                btnMd.style.display = '';
                btnBeaut.style.display = 'none';
            });
        });
    }

    // 切换聊天窗口
    function toggleChat() {
        isOpen = !isOpen;
        const window = document.getElementById('n8nChatWindow');
        const button = document.getElementById('n8nChatToggle');

        if (isOpen) {
            window.classList.add('open');
            button.classList.add('open');
            button.textContent = config.closeIcon;
        } else {
            window.classList.remove('open');
            button.classList.remove('open');
            button.textContent = config.buttonIcon;
        }
    }

    // 关闭聊天窗口
    function closeChat() {
        isOpen = false;
        document.getElementById('n8nChatWindow').classList.remove('open');
        document.getElementById('n8nChatToggle').classList.remove('open');
        document.getElementById('n8nChatToggle').textContent = config.buttonIcon;
    }

    // 自动调整textarea高度并检测是否需要切换为多行
    function autoResizeTextarea() {
        const textarea = document.getElementById('n8nChatInput');

        if (!textarea.value.trim()) {
            // 空内容时重置为单行模式
            textarea.classList.remove('multi-line');
            textarea.classList.add('single-line');
            textarea.style.height = '24px';
            return;
        }

        // 重置高度以获取准确的scrollHeight
        textarea.style.height = 'auto';

        // 强制重排
        void textarea.offsetHeight;

        const scrollHeight = textarea.scrollHeight;

        // 判断是否需要多行 (scrollHeight > 24px说明内容超出或包含换行)
        if (scrollHeight > 24) {
            // 切换到多行模式
            textarea.classList.remove('single-line');
            textarea.classList.add('multi-line');
            const newHeight = Math.min(scrollHeight, 200);
            textarea.style.height = newHeight + 'px';
        } else {
            // 保持单行模式
            textarea.classList.remove('multi-line');
            textarea.classList.add('single-line');
            textarea.style.height = '24px';
        }
    }

    // 处理文件选择
    function handleFileSelect(e) {
        const files = e.target.files;
        if (!files || !files.length) return;
        for (let i = 0; i < files.length; i++) {
            addFile(files[i]);
        }
        renderFilePreview();
    }

    // 处理文件拖拽
    function handleFileDrop(e) {
        e.preventDefault();
        const files = e.dataTransfer?.files;
        if (files && files.length) {
            for (let i = 0; i < files.length; i++) {
                addFile(files[i]);
            }
            renderFilePreview();
        }
    }

    // 处理粘贴
    function handlePaste(e) {
        if (!isOpen) return;
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                addFile(file);
                renderFilePreview();
                break;
            }
        }
    }

    // 获取接受的文件类型
    function getAcceptedFileTypes() {
        const types = config.fileUploadTypes;
        const presets = {
            'image': 'image/*',
            'pdf': 'application/pdf',
            'csv': 'text/csv,.csv',
            'all': '*/*'
        };
        return presets[types] || types;
    }

    // 添加文件
    function addFile(file) {
        if (!file || !file.type) {
            showToast('无效的文件');
            return;
        }

        const acceptTypes = getAcceptedFileTypes();
        if (acceptTypes === '*/*') {
            currentFiles.push(file);
            return;
        }

        // 验证 MIME 类型
        const mimeTypes = acceptTypes.split(',').map(t => t.trim());
        const isValid = mimeTypes.some(type => {
            if (type.endsWith('/*')) {
                return file.type.startsWith(type.replace('/*', '/'));
            }
            return file.type === type || file.name.endsWith(type);
        });

        if (!isValid) {
            showToast('不支持的文件类型');
            return;
        }

        currentFiles.push(file);
    }

    // 移除文件
    function removeFile(index) {
        currentFiles.splice(index, 1);
        renderFilePreview();
    }

    // 渲染文件预览
    function renderFilePreview() {
        const preview = document.getElementById('n8nFilePreview');
        if (!currentFiles.length) {
            preview.classList.remove('active');
            preview.innerHTML = '';
            return;
        }

        preview.classList.add('active');
        preview.innerHTML = currentFiles.map((file, idx) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = preview.querySelector(`[data-index="${idx}"]`);
                if (img) img.src = e.target.result;
            };
            reader.readAsDataURL(file);

            return `
                <div class="n8n-chat-file-chip">
                    <img class="n8n-chat-file-thumb" data-index="${idx}" alt="${file.name}">
                    <span>${file.name}</span>
                    <button class="n8n-chat-file-remove" onclick="N8NChatWidget.removeFile(${idx})">✕</button>
                </div>
            `;
        }).join('');
    }

    // 发送消息
    async function sendMessage() {
        const input = document.getElementById('n8nChatInput');
        const message = input.value.trim();

        if (!message && currentFiles.length === 0) {
            showToast('请输入消息或上传图片');
            return;
        }

        // 确保在发送前有 sessionId
        if (!currentSessionId) {
            currentSessionId = generateSessionId();
            console.log('Generated new sessionId:', currentSessionId);
        }

        // 移除空状态
        const emptyState = document.querySelector('.n8n-chat-empty');
        if (emptyState) emptyState.remove();

        // 添加用户消息
        let imageData = null;
        if (currentFiles.length > 0) {
            imageData = await Promise.all(currentFiles.map(file => {
                return new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
            }));
        }

        addMessageToDOM('user', message || '请分析这张图片', imageData);

        // 保存用户消息到历史
        saveCurrentChat('user', message || '请分析这张图片', imageData);

        // 清空输入
        input.value = '';
        input.classList.remove('multi-line');
        input.classList.add('single-line');
        input.style.height = '24px';
        const filesForUpload = [...currentFiles];
        currentFiles = [];
        renderFilePreview();

        // 添加流式响应消息占位符
        const streamingId = 'streaming-' + Date.now();
        addStreamingMessage(streamingId);
        updateMessagesContainerState();

        try {
            // 准备请求
            let body;
            let headers = {};

            if (imageData && imageData.length > 0) {
                const fd = new FormData();
                fd.append('chatInput', message || '请分析这张图片');
                // 确保有 sessionId
                if (!currentSessionId) {
                    currentSessionId = generateSessionId();
                }
                fd.append('sessionId', currentSessionId);
                for (const f of filesForUpload) fd.append('data', f);
                body = fd;
            } else {
                const jsonPayload = {
                    chatInput: message,
                    sessionId: currentSessionId
                };
                // 即使 currentSessionId 为 null，也应生成新的
                if (!jsonPayload.sessionId) {
                    jsonPayload.sessionId = generateSessionId();
                    currentSessionId = jsonPayload.sessionId;
                }
                body = JSON.stringify(jsonPayload);
                headers['Content-Type'] = 'application/json';
            }

            // 发送请求并处理流式响应
            const response = await fetch(config.webhookUrl, {
                method: 'POST',
                body: body,
                headers: {
                    ...headers,
                    ...config.customHeaders
                }
            });

            // 检查是否支持流式读取
            const canStream = response.body && typeof response.body.getReader === 'function';

            if (canStream) {
                await handleStreamingResponse(response, streamingId);
            } else {
                // 降级为普通响应
                await handleRegularResponse(response, streamingId);
            }

        } catch (error) {
            console.error('Error:', error);
            updateStreamingMessage(streamingId, '❌ 发生错误: ' + error.message, true);
        }
    }

    // 处理流式响应
    async function handleStreamingResponse(response, messageId) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split(/\r?\n/);
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim() || line.startsWith(':')) continue;

                    let dataLine = line;
                    if (/^data:\s*/.test(line)) {
                        dataLine = line.replace(/^data:\s*/, '');
                    }

                    try {
                        const evt = JSON.parse(dataLine);

                        // 更新 sessionId
                        if (typeof evt.sessionId === 'string') {
                            currentSessionId = evt.sessionId;
                        }

                        // 提取内容
                        let content = '';
                        if (typeof evt.content === 'string') {
                            content = evt.content;
                        } else if (typeof evt.output === 'string') {
                            content = evt.output;
                        } else if (typeof evt.delta === 'string') {
                            content = evt.delta;
                        } else if (evt.choices && evt.choices[0] && evt.choices[0].delta && typeof evt.choices[0].delta.content === 'string') {
                            content = evt.choices[0].delta.content;
                        }

                        if (content) {
                            // 尝试解析content可能包含的JSON envelope
                            try {
                                const inner = JSON.parse(content);
                                if (inner && typeof inner.output === 'string') {
                                    content = inner.output;
                                }
                                if (inner && typeof inner.sessionId === 'string') {
                                    currentSessionId = inner.sessionId;
                                }
                            } catch (e) {
                                // 保持原始content
                            }

                            accumulatedContent += content;
                            updateStreamingMessage(messageId, accumulatedContent, false);
                        }

                    } catch (e) {
                        // 不是JSON,作为纯文本处理
                        if (dataLine.trim()) {
                            accumulatedContent += dataLine + '\n';
                            updateStreamingMessage(messageId, accumulatedContent, false);
                        }
                    }
                }
            }

            // 处理剩余buffer
            if (buffer.trim()) {
                try {
                    const evt = JSON.parse(buffer);
                    if (evt.content) accumulatedContent += evt.content;
                    if (evt.output) accumulatedContent += evt.output;
                } catch (e) {
                    accumulatedContent += buffer;
                }
            }

            // 完成流式响应
            updateStreamingMessage(messageId, accumulatedContent, true);

        } catch (error) {
            console.error('Streaming error:', error);
            updateStreamingMessage(messageId, accumulatedContent || '❌ 流式读取错误: ' + error.message, true);
        }
    }

    // 处理普通响应
    async function handleRegularResponse(response, messageId) {
        const text = await response.text();
        let content = text;

        try {
            const json = JSON.parse(text);
            if (json.sessionId) currentSessionId = json.sessionId;

            if (typeof json.content === 'string') {
                // 尝试解析content内部的JSON
                try {
                    const inner = JSON.parse(json.content);
                    if (inner && typeof inner.output === 'string') {
                        content = inner.output;
                    } else {
                        content = json.content;
                    }
                    if (inner && typeof inner.sessionId === 'string') {
                        currentSessionId = inner.sessionId;
                    }
                } catch (e) {
                    content = json.content;
                }
            } else {
                content = json.output || json.message || text;
            }
        } catch (e) {
            // 保持原始文本
        }

        updateStreamingMessage(messageId, content, true);
    }

    // 添加流式消息占位符
    function addStreamingMessage(id) {
        const container = document.getElementById('n8nChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'n8n-chat-message assistant n8n-chat-streaming';
        messageDiv.id = id;

        const avatar = document.createElement('div');
        avatar.className = 'n8n-chat-avatar';
        avatar.textContent = 'AI';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'n8n-chat-content';
        contentDiv.innerHTML = `
            <div class="n8n-chat-loading">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
        updateMessagesContainerState();
    }

    // 更新流式消息内容
    function updateStreamingMessage(messageId, content, isComplete = false) {
        const wrapper = document.getElementById(messageId);
        if (!wrapper) return;

        const contentDiv = wrapper.querySelector('.n8n-chat-content');
        if (!contentDiv) return;

        if (isComplete) {
            // 完成: 移除streaming类,渲染最终内容
            wrapper.classList.remove('n8n-chat-streaming');

            if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                const html = DOMPurify.sanitize(marked.parse(content));
                contentDiv.innerHTML = html;
                enhanceJSONCodeBlocks(contentDiv);
            } else {
                contentDiv.textContent = content;
            }

            // 保存 assistant 消息到历史
            saveCurrentChat('assistant', content, null);
            updateMessagesContainerState();
        } else {
            // 流式传输中
            const hasText = Boolean(content && content.trim().length > 0);

            if (!hasText) {
                // 保持加载动画
                if (!contentDiv.querySelector('.n8n-chat-loading')) {
                    contentDiv.innerHTML = `
                        <div class="n8n-chat-loading">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    `;
                }
            } else {
                // 显示内容 + 光标
                if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                    const html = DOMPurify.sanitize(marked.parse(content));
                    contentDiv.innerHTML = html + '<span class="n8n-chat-cursor"></span>';
                } else {
                    contentDiv.textContent = content;
                    contentDiv.innerHTML += '<span class="n8n-chat-cursor"></span>';
                }
            }
        }

        // 滚动到底部
        const container = document.getElementById('n8nChatMessages');
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
        updateMessagesContainerState();
    }

    // 添加消息到DOM
    function addMessageToDOM(role, content, imageData) {
        const container = document.getElementById('n8nChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `n8n-chat-message ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'n8n-chat-avatar';
        avatar.textContent = role === 'user' ? '我' : 'AI';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'n8n-chat-content';

        // 渲染Markdown
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            const html = DOMPurify.sanitize(marked.parse(content));
            contentDiv.innerHTML = html;
            if (role === 'assistant') {
                enhanceJSONCodeBlocks(contentDiv);
            }
        } else {
            contentDiv.textContent = content;
        }

        // 添加图片
        if (imageData) {
            const images = Array.isArray(imageData) ? imageData : [imageData];

            if (images.length > 1) {
                // 多图:使用网格布局
                const gridDiv = document.createElement('div');
                gridDiv.className = 'n8n-chat-images-grid';
                images.forEach(src => {
                    const img = document.createElement('img');
                    img.src = src;
                    img.alt = '上传的图片';
                    img.onclick = () => openImageViewer(src);
                    gridDiv.appendChild(img);
                });
                contentDiv.appendChild(gridDiv);
            } else if (images.length === 1) {
                // 单图:直接显示
                const img = document.createElement('img');
                img.src = images[0];
                img.alt = '上传的图片';
                img.onclick = () => openImageViewer(images[0]);
                contentDiv.appendChild(img);
            }
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);

        // 添加复制按钮(紧贴消息内容边框外侧)
        const copyBtn = document.createElement('button');
        copyBtn.className = 'n8n-chat-copy-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.title = '复制';
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            copyMessageContent(contentDiv);
        };
        contentDiv.appendChild(copyBtn);

        container.appendChild(messageDiv);

        // 滚动到底部
        container.scrollTop = container.scrollHeight;
        updateMessagesContainerState();
    }

    // 添加加载消息
    function addLoadingMessage(id) {
        const container = document.getElementById('n8nChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'n8n-chat-message assistant';
        messageDiv.id = id;

        const avatar = document.createElement('div');
        avatar.className = 'n8n-chat-avatar';
        avatar.textContent = 'AI';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'n8n-chat-content';
        contentDiv.innerHTML = `
            <div class="n8n-chat-loading">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    // 移除加载消息
    function removeLoadingMessage(id) {
        const message = document.getElementById(id);
        if (message) message.remove();
    }

    // 显示提示
    function showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            ${config.position === 'bottom-left' ? 'left' : 'right'}: 24px;
            background: var(--n8n-chat-primary);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: ${config.zIndex + 1};
            animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, duration - 300);
    }

    // 打开图片查看器
    function openImageViewer(src) {
        const viewer = document.getElementById('n8nImageViewer');
        const img = document.getElementById('n8nImageViewerImg');
        if (viewer && img) {
            img.src = src;
            viewer.classList.add('active');
        }
    }

    // 关闭图片查看器
    function closeImageViewer() {
        const viewer = document.getElementById('n8nImageViewer');
        if (viewer) {
            viewer.classList.remove('active');
        }
    }

    // 复制消息内容
    function copyMessageContent(contentDiv) {
        // 克隆内容div以避免影响原始DOM
        const clone = contentDiv.cloneNode(true);

        // 移除复制按钮和其他不需要复制的元素
        const copyBtn = clone.querySelector('.n8n-chat-copy-btn');
        if (copyBtn) copyBtn.remove();

        const jsonToolbars = clone.querySelectorAll('.json-hover-toolbar');
        jsonToolbars.forEach(toolbar => toolbar.remove());

        // 处理JSON代码块包装器：只保留当前显示的内容
        const jsonWrappers = clone.querySelectorAll('.json-block-wrapper');
        jsonWrappers.forEach(wrapper => {
            const pre = wrapper.querySelector('pre');
            const beautified = wrapper.querySelector('.json-beautified');

            // 判断当前显示的是哪个格式
            const isBeautifiedActive = beautified && beautified.classList.contains('active');
            const isPreHidden = pre && (pre.style.display === 'none' || pre.style.display === '');

            if (isBeautifiedActive || isPreHidden) {
                // 显示的是美化格式，移除原始 pre 标签
                if (pre) pre.remove();

                // 处理JSON美化格式：将kv-row转换为带格式的文本
                const jsonResult = beautified.querySelector('.json-result');
                if (jsonResult) {
                    const kvRows = jsonResult.querySelectorAll('.kv-row');
                    if (kvRows.length > 0) {
                        let formattedText = '';
                        kvRows.forEach(row => {
                            const key = row.querySelector('.kv-key')?.textContent || '';
                            const val = row.querySelector('.kv-val')?.textContent || '';
                            formattedText += `${key}: ${val}\n`;
                        });
                        // 用格式化文本替换wrapper
                        const textNode = document.createTextNode(formattedText.trim());
                        wrapper.replaceWith(textNode);
                        return;
                    }

                    // 处理数组列表格式
                    const compactList = jsonResult.querySelector('.json-compact-list');
                    if (compactList) {
                        const items = Array.from(compactList.querySelectorAll('li'));
                        const listText = items.map(li => li.textContent).join(', ');
                        const textNode = document.createTextNode(listText);
                        wrapper.replaceWith(textNode);
                        return;
                    }
                }

                // 如果没有特殊格式，保留beautified的文本内容
                const textNode = document.createTextNode(beautified.textContent || '');
                wrapper.replaceWith(textNode);
            } else {
                // 显示的是原始格式，移除beautified，保留pre
                if (beautified) beautified.remove();
                // 用pre的内容替换wrapper
                const codeText = pre.querySelector('code')?.textContent || pre.textContent || '';
                const textNode = document.createTextNode(codeText);
                wrapper.replaceWith(textNode);
            }
        });

        // 获取纯文本内容
        const textContent = clone.innerText || clone.textContent;

        // 使用Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textContent).then(() => {
                showToast('已复制到剪贴板');
            }).catch(err => {
                console.error('复制失败:', err);
                showToast('复制失败');
            });
        } else {
            // 降级方案:使用传统方法
            const textarea = document.createElement('textarea');
            textarea.value = textContent;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('已复制到剪贴板');
            } catch (err) {
                console.error('复制失败:', err);
                showToast('复制失败');
            }
            document.body.removeChild(textarea);
        }
    }

    // 公共API
    const N8NChatWidget = {
        init: function(userConfig) {
            // 检查必要的依赖
            if (typeof marked === 'undefined') {
                console.warn('N8N Chat Widget: marked.js is not loaded. Markdown rendering will be disabled.');
            }
            if (typeof DOMPurify === 'undefined') {
                console.warn('N8N Chat Widget: DOMPurify is not loaded. XSS protection will be disabled.');
            }

            // 检查必填配置
            if (!userConfig.webhookUrl) {
                throw new Error('N8N Chat Widget: webhookUrl is required');
            }

            // 合并配置
            config = Object.assign({}, DEFAULT_CONFIG, userConfig);

            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    initWidget();
                });
            } else {
                initWidget();
            }
        },

        open: function() {
            if (!isOpen) toggleChat();
        },

        close: function() {
            if (isOpen) closeChat();
        },

        toggle: function() {
            toggleChat();
        },

        sendMessage: function(message) {
            const input = document.getElementById('n8nChatInput');
            if (input) {
                input.value = message;
                sendMessage();
            }
        },

        removeFile: function(index) {
            removeFile(index);
        },

        // 历史管理方法
        loadChat: function(index) {
            loadChatByIndex(index);
        },

        deleteChat: function(event, index) {
            deleteChatByIndex(event, index);
        },

        newChat: function() {
            startNewChat();
        },

        toggleHistory: function() {
            toggleHistorySidebar();
        },

        clearHistory: function() {
            if (confirm('确定要清空所有历史记录吗？')) {
                chatHistory = [];
                saveChatHistory();
                renderHistoryList();
                showToast('历史记录已清空');
            }
        }
    };

    function initWidget() {
        // 添加样式
        document.head.appendChild(createStyles());

        // 添加HTML
        document.body.appendChild(createWidgetHTML());

        // 初始化事件
        initEventListeners();

        // 初始化窗口调整大小
        initWindowResize();

        // 加载历史记录
        loadChatHistory();

        // 生成会话ID
        currentSessionId = generateSessionId();

        // 初始化消息容器状态（空/非空）
        updateMessagesContainerState();
    }

    // 根据是否有消息，切换消息容器的布局状态
    function updateMessagesContainerState() {
        const container = document.getElementById('n8nChatMessages');
        if (!container) return;
        const hasMessage = !!container.querySelector('.n8n-chat-message');
        const hasEmpty = !!container.querySelector('.n8n-chat-empty');

        // 首先移除两种状态类，避免残留
        container.classList.remove('has-messages', 'is-empty');

        if (hasMessage) {
            container.classList.add('has-messages');
        } else if (hasEmpty || !hasMessage) {
            container.classList.add('is-empty');
        }
    }

    // 导出到全局
    window.N8NChatWidget = N8NChatWidget;

})(window);
