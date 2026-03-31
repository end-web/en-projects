# Vue3 英语练习站

一个基于 Vue 3 + Vite + TypeScript + Element Plus 的英语填空练习站。

## 功能特性

- 课程和难度双维度选择（1-10）
- 中文题干 + 英文逐词填空
- 朗读、显示答案、提交判题
- 答对后自动进入下一题
- iOS 风格界面

## 技术栈

- Vue 3
- Vite
- TypeScript
- Pinia
- Vue Router
- Element Plus

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址由 Vite 输出（通常为 `http://localhost:5173`）。

## 构建与预览

```bash
npm run build
npm run preview
```

## 部署到 GitHub Pages

本仓库已包含 GitHub Actions 工作流：

- `CI`：每次 push/PR 自动安装依赖并构建校验
- `Deploy Pages`：推送到 `main` 后自动构建并发布静态站

首次启用时，请在仓库设置中确认：

- `Settings` -> `Pages` -> `Build and deployment`
- `Source` 选择 `GitHub Actions`

部署成功后，站点地址通常为：

- `https://end-web.github.io/en-projects/`

## 项目结构

- `src/views/PracticeView.vue`：主页面与业务编排
- `src/components/CourseSidebar.vue`：课程与难度选择
- `src/components/AnswerPanel.vue`：题目与填空区域
- `src/components/BottomActions.vue`：底部操作按钮
- `src/stores/practice.ts`：核心状态与提交流程
- `src/data/questions.ts`：本地题库

## 扩展题库

在 `src/data/questions.ts` 的 `templateByDifficulty` 中追加中英句子即可：

```ts
{
  zh: "这是中文句子。",
  en: "This is an English sentence."
}
```

系统会按课程与难度自动生成练习题。

## 朗读说明

项目使用浏览器 Web Speech API：

- 通过 `speechSynthesis.speak()` 朗读英文句子
- 若系统缺少英语语音包，会出现提示
- 可在 `PracticeView.vue` 调整 `rate`、`pitch`、`lang`

## 仓库地址

- GitHub: [https://github.com/end-web/en-projects.git](https://github.com/end-web/en-projects.git)
