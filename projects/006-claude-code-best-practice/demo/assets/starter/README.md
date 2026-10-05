# 变更审查学习示例包

本研究页原创的三份文件，用于展示如何把一次审查要求整理成可复用入口。
它借鉴 claude-code-best-practice 的组织方式，未在 Claude Code 中执行验证。

## 使用

1. 按实际项目填写 CLAUDE.example.md 的目录和检查命令，再合并到现有 CLAUDE.md。
2. 把 review-change.SKILL.md 保存为 .claude/skills/review-change/SKILL.md。
   ZIP 示例包已放到这个建议路径；单文件下载需要自行放置。
3. 按项目调整 DELIVERY-CHECKLIST.md，并核对运行环境和工具权限。
4. 在 Claude Code 中主动调用 /review-change，给出明确的修改范围。
5. 核对实际发现与验证记录。

disable-model-invocation: true 表示此示例由用户主动调用。
示例未配置权限白名单；文字审查意图不等同于程序级只读限制。
只借鉴需要的文件与内容，避免覆盖项目已有配置。

## 依据与归属

- 上游实践资料：https://github.com/shanraisshan/claude-code-best-practice
- 本次研究 SHA：870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82
- 上游许可：MIT，Copyright (c) 2025-2026 Shayan Rais
- 当前 Skill 机制：https://code.claude.com/docs/en/skills

这些文件是本地原创教学内容，没有打包上游程序或第三方依赖。
