# 临时邮箱客户端

一个简洁的临时邮箱客户端，支持多个临时邮箱服务，无需 CORS 代理即可在浏览器中直接使用。

## 功能特性

- ✅ 支持两个临时邮箱服务
  - **Maildrop**: 完全自定义邮箱名
  - **Mail.gw**: 随机生成邮箱
- ✅ 实时查看收件箱
- ✅ 查看邮件详情（HTML/纯文本切换）
- ✅ 一键复制邮箱地址
- ✅ 现代化界面设计
- ✅ 支持 CORS，可直接在浏览器中使用
- ✅ 无需后端服务器

## 快速开始

### 本地运行

由于浏览器的 CORS 安全限制，需要通过本地服务器运行：

```bash
# 使用 Python 3
python -m http.server 8000

# 或使用 Node.js
npx http-server -p 8000

# 然后访问 http://localhost:8000
```

### GitHub Pages 部署

直接将项目推送到 GitHub，启用 GitHub Pages 即可在线使用。

## 服务商说明

### Maildrop
- **邮箱生成**: 客户端完全自定义
- **邮箱格式**: `{自定义名称}@maildrop.cc`
- **认证**: 无需认证
- **CORS**: ✅ 支持
- **特点**: 可以使用任意符合规则的邮箱名

### Mail.gw
- **邮箱生成**: API 随机生成
- **邮箱格式**: `{随机}@{可用域名}`
- **认证**: 需要 Token（自动获取）
- **CORS**: ✅ 支持
- **特点**: 
  - 完全免费
  - 无需注册
  - 支持多个域名
- **官方文档**: https://docs.mail.tm/

## 注意事项

1. 临时邮箱仅用于测试、注册验证等非敏感场景
2. 不要用于接收敏感信息
3. 邮件会自动删除
4. 任何人都可以访问这些邮箱

## 技术栈

- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API

## 文件结构

```
.
├── index.html          # 主页面
├── style.css           # 样式文件
├── app.js              # 应用逻辑
├── README.md           # 说明文档
└── .gitignore          # Git 忽略文件
```

## 浏览器支持

- Chrome/Edge (推荐)
- Firefox
- Safari

## 许可证

MIT License
