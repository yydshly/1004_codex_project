# 文档构建依赖

Marked 18.1.0，MIT 许可；原始许可保留在 LICENSE。构建脚本从本地 marked.esm.js 导入，浏览器不加载此库，无需 npm 安装或在线 CDN。

- 包地址：https://registry.npmjs.org/marked/-/marked-18.1.0.tgz
- 官方文档：https://marked.js.org/
- 压缩包 SHA256：39a404686c55fc2d862216e0cbb70f6bedc456adaeb5fe57b642036455f9ffc0
- 原始文件：package/lib/marked.esm.js 与 package/LICENSE，直接复制未改动。
- 运行环境：Node.js 20 或更高；本次本地构建使用 Node.js 22.15.0。

仅解析项目中登记的 Markdown。构建器转义原始 HTML，限制链接协议，并将本地文档和证据引用映射到派生网页。
