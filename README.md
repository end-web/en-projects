# Vue3 英语练习站

一个基于 Vue3 + Element Plus 的英语填空练习站，支持：

- 左侧课程/难度选择（1-10）
- 中间中文题干 + 英文逐字填空
- 底部朗读、答案、提交
- 提交正确后自动进入下一题
- iOS 风格界面

## 1. 安装与启动

```bash
npm install
npm run dev
```

## 2. 目录说明

- `src/views/PracticeView.vue`：主页面与业务编排
- `src/components/CourseSidebar.vue`：课程与难度选择
- `src/components/AnswerPanel.vue`：题目与填空区域
- `src/components/BottomActions.vue`：底部操作按钮
- `src/stores/practice.ts`：核心状态与提交逻辑
- `src/data/questions.ts`：本地题库

## 3. 怎么扩展题库

在 `src/data/questions.ts` 的 `templateByDifficulty` 中追加中英句子即可：

```ts
{
  zh: "这是中文句子。",
  en: "This is an English sentence."
}
```

系统会自动按课程 1-10 与难度 1-10 生成题目。

## 4. 朗读功能说明

当前使用浏览器 Web Speech API：

- 调用 `speechSynthesis.speak()` 读英文答案
- 若系统无英语语音包，会给出提示
- 可在 `PracticeView.vue` 调整 `rate/pitch/lang`

## 5. 常见问题

1. **点击朗读没有声音**  
   请检查系统音量、浏览器权限，以及是否安装英语语音包。

2. **题目太少**  
   直接在 `templateByDifficulty` 每个难度添加更多句子。

3. **想接后端题库**  
   将 `questions` 改为 API 拉取并映射为 `Question` 类型即可。
