# dsh-progress — DSH 浮动水球进度指示器

在 [DSH (DeepSeek Harness)](https://www.npmjs.com/package/@deepseek-ai/dsh) Web GUI 上
悬浮一枚可拖动的玻璃水球，实时显示各后台任务的进度：水位 = 进度、水体颜色 = 莫兰迪色带
（蓝→绿→橘→红→紫黑，每 20% 一段）、外圈光晕与水色联动、高进度银灰高亮、心跳超时提示。

## 特性

- **心跳文件协议**：`<工作区>/.progress/<task-id>.progress.json`，`done/total/heartbeat`
  等字段，超 5 分钟未刷新标 stale（只提示，不劫持配色）；
- **莫兰迪色带水位**：整球单色随进度换段，颜色平滑过渡；
- **三层浪面**：深/浅/淡三层大浪按"近深远淡"层序错落（层高差 2/3px），深浪即水体
  本体（实色、与水位浑然一体零接缝），浪线均值锚定真实水位（±8px 振荡），
  纯 GPU 合成动画零布局开销；
- **光晕联动**：环形光晕永远等于当前指标色带色（α .72、5px 羽化、1px 间隙），
  圆形几何不依赖 border-radius（宿主样式覆盖免疫）；
- **银灰高亮**：进度 ≥73% 时数字与说明文字变银灰（#C9CBD1/#BFC1C8）；
- **拖动手感**：按住即跟手 + 提起动效（放大浮起、光晕增亮），抓取环外扩命中区，
  位置持久化 + 双向钳制永不出屏；
- **双击展开**面板查看 CPU / 内存 / 各任务明细。

## 安装

```bash
# 方式一：从 Release 下载 tgz 后接入 dsh web 配置目录（symlink 或 npm i）
npm i dsh-progress-4.8.5.tgz

# 方式二：本仓库直装
git clone https://github.com/fuguier001/dsh-progress.git
ln -s "$(pwd)/dsh-progress" ~/.dsh/profiles/web/node_modules/dsh-progress
```

依赖 DSH 客户端运行时（`@deepseek-ai/dsh-client-runtime`），随 dsh web 启动自动加载。

MIT License.
