# N8N Chat Widget

强大的可嵌入式 AI 聊天组件,为你的网站添加 AI 对话能力。**🔗[配置工具](https://flintttan.github.io/n8n-chat-widget/)**

## ✨ 特性

- 💬 **流式响应** - 支持实时显示 AI 响应内容
- 📝 **Markdown 渲染** - 自动渲染消息中的 Markdown 格式
- 📎 **文件上传** - 支持图片等文件上传功能
- 📚 **历史记录** - 自动保存对话历史,支持切换查看
- 📱 **响应式设计** - 自适应移动端和桌面端
- 🎨 **主题定制** - 支持自定义颜色主题
- 🔄 **窗口调整** - 支持拖拽调整窗口大小

## 🚀 快速开始

### 1. 引入必要的依赖库

```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
```

### 2. 引入 N8N Chat Widget

```html
<script src="https://cdn.jsdelivr.net/gh/flintttan/n8n-chat-widget@v1.0.0/n8n-chat-widget.js"></script>
```

### 3. 初始化组件

```html
<script>
  N8NChatWidget.init({
    webhookUrl: 'http://your-n8n-webhook-url',
    title: 'AI助手',
    description: '智能问答'
  });
</script>
```

### 完整示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的网站 - AI助手</title>
</head>
<body>
    <h1>欢迎来到我的网站</h1>

    <!-- 引入依赖 -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>

    <!-- 引入组件 -->
    <script src="https://cdn.jsdelivr.net/gh/flintttan/n8n-chat-widget@v1.0.0/n8n-chat-widget.js"></script>

    <!-- 初始化 -->
    <script>
      N8NChatWidget.init({
        webhookUrl: 'http://your-n8n-webhook-url',
        title: 'AI助手',
        description: '智能问答',
        placeholder: '请输入您的问题...',
        enableFileUpload: true,
        enableHistory: true
      });
    </script>
</body>
</html>
```

## 🛠️ 配置工具

我们提供了一个可视化的配置生成器,让你可以轻松自定义聊天组件的外观和功能:

**🔗 访问配置工具: [https://flintttan.github.io/n8n-chat-widget/](https://flintttan.github.io/n8n-chat-widget/)**

配置工具提供:
- 📝 可视化表单配置
- 👁️ 实时预览效果
- 📋 一键复制代码
- 💾 导入/导出配置
- 📱 多设备预览模式

## ⚙️ 配置参数

### 基础配置

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `webhookUrl` | string | 是 | - | N8N webhook 地址 |

### 文案配置

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `title` | string | 否 | 'AI助手' | 聊天窗口标题 |
| `description` | string | 否 | '智能问答' | 聊天窗口副标题 |
| `placeholder` | string | 否 | '请输入您的问题...' | 输入框占位文本 |
| `emptyStateTitle` | string | 否 | '开始对话' | 空状态标题 |
| `emptyStateDescription` | string | 否 | '我可以帮助您解答问题' | 空状态描述 |
| `sendButtonText` | string | 否 | '发送' | 发送按钮文本 |
| `newChatButtonText` | string | 否 | '新对话' | 新对话按钮文本 |

### 颜色配置

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `primaryColor` | string | 否 | '#0A1F2A' | 主色调(深蓝) |
| `primaryColorLight` | string | 否 | '#1A3A44' | 主色调(浅色) |
| `accentColor` | string | 否 | '#FF7557' | 强调色(橙红) |
| `backgroundColor` | string | 否 | '#F8FAFA' | 背景色 |
| `surfaceColor` | string | 否 | '#FFFFFF' | 表面颜色(消息框背景) |
| `highlightColor` | string | 否 | '#FF1D5E' | 高亮色(浮动按钮背景) |
| `textColor` | string | 否 | '#111827' | 主文本颜色 |
| `textColorLight` | string | 否 | '#374151' | 次要文本颜色 |
| `textColorMuted` | string | 否 | '#6B7280' | 柔和文本颜色 |

### 布局配置

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `position` | string | 否 | 'bottom-right' | 位置: 'bottom-right' \| 'bottom-left' |
| `buttonSize` | number | 否 | 56 | 浮动按钮大小(px) |
| `chatWidth` | number | 否 | 420 | 聊天窗口宽度(px) |
| `chatHeight` | number | 否 | 600 | 聊天窗口高度(px) |

### 功能配置

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `enableFileUpload` | boolean | 否 | true | 是否允许上传文件 |
| `fileUploadTypes` | string | 否 | 'image' | 文件上传类型: 'image' \| 'pdf' \| 'csv' \| 'all' 或自定义 MIME 类型 |
| `enableHistory` | boolean | 否 | true | 是否启用历史记录 |
| `maxHistoryItems` | number | 否 | 50 | 最大历史记录数 |
| `enableResize` | boolean | 否 | true | 是否启用窗口调整大小 |

### 高级配置

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `customHeaders` | object | 否 | {} | 自定义 HTTP 请求头,例如: `{ 'X-Custom-Token': 'abc123' }` |
| `buttonIcon` | string | 否 | '💬' | 浮动按钮图标(Emoji 或文本) |
| `closeIcon` | string | 否 | '✕' | 关闭按钮图标 |
| `zIndex` | number | 否 | 9999 | 组件层级 |

## 🔗 CDN 地址

### JavaScript 文件

**最新版本 (v1.0.0):**
```
https://cdn.jsdelivr.net/gh/flintttan/n8n-chat-widget@v1.0.0/n8n-chat-widget.js
```

**开发版本 (main 分支):**
```
https://cdn.jsdelivr.net/gh/flintttan/n8n-chat-widget@main/n8n-chat-widget.js
```

### 依赖库

**Marked.js (Markdown 解析):**
```
https://cdn.jsdelivr.net/npm/marked/marked.min.js
```

**DOMPurify (XSS 防护):**
```
https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js
```

## 📖 如何创建 N8N Webhook

### 1. 登录 N8N 控制台
访问你的 N8N 实例并登录

### 2. 创建新工作流
点击"新建工作流"按钮

### 3. 导入 JSON 模板
点击右上角的"..."菜单,选择"导入工作流" → "从剪贴板导入",粘贴以下 JSON:

<details>
<summary>点击展开 N8N 工作流 JSON 模板</summary>

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "chat",
        "responseMode": "streaming",
        "options": {
          "allowedOrigins": "*",
          "binaryPropertyName": "data",
          "rawBody": false
        }
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [-224, -112],
      "id": "7b6f95fe-e54a-460a-99d8-904e55290711",
      "name": "Webhook",
      "webhookId": "chat-webhook"
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "={{ $json.chatInput }}",
        "options": {
          "systemMessage": "你是一个AI 助手。",
          "passthroughBinaryImages": true
        }
      },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 2.2,
      "position": [0, -112],
      "id": "83098af8-685d-4116-96b1-fe407586586a",
      "name": "AI Agent"
    },
    {
      "parameters": {
        "model": {
          "__rl": true,
          "mode": "list",
          "value": "gpt-4o-mini"
        },
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "typeVersion": 1.2,
      "position": [8, 112],
      "id": "26ab2518-889f-4614-9f0c-04b656113483",
      "name": "OpenAI Chat Model",
      "credentials": {
        "openAiApi": {
          "id": "YOUR_OPENAI_CREDENTIAL_ID",
          "name": "OpenAi account"
        }
      }
    },
    {
      "parameters": {
        "contextWindowLength": 10
      },
      "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
      "typeVersion": 1.3,
      "position": [136, 112],
      "id": "362100c2-f454-4e75-96cd-6f7b9debcf9c",
      "name": "Local Memory"
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "AI Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "OpenAI Chat Model": {
      "ai_languageModel": [
        [
          {
            "node": "AI Agent",
            "type": "ai_languageModel",
            "index": 0
          }
        ]
      ]
    },
    "Local Memory": {
      "ai_memory": [
        [
          {
            "node": "AI Agent",
            "type": "ai_memory",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

</details>

### 4. 配置 OpenAI 凭证
在"OpenAI Chat Model"节点中配置你的 OpenAI API 密钥

### 5. 激活工作流
点击右上角的开关,激活工作流

### 6. 获取 Webhook URL
点击"Webhook"节点,复制"Production URL"地址,填入到组件的 `webhookUrl` 配置中

💡 **提示**: 确保在 Webhook 节点中设置了"允许的来源"为 "*" 或你的网站域名,以允许跨域请求。

## 📝 API 方法

初始化后,可以通过 JavaScript 调用以下方法:

```javascript
// 打开聊天窗口
N8NChatWidget.open();

// 关闭聊天窗口
N8NChatWidget.close();

// 切换聊天窗口
N8NChatWidget.toggle();

// 发送消息
N8NChatWidget.sendMessage('你好');

// 打开历史记录
N8NChatWidget.toggleHistory();

// 开始新对话
N8NChatWidget.newChat();

// 清空历史记录
N8NChatWidget.clearHistory();
```

## 🎨 自定义样式示例

### 深色主题

```javascript
N8NChatWidget.init({
  webhookUrl: 'http://your-n8n-webhook-url',
  primaryColor: '#1a1a1a',
  primaryColorLight: '#2a2a2a',
  accentColor: '#4a9eff',
  backgroundColor: '#0d1117',
  surfaceColor: '#161b22',
  highlightColor: '#58a6ff',
  textColor: '#c9d1d9',
  textColorLight: '#8b949e',
  textColorMuted: '#6e7681'
});
```

### 品牌定制

```javascript
N8NChatWidget.init({
  webhookUrl: 'http://your-n8n-webhook-url',
  title: '客服助手',
  description: '随时为您服务',
  primaryColor: '#your-brand-color',
  highlightColor: '#your-accent-color',
  buttonIcon: '🤖',
  position: 'bottom-left'
});
```

## 🌐 浏览器兼容性

- Chrome/Edge (最新版本)
- Firefox (最新版本)
- Safari (最新版本)
- 移动端浏览器

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

## 📞 联系方式

如有问题或建议,请通过以下方式联系:

- GitHub Issues: [https://github.com/flintttan/n8n-chat-widget/issues](https://github.com/flintttan/n8n-chat-widget/issues)

---

Made with ❤️ by flintttan
