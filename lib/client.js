// dsh-progress client v5.10: water-bubble badge + glass panel + sys meters + done-fold.
// v5.30: 波浪三档测试台——右键水球循环 B(2层×1.4提浓)/A(3层·球径22%)/C(3层·球径30%)，
//        球下浮标签 1.8s，localStorage 记档；用户三选一后固化胜出档并移除测试台。
// v5.31: 色阶收敛为深/浅/淡三层浪（用户裁定：颜色只留三档深浅，全大浪）；
// v5.32: 三层浪底边全贴水位线+实色化（水下零平直边、表观色稳定）；v5.33: 近深远淡层序。
// v5.34: 浪层定稿 B 档（峰谷16px·深浅淡·近深远淡）；v5.35: 浪体合一——深浪拉高贯穿球体即水体本体。
// v5.15: 隐藏 SVG 色环（v5.14 光环脱开后单独显形，用户要求隐藏）；
//        球缘回归玻璃盘边 40px，光环带按 43→46.5→51px 重校准（间隙 3px，羽化 5px）。
// v5.14: 光晕改"脱开光环"：与球边留间隙，环带峰值 α.5（随进度变色），羽化 5px 收零。
// v5.13: 光晕改径向渐变圆（circle 67px 显式半径，同色羽化+下沉阴影两层），
//        玻璃底色移入 clip-path 容器，外层 div 不再携带 background/border/box-shadow——
//        在 border-radius 失效的宿主环境（用户实测）全组件仍为正圆。
// v5.12: 形状结构化加固——外环改 SVG 矢量圆(cx44 cy44 r42.6 stroke2.6)，水体容器加
//        clip-path:circle(50%)。两者都不经过 border-radius，任何宿主 CSS 干扰下
//        水球在结构上不可能呈现圆角方形。（用户以手绘圆对比提出异议后采纳的兜底）
// v5.11: 边框改 2px 且颜色=当前水色带，外加同色 15px 羽化光晕（stale 时整体转玫瑰色）；
//        用户截图实测：球边缘 R=40.55 σ=1.43px，用户手画圆 R=42.38 σ=1.07px，同心，
//        半径差 1.82px 即"未重合"的全部原因——两轮廓均为正圆。
// v5.10: 按用户反馈移除右上角 stale 红点（中断信息保留在描边/tooltip/面板标记），
//        球体质感恢复初版参数（阴影 34px/.5、高光 .14）；
//        波浪加固：近白浪花（提亮 80%，α .8/.55）+ 振幅翻倍 + 波带 14→20px——
//        经本地 Qwen3-VL 两轮读图复验（旧版被判"完全平滑"），现起伏 5px→11px。
// v5.9: 水体改为"整体单色"——按当前进度段整球同色（蓝/绿/橘/红/紫黑），
//        不再做球内底→顶渐变；波浪改同色系提亮（+45% 白）并提高透明度，
//        明显度恢复并超过 v5.3。
// v5.8: 修"肉粉色没换"——根因是 stale 告警态把整球水覆盖成柔玫红（旧新两版同色），
//        现在水色永远走莫兰迪色带；stale 改用描边 + 顶部小红点提示，不淹没水色。
//        红段锚点 #B97A72→#A9665C（陶土砖红，避开肉粉调）。
// v5.7: 莫兰迪进度渐变——颜色随百分比推进：蓝(0-20)→绿(21-40)→橘(41-60)→红(61-80)→紫黑(81-100)。
//        水球为贴着球壁的连续五段竖向渐变（水位升到哪，颜色就走到哪）；
//        任务条/CPU/内存条用 JS 按同一色带取色（solid），与水面同色同步。
//        四套可选配色与切换 UI（圆点/右键）按用户要求移除。
// v5.5: 水位跟随轮换指标（总进度/CPU/内存各自的百分比），数字与水面始终一致。
// Data: package RPC (host.call) with /dsh-progress/data fetch fallback (installed webServer route).
// 2026-09-12 事故修复：installed 模块加载器（window.__ModuleLoader__）没有动态运行器的
// `styles` 全局，旧代码一张样式表都插不进去 —— 水球/玻璃板退化为无定位透明块，
// 静态流文档盖在侧边栏会话列表上吃掉所有点击（"无法选择原有对话框"）。
// 改为标准 DOM <style> 注入（与 dsh-context 同款），disposer 交还 ctx.effect 收管。
window.__ModuleLoader__.load({
  id: "dsh-progress",
  factory: (require) => {
  const React = require("react");
  const apply = (ctx) => {
    const slots = ctx.slots !== undefined ? ctx.slots : ctx.get && ctx.get('slots')
    const timer = ctx.timer !== undefined ? ctx.timer : ctx.get && ctx.get('timer')
    if (!slots) {
      if (typeof console !== 'undefined') console.error('[dsh-progress] slots service missing')
      return
    }

    const CSS_RULES = [
      // ── 中性色 + 柔化状态色（莫兰迪低饱和，无主题切换）──
      '.dshp-bub,.dshp-panel{',
      '--dshp-bub-bd:rgba(255,255,255,.16);--dshp-glass-bd:rgba(255,255,255,.12);',
      '--dshp-line:rgba(255,255,255,.08);--dshp-line-soft:rgba(255,255,255,.05);',
      '--dshp-text:#dde6f0;--dshp-dim:rgba(221,230,240,.62);--dshp-faint:rgba(221,230,240,.48);--dshp-strong:#f0f5fb;',
      '--dshp-track:rgba(255,255,255,.07);--dshp-done-fill:#8c959f;',
      '--dshp-bub-shadow:0 10px 34px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.14);',
      '--dshp-panel-shadow:0 20px 48px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08);',
      '--dshp-run:#9cc7a9;--dshp-run-bg:rgba(140,190,158,.12);--dshp-run-bd:rgba(140,190,158,.32);',
      '--dshp-done:#97a1ab;--dshp-done-bg:rgba(148,158,168,.12);--dshp-done-bd:rgba(148,158,168,.28);',
      '--dshp-pause:#d3b98a;--dshp-pause-bg:rgba(214,184,138,.12);--dshp-pause-bd:rgba(214,184,138,.32);',
      '--dshp-stale:#dd9d9d;--dshp-stale-bg:rgba(226,150,150,.13);--dshp-stale-bd:rgba(226,150,150,.4);',
      '--dshp-err:#d98f8f;--dshp-err-bg:rgba(226,140,140,.16);--dshp-err-bd:rgba(226,140,140,.4);',
      '--dshp-bub-1:rgba(82,96,116,.88);--dshp-bub-2:rgba(22,28,38,.88);',
      '--dshp-glass-1:rgba(42,50,64,.86);--dshp-glass-2:rgba(20,25,34,.85);',
      '}',
      // ── 水球 ──
      // v5.29: 外层 .dshp-bub 只承载定位与拖动位移（transform 直写、无过渡、will-change 提层），
      // 缩放/浮起/hover 全部内移到 .dshp-bublift 包装层——位移瞬跳与缩放动画彻底解耦，
      // 松手清 transform 时不会把位移一并动画出去（甩飞 bug 免疫）。
      '.dshp-bub{position:fixed;z-index:2147482000;width:88px;height:88px;border-radius:50%;cursor:grab;user-select:none;will-change:transform}',
      // v5.13: 玻璃底色移入 clip-path 裁剪容器；外层 div 不再有 background/border/box-shadow，
      // 避免 border-radius 失效时方形漏出（用户环境实测该问题）
      // v5.27: 抓取感——按下即"提起"：球放大浮起 + 光晕增亮，松手回弹。
      // v5.29: 效果移到 bublift 层；不用 box-shadow（用户环境 border-radius 失效会渲染方形，v5.13 实证）。
      '.dshp-bublift{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transition:transform .16s cubic-bezier(.25,1,.5,1)}',
      '.dshp-bub:hover .dshp-bublift{transform:scale(1.06)}',
      '.dshp-bub.drag{cursor:grabbing}',
      '.dshp-bub.drag .dshp-bublift{transform:scale(1.1)}',
      '.dshp-bub.drag .dshp-halo{filter:brightness(1.25) saturate(1.12)}',
      '@media (prefers-reduced-motion:reduce){.dshp-bublift{transition:none}.dshp-bub.drag .dshp-halo{filter:none}}',
      '.dshp-halo{position:absolute;left:50%;top:50%;width:130px;height:130px;transform:translate(-50%,-50%);pointer-events:none;transition:filter .16s cubic-bezier(.25,1,.5,1)}',
      '.dshp-grab{position:absolute;inset:-12px;border-radius:50%;cursor:grab}',
      // 避免 border-radius 失效时方形漏出（用户环境实测该问题）
      '.dshp-bubclip{position:absolute;inset:4px;border-radius:50%;clip-path:circle(50%);overflow:hidden;background:radial-gradient(circle at 32% 24%,var(--dshp-bub-1),var(--dshp-bub-2))}',
      // 水体为"整体单色"：颜色由 JS 按当前水位在莫兰迪色带取值（inline 注入），
      // v5.35: 水体 div 退化为纯高度动画载体（透明，无背景）——水体本体 = 深浪 SVG 拉高贯穿。
      '.dshp-water{position:absolute;left:0;bottom:0;width:100%;transition:height .8s cubic-bezier(.3,.7,.3,1)}',
      // v5.34: 波层几何（top/height/animation/opacity）由 WAVE 配置 inline 注入，
      // 这里只留波带公共骨架（定稿参数见 WAVE 常量注释）。
      '.dshp-wave{position:absolute;left:0;width:200%;display:block}',
      '.dshp-bubnum{position:relative;font-size:22px;font-weight:800;color:var(--dshp-strong);font-variant-numeric:tabular-nums;text-shadow:0 1px 4px rgba(0,0,0,.4),0 0 10px rgba(0,0,0,.28);letter-spacing:.01em;pointer-events:none}',
      // v5.18: 百分号恢复原字号（v5.17 小号仅作用于小数部分 ".x"）。
// v5.17: 小数部分半号（用户裁定：大项目小数变化慢，降一级视觉权重）
      '.dshp-bubdec{font-size:.5em;font-weight:600;opacity:.92}',
      // v5.19: >80% 紫黑段水体暗，数字与下方说明文字转银灰保持可读（CPU/内存/总进度通用，按各自 hgt 触发）
      '.dshp-bubnum.dshp-hi{color:#C9CBD1;text-shadow:0 1px 4px rgba(0,0,0,.55),0 0 10px rgba(0,0,0,.35)}',
      '.dshp-bubsub.dshp-hi{color:#BFC1C8;text-shadow:0 1px 3px rgba(0,0,0,.5)}',
      '.dshp-bubsub{position:relative;font-size:9.5px;font-weight:600;color:var(--dshp-dim);text-shadow:0 1px 3px rgba(0,0,0,.45);letter-spacing:.14em;margin-top:1px;pointer-events:none}',
      '@keyframes dshp-wave{from{transform:translateX(0)}to{transform:translateX(-50%)}}',
      '.dshp-fx{position:relative;text-align:center;line-height:1.05}',
      '.dshp-fx-fade{animation:dshp-fx-fade .55s ease both}',
      '@keyframes dshp-fx-fade{from{opacity:0}to{opacity:1}}',
      '.dshp-fx-fly{animation:dshp-fx-fly .55s cubic-bezier(.2,.8,.3,1) both}',
      '@keyframes dshp-fx-fly{from{opacity:0;transform:translateX(-46px)}to{opacity:1;transform:none}}',
      '.dshp-fx-pop{animation:dshp-fx-pop .5s cubic-bezier(.3,1.4,.4,1) both}',
      '@keyframes dshp-fx-pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}',
      '.dshp-fx-blinds{animation:dshp-fx-blinds .7s steps(7,end) both}',
      '@keyframes dshp-fx-blinds{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}',
      '.dshp-fx-boom{animation:dshp-fx-boom .6s ease both}',
      '@keyframes dshp-fx-boom{0%{opacity:0;transform:scale(1.8);filter:blur(8px)}60%{opacity:1;filter:blur(1px)}100%{opacity:1;transform:scale(1);filter:blur(0)}}',
      '.dshp-fx-flip{animation:dshp-fx-flip .6s ease both}',
      '@keyframes dshp-fx-flip{from{opacity:0;transform:perspective(300px) rotateY(90deg)}to{opacity:1;transform:perspective(300px) rotateY(0deg)}}',
      '.dshp-fx-drop{animation:dshp-fx-drop .55s cubic-bezier(.3,1.2,.4,1) both}',
      '@keyframes dshp-fx-drop{from{opacity:0;transform:translateY(-40px) rotate(-8deg)}to{opacity:1;transform:none}}',
      // ── 玻璃面板 ──
      '.dshp-panel{position:fixed;z-index:2147482000;will-change:transform;width:420px;max-height:66vh;border-radius:18px;overflow:hidden;backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);background:linear-gradient(165deg,var(--dshp-glass-1),var(--dshp-glass-2));border:1px solid var(--dshp-glass-bd);box-shadow:var(--dshp-panel-shadow);display:flex;flex-direction:column;color:var(--dshp-text);font-size:12px;animation:dshp-in .22s cubic-bezier(.2,.9,.3,1.2)}',
      '@keyframes dshp-in{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:none}}',
      '.dshp-head{display:flex;align-items:center;gap:9px;padding:12px 14px 10px;cursor:grab;user-select:none;border-bottom:1px solid var(--dshp-line);background:linear-gradient(180deg,rgba(255,255,255,.04),transparent)}',
      '.dshp-head.drag{cursor:grabbing}',
      '.dshp-head b{font-size:13px;letter-spacing:.03em}',
      '.dshp-head .sp{flex:1}',
      '.dshp-x{width:24px;height:24px;border-radius:7px;border:none;background:rgba(255,255,255,.08);color:var(--dshp-text);cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center;transition:background .15s}',
      '.dshp-x:hover{background:rgba(255,255,255,.16)}',
      // v4.8.0 归档质检：行内归档按钮 + 结果 toast
      '.dshp-arch{margin-left:auto;flex:none;width:18px;height:18px;border-radius:6px;border:none;background:transparent;color:var(--dshp-text);cursor:pointer;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center;opacity:.45;transition:opacity .15s,background .15s}',
      '.dshp-arch:hover{opacity:1;background:rgba(255,255,255,.14)}',
      '.dshp-toast{padding:7px 10px;margin:6px 0 2px;border-radius:10px;background:rgba(127,168,127,.14);border:1px solid rgba(127,168,127,.32);font-size:11.5px;line-height:1.5;word-break:break-all}',
      '.dshp-body{overflow-y:auto;padding:4px 14px 10px;scrollbar-width:thin}',
      '.dshp-body::-webkit-scrollbar{width:6px}',
      '.dshp-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:3px}',
      '.dshp-job{padding:9px 0;border-bottom:1px solid var(--dshp-line-soft)}',
      '.dshp-job:last-child{border-bottom:none}',
      '.dshp-j1{display:flex;align-items:center;gap:7px;margin-bottom:5px}',
      '.dshp-chip{font-size:10px;padding:1.5px 8px;border-radius:99px;font-weight:600;letter-spacing:.04em}',
      '.dshp-chip.run{background:var(--dshp-run-bg);color:var(--dshp-run);border:1px solid var(--dshp-run-bd)}',
      '.dshp-chip.done{background:var(--dshp-done-bg);color:var(--dshp-done);border:1px solid var(--dshp-done-bd)}',
      '.dshp-chip.pause{background:var(--dshp-pause-bg);color:var(--dshp-pause);border:1px solid var(--dshp-pause-bd)}',
      '.dshp-chip.stale{background:var(--dshp-stale-bg);color:var(--dshp-stale);border:1px solid var(--dshp-stale-bd);animation:dshp-blink 1.6s infinite}',
      '.dshp-chip.err{background:var(--dshp-err-bg);color:var(--dshp-err);border:1px solid var(--dshp-err-bd)}',
      '.dshp-jname{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;letter-spacing:.01em;color:var(--dshp-text)}',
      '.dshp-pct{font-variant-numeric:tabular-nums;color:var(--dshp-text);font-weight:700}',
      '.dshp-track{height:8px;border-radius:99px;background:var(--dshp-track);overflow:hidden;position:relative;box-shadow:inset 0 1px 2px rgba(0,0,0,.25)}',
      // 运行态填充色由 JS 按莫兰迪色带取当前百分比颜色（inline），类里只留兜底
      '.dshp-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#8fa8c4,#8fb096);position:relative;transition:width .6s cubic-bezier(.3,.7,.3,1),background .6s ease}',
      '.dshp-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.15) 50%,transparent 70%);background-size:200% 100%;animation:dshp-shine 2.6s linear infinite}',
      '.dshp-fill.done{background:var(--dshp-done-fill)}.dshp-fill.done::after,.dshp-fill.pause::after,.dshp-fill.stale::after{animation:none;opacity:0}',
      '.dshp-fill.pause{background:linear-gradient(90deg,#c2a06a,#d8bd8b)}',
      '.dshp-fill.stale{background:linear-gradient(90deg,#c58a8a,#dda6a6)}',
      '.dshp-j2{display:flex;gap:8px;margin-top:4px;color:var(--dshp-dim);font-size:11px;font-variant-numeric:tabular-nums}',
      '.dshp-j2 .n{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dshp-empty{padding:18px;text-align:center;color:var(--dshp-faint)}',
      '.dshp-sys{display:flex;gap:12px;align-items:center;padding:8px 14px;border-top:1px solid var(--dshp-line);background:rgba(0,0,0,.14);font-size:10.5px;color:var(--dshp-dim)}',
      '.dshp-sysb{flex:1;display:flex;flex-direction:column;gap:3px}',
      '.dshp-sysl{display:flex;justify-content:space-between;font-variant-numeric:tabular-nums}',
      '.dshp-syst{height:4px;border-radius:99px;background:var(--dshp-track);overflow:hidden}',
      '.dshp-sysf{height:100%;border-radius:99px;background:linear-gradient(90deg,#8fa8c4,#8fb096);transition:width .8s ease,background .8s ease}',
      '.dshp-sysf.hot{background:linear-gradient(90deg,#c2a06a,#d8bd8b)}',
      '.dshp-sysf.crit{background:linear-gradient(90deg,#c58a8a,#dda6a6)}',
      '@keyframes dshp-shine{0%{background-position:200% 0}100%{background-position:-200% 0}}',
      '@keyframes dshp-blink{0%,100%{opacity:1}50%{opacity:.55}}',
      // ── 浅色系统适配（莫兰迪色带本身居中明度，深浅通用，不另换水色）──
      '@media (prefers-color-scheme: light){',
      '.dshp-bub,.dshp-panel{',
      '--dshp-bub-bd:rgba(31,35,40,.14);--dshp-glass-bd:rgba(31,35,40,.12);',
      '--dshp-line:rgba(31,35,40,.08);--dshp-line-soft:rgba(31,35,40,.06);',
      '--dshp-text:#2c3138;--dshp-dim:rgba(44,49,56,.62);--dshp-faint:rgba(44,49,56,.5);--dshp-strong:#1c2128;',
      '--dshp-track:rgba(31,35,40,.09);--dshp-done-fill:#9aa4af;',
      '--dshp-bub-shadow:0 10px 34px rgba(31,35,40,.2),inset 0 1px 0 rgba(255,255,255,.9);',
      '--dshp-panel-shadow:0 20px 44px rgba(31,35,40,.16),inset 0 1px 0 rgba(255,255,255,.9);',
      '--dshp-run:#2f7d4f;--dshp-run-bg:rgba(46,138,92,.1);--dshp-run-bd:rgba(46,138,92,.35);',
      '--dshp-done:#57606a;--dshp-done-bg:rgba(87,96,106,.09);--dshp-done-bd:rgba(87,96,106,.3);',
      '--dshp-pause:#8a6a2a;--dshp-pause-bg:rgba(175,132,56,.12);--dshp-pause-bd:rgba(175,132,56,.35);',
      '--dshp-stale:#b34747;--dshp-stale-bg:rgba(200,70,70,.09);--dshp-stale-bd:rgba(200,70,70,.38);',
      '--dshp-err:#ab3d3d;--dshp-err-bg:rgba(200,60,60,.12);--dshp-err-bd:rgba(200,60,60,.38);',
      '--dshp-bub-1:rgba(255,255,255,.95);--dshp-bub-2:rgba(236,240,245,.92);',
      '--dshp-glass-1:rgba(252,253,255,.94);--dshp-glass-2:rgba(241,244,248,.93);',
      '}',
      '.dshp-x{background:rgba(31,35,40,.07);color:#1f2328}',
      '.dshp-x:hover{background:rgba(31,35,40,.14)}',
      '.dshp-arch:hover{background:rgba(31,35,40,.12)}',
      '.dshp-body::-webkit-scrollbar-thumb{background:rgba(31,35,40,.18)}',
      '.dshp-sys{background:rgba(31,35,40,.03)}',
      '.dshp-head{background:linear-gradient(180deg,rgba(31,35,40,.025),transparent)}',
      '}',
    ].join('\n')
    let styleDispose = null
    try {
      if (typeof document !== 'undefined' && document.head) {
        const tag = document.createElement('style')
        tag.setAttribute('data-dshp', 'v5')
        tag.textContent = CSS_RULES
        document.head.append(tag)
        styleDispose = () => { tag.remove() }
      }
    } catch (e) {}

    const h = React.createElement
    const POS_KEY = 'dshp.pos.v5'
    // v5.28: 位置钳制——双向边界（旧版只有上界，负坐标/小窗口下球出屏），
    // innerWidth 异常（挂载过早/嵌入态）时用安全回退值；坐标非数字时回默认位。
    const clampPos = (p) => {
      const vw = (window.innerWidth && window.innerWidth > 200) ? window.innerWidth : 1200
      const vh = (window.innerHeight && window.innerHeight > 200) ? window.innerHeight : 800
      const x = Number.isFinite(p.x) ? Math.max(8, Math.min(vw - 96, Math.round(p.x))) : Math.round(vw * 2 / 3)
      const y = Number.isFinite(p.y) ? Math.max(8, Math.min(vh - 96, Math.round(p.y))) : Math.round(vh / 5)
      return { x, y }
    }
    const loadPos = () => {
      try {
        const v = JSON.parse(localStorage.getItem(POS_KEY) || 'null')
        if (v && v.x != null) return clampPos(v)
      } catch (e) {}
      return clampPos({ x: window.innerWidth * 2 / 3, y: window.innerHeight / 5 })
    }
    const savePos = (p) => { try { localStorage.setItem(POS_KEY, JSON.stringify(p)) } catch (e) {} }

    // 莫兰迪进度色带：蓝(0-20)→绿(21-40)→橘(41-60)→红(61-80)→紫黑(81-100)
    // 锚点取各段中心（10/30/50/70/90）为纯色，段间线性过渡；与水球 CSS 渐变同源同值。
    const RAMP_STOPS = [
      [0, 112, 145, 178],
      [10, 112, 145, 178],   // 蓝 #7091B2
      [30, 143, 176, 150],   // 绿 #8FB096
      [50, 201, 154, 112],   // 橘 #C99A70
      [70, 169, 102, 92],    // 红 #A9665C（陶土砖红，刻意避开肉粉调）
      [90, 74, 63, 85],      // 紫黑 #4A3F55
      [100, 58, 50, 70],
    ]
    const rampChannels = (p) => {
      const x = Math.max(0, Math.min(100, Number(p) || 0))
      let i = 0
      while (i < RAMP_STOPS.length - 2 && x > RAMP_STOPS[i + 1][0]) i += 1
      const a = RAMP_STOPS[i], b = RAMP_STOPS[i + 1]
      const t = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0])
      return [1, 2, 3].map((k) => Math.round(a[k] + (b[k] - a[k]) * t))
    }
    const rampCss = (p) => { const c = rampChannels(p); return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')' }
    // 水体整体色（带透明度）与波浪色（同色系提亮，保证波形清晰可见）
    const rampRgba = (p, alpha) => { const c = rampChannels(p); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')' }
    const rampLight = (p, k, alpha) => {
      const c = rampChannels(p).map((v) => Math.round(v + (255 - v) * k))
      return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')'
    }

    const fmtBytes = (n) => {
      if (n >= 1e9) return (n / 1e9).toFixed(2) + ' GB'
      if (n >= 1e6) return (n / 1e6).toFixed(1) + ' MB'
      if (n >= 1e3) return (n / 1e3).toFixed(0) + ' KB'
      return n + ' B'
    }
    const fmtEta = (s) => {
      if (!s || !isFinite(s) || s <= 0) return ''
      if (s < 90) return Math.round(s) + '秒'
      if (s < 5400) return Math.round(s / 60) + '分'
      return (s / 3600).toFixed(1) + '时'
    }
    const jobPct = (j) => (j.total > 0 ? Math.min(100, Math.round((j.done / j.total) * 1000) / 10) : 0)
    const jobCls = (j) => (j.status === 'error' ? 'err' : j.stale ? 'stale' : j.status === 'done' ? 'done' : j.status === 'paused' ? 'pause' : 'run')
    const CHIP = { run: '运行中', done: '完成', pause: '排队', stale: '疑似中断', err: '错误' }
    const chipOf = (j) => (j.status === 'error' ? 'err' : j.stale ? 'stale' : j.status)

    // 运行态的填充色 = 当前百分比在莫兰迪色带上的取值（与水球水面同色）
    const fillStyle = (p, cls) => (
      cls === 'run'
        ? { width: p + '%', background: rampCss(p) }
        : { width: p + '%' }
    )

    const Bar = ({ j }) => h('div', { className: 'dshp-track' },
      h('div', { className: 'dshp-fill ' + jobCls(j), style: fillStyle(jobPct(j), jobCls(j)) }))

    const JobRow = ({ job: j, onArchive }) => {
      const isB = j.unit === 'B'
      const ind = !j.total
      const num = ind ? '' : isB ? fmtBytes(j.done) + ' / ' + fmtBytes(j.total)
        : (j.done + (j.total ? ' / ' + j.total : '') + (j.unit && j.unit !== 'B' ? ' ' + j.unit : ''))
      let tail = ''
      if (j.stale) tail = '心跳停 ' + (j.heartbeatAge != null ? Math.round(j.heartbeatAge / 60) + '分' : '')
      else if (j.status !== 'done' && j.eta) tail = '剩余 ' + fmtEta(j.eta)
      else if (j.speed && j.unit && j.unit !== 'B') tail = (1 / j.speed).toFixed(1) + 's/' + j.unit
      return h('div', { className: 'dshp-job' },
        h('div', { className: 'dshp-j1' },
          h('span', { className: 'dshp-chip ' + chipOf(j) }, CHIP[chipOf(j)]),
          h('span', { className: 'dshp-jname', title: (j.label || '') + (j.note ? ' · ' + j.note : '') }, j.label || j.id),
          j.total > 0 ? h('span', { className: 'dshp-pct' }, jobPct(j) + '%') : null,
          j.kind === 'hb' && onArchive ? h('button', {
            className: 'dshp-arch', title: '归档：停关联进程(SIGTERM温停)+清心跳，质检结果回显',
            onClick: () => onArchive(j),
          }, '×') : null),
        ind ? null : h(Bar, { j }),
        h('div', { className: 'dshp-j2' },
          h('span', { className: 'n' }, (num ? num + ' · ' : '') + (j.note || '')),
          tail ? h('span', null, tail) : null))
    }

    const SysBar = ({ label, pct, text }) => {
      const p = Math.min(100, Math.round(pct))
      const band = p > 88 ? ' crit' : p > 65 ? ' hot' : ''
      return h('div', { className: 'dshp-sysb' },
        h('div', { className: 'dshp-sysl' }, h('span', null, label), h('span', null, text)),
        h('div', { className: 'dshp-syst' }, h('div', { className: 'dshp-sysf' + band, style: band ? { width: p + '%' } : { width: p + '%', background: rampCss(p) } })))
    }

    // v5.35 浪体合一（用户裁定：水体与深浪必须一体、随进度同一种深色、水体不用渐变）——
    // 根因：深浪波带底边止于水位线、div 水体从水位线起，两个元件拼接的缝（亚像素 AA +
    // α.85 透玻璃渐变）读作"水体 2 层、浪体分离"。治本：深浪填充拉高贯穿球体（至球底），
    // 深浪即水体本体；水体 div 退化为纯高度动画载体（透明背景），水位线处零元素边界。
    // 深层 α=1 实色——玻璃渐变不再透过水体，水色随进度纯平一种深色；淡/浅薄浪 α.85 不变。
    // 定稿参数（v5.34 B 档不变）：峰谷 16px；淡 4.2s 倒相 / 浅 5.1s 反向 / 深 3.4s。
    const wavePath = (cy, a, vbh, invert) => {
      const c = invert ? cy + a : cy - a
      const t = invert ? cy - a : cy + a
      return 'M0,' + cy + ' C10,' + c + ' 20,' + t + ' 30,' + cy + ' S50,' + c + ' 60,' + cy + ' S80,' + t + ' 90,' + cy + ' S110,' + c + ' 120,' + cy + ' V' + vbh + ' H0 Z'
    }
    const WAVE = {
      vbh: 36, a: 12, h: 24,
      deepExtra: 90, // 深浪波带向下延长 px（覆盖最大水深 80px + 余量，球底由圆裁剪）
      layers: [
        { k: .7, a: .85, s: 4.2, inv: true }, // 淡（远）
        { k: .4, a: .85, s: 5.1, rev: true }, // 浅（中）
      ],
      deep: { s: 3.4 },                       // 深（近）＝水体本体（k0 α1）
    }
    // 深浪专用 viewBox 高：波带段几何与薄浪完全同构，延长段只是纯填充
    const WAVE_DEEP_VBH = WAVE.vbh + Math.round(WAVE.deepExtra * WAVE.vbh / WAVE.h)
    const FX = ['fade', 'fly', 'pop', 'blinds', 'boom', 'flip', 'drop']

    const fetchSnapshot = async () => {
      if (typeof host !== 'undefined' && host && typeof host.call === 'function') {
        try { return await host.call('progress:data') } catch (e) { /* fall */ }
      }
      if (typeof fetch === 'function') {
        try {
          const r = await fetch('/dsh-progress/data', { cache: 'no-store' })
          if (r.ok) return await r.json()
        } catch (e) {}
      }
      return null
    }

    // v4.8.0 归档动作：host.call 优先，fetch POST 兜底（与数据通道同构）
    const callArchive = async (id) => {
      if (typeof host !== 'undefined' && host && typeof host.call === 'function') {
        try { return await host.call('progress:archive', { id }) } catch (e) { /* fall */ }
      }
      if (typeof fetch === 'function') {
        try {
          const r = await fetch('/dsh-progress/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
          if (r.ok) return await r.json()
          return { ok: false, error: 'HTTP ' + r.status }
        } catch (e) { return { ok: false, error: String(e && e.message || e) } }
      }
      return { ok: false, error: 'no channel' }
    }

    const Panel = () => {
      const [snap, setSnap] = React.useState(null)
      const [open, setOpen] = React.useState(true)
      const [pos, setPos] = React.useState(loadPos)
      const [drag, setDrag] = React.useState(false)
      const [rot, setRot] = React.useState({ t: 0, fx: 'fade' })
      const ref = React.useRef(null)
      // v4.8.0 归档质检：toast 提示 + 手动刷新通道
      const [toast, setToast] = React.useState(null)
      const refreshRef = React.useRef(null)

      // v5.26: 拖动可靠性三连修——
      //  ① 按下瞬间同步挂 window 监听（旧 useEffect 方案有 1 帧空窗，快速起手丢事件）
      //  ② 双击开面板增加"干净点击"判定：带拖动位移的快速二次按住不再误触发 dblclick
      //    （此前第一次没抓住立刻重试 → 系统判定双击 → 面板弹出球消失 → 体感"拖动失败"）
      //  ③ 新增 .dshp-grab 隐形抓取环：球缘外扩 12px 内都能起拖
      // v5.29: 流畅度重构（对齐 react-draggable 业界实现：位置只走 transform，拖动零 React 渲染）——
      //  旧实现每个 pointermove → setPos → 整面板 React 重渲染 → 改 left/top → 布局重排，主线程
      //  超过 16ms 即掉帧。现在拖动期间命令式直写 el.style.transform（translate3d 纯合成器路径，
      //  零布局零重绘零 React），松手才原子提交终值回 left/top。
      const stopDragRef = React.useRef(null)
      const lastMovedRef = React.useRef(false)
      const elRef = React.useRef(null) // 拖动目标元素（球体或面板容器）
      const onDown = (e) => {
        if (e.button !== 0) return
        // 标题栏上的按钮（收起钮）不触发拖拽，避免抢点击
        if (e.target && e.target.closest && e.target.closest('.dshp-x')) return
        e.preventDefault()
        // 面板场景按下点在标题栏，位移必须作用于整个面板容器
        elRef.current = (e.currentTarget.closest && e.currentTarget.closest('.dshp-panel')) || e.currentTarget
        ref.current = { bx: pos.x, by: pos.y, lx: pos.x, ly: pos.y, sx: e.clientX, sy: e.clientY, moved: false }
        setDrag(true)
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) {}
        const mv = (ev) => {
          if (!ref.current || !elRef.current) return
          const x = Math.max(8, Math.min(window.innerWidth - 96, ev.clientX - (ref.current.sx - ref.current.bx)))
          const y = Math.max(8, Math.min(window.innerHeight - 96, ev.clientY - (ref.current.sy - ref.current.by)))
          if (Math.abs(ev.clientX - ref.current.sx) + Math.abs(ev.clientY - ref.current.sy) > 4) ref.current.moved = true
          ref.current.lx = x; ref.current.ly = y
          // GPU 合成器路径：只写 transform，不触发布局；React 全程不参与
          elRef.current.style.transform = 'translate3d(' + (x - ref.current.bx) + 'px,' + (y - ref.current.by) + 'px,0)'
        }
        const up = () => {
          if (ref.current) {
            lastMovedRef.current = ref.current.moved
            // 原子提交：left/top 终值 + 清 transform 同一帧落地（无闪跳），React 稍后重设同值
            const el = elRef.current
            if (el) { el.style.left = ref.current.lx + 'px'; el.style.top = ref.current.ly + 'px'; el.style.transform = '' }
            setPos({ x: ref.current.lx, y: ref.current.ly })
          }
          setDrag(false); ref.current = null; cleanup()
        }
        const cleanup = () => {
          window.removeEventListener('pointermove', mv)
          window.removeEventListener('pointerup', up)
          window.removeEventListener('pointercancel', up)
        }
        if (stopDragRef.current) stopDragRef.current()
        stopDragRef.current = cleanup
        window.addEventListener('pointermove', mv)
        window.addEventListener('pointerup', up)
        window.addEventListener('pointercancel', up)
      }
      React.useEffect(() => () => { if (stopDragRef.current) stopDragRef.current() }, [])
      const onDbl = () => {
        if (lastMovedRef.current) { lastMovedRef.current = false; return }
        setOpen(true)
      }
      const onDblClose = () => {
        if (lastMovedRef.current) { lastMovedRef.current = false; return }
        setOpen(false)
      }

      React.useEffect(() => {
        let alive = true
        const tick = async () => { const s = await fetchSnapshot(); if (alive && s) setSnap(s) }
        refreshRef.current = tick
        tick()
        let stop = null
        if (timer && typeof timer.interval === 'function') stop = timer.interval(tick, 4000)
        else if (typeof setInterval === 'function') { const iv = setInterval(tick, 4000); stop = () => clearInterval(iv) }
        return () => { alive = false; if (stop) stop() }
      }, [])
      React.useEffect(() => { savePos(pos) }, [pos])
      // v5.28: 窗口尺寸/缩放变化时实时钳回屏内（旧版只在拖动和加载时钳制，
      // 窗口变小后球永久滞留屏外，直到下一次手动拖动）。位置未变则原对象返回，避免无谓重存。
      React.useEffect(() => {
        const onRz = () => setPos((p) => { const c = clampPos(p); return (c.x === p.x && c.y === p.y) ? p : c })
        window.addEventListener('resize', onRz)
        return () => window.removeEventListener('resize', onRz)
      }, [])
      React.useEffect(() => {
        let stop = null
        if (timer && typeof timer.interval === 'function') {
          stop = timer.interval(() => setRot((r) => ({ t: r.t + 1, fx: FX[Math.floor(Math.random() * FX.length)] })), 5000)
        } else if (typeof setInterval === 'function') {
          const iv = setInterval(() => setRot((r) => ({ t: r.t + 1, fx: FX[Math.floor(Math.random() * FX.length)] })), 5000)
          stop = () => clearInterval(iv)
        }
        return () => { if (stop) stop() }
      }, [])

      // v4.8.0 归档质检闭环：调用 → 3.5s 后复查该行是否真消失 → toast 回报
      const doArchive = async (j) => {
        if (!j || !j.id) return
        setToast('归档中 · ' + (j.label || j.id) + ' …')
        const r = await callArchive(j.id)
        if (!r || !r.ok) { setToast('归档失败：' + ((r && r.error) || '未知原因')); return }
        const line = r.noPid
          ? '已归档（心跳无 pid 字段，未做进程质检）'
          : '已归档 · 停 ' + (r.killed || []).length + ' 进程' + ((r.stillAlive || []).length ? ' · 温停未净 ' + r.stillAlive.length + '（不强杀，人工处置）' : ' · 全净')
        setTimeout(async () => {
          const s = await fetchSnapshot()
          if (s) setSnap(s)
          const row = s && (s.jobs || []).find((x) => x.id === j.id)
          setToast(row && row.status !== 'done' ? '⚠️ 行未消失：' + (row.label || j.id) + '（' + line + '）' : '✓ ' + line)
          setTimeout(() => setToast((t) => (t && t.indexOf('✓') === 0 ? null : t)), 6000)
        }, 3500)
      }

      const jobs = (snap && snap.jobs) || []
      const cnt = jobs.filter((j) => j.total > 0 && j.unit !== 'B')
      const tot = cnt.reduce((a, j) => a + j.total, 0)
      const done = cnt.reduce((a, j) => a + Math.min(j.done, j.total), 0)
      const pct = tot > 0 ? Math.round((done / tot) * 1000) / 10 : 0
      const stale = jobs.filter((j) => j.stale)
      const sys = snap && snap.sys
      const memPct = sys && sys.memTotalGB ? (sys.memUsedGB / sys.memTotalGB) * 100 : 0
      const active = jobs.filter((j) => j.status !== 'done')

      // 轮换指标各自携带水位值 h（0~100）：水的高度跟随当前展示的指标，
      // 修复"数字轮到 CPU/内存时水位仍停在总进度"的不匹配（2026-09-12）。
      // .dshp-water 自带 height .8s 过渡，轮换时水位会平滑动画到新值。
      const metrics = [{ l: '总进度', v: pct >= 100 ? '✓' : pct.toFixed(1) + '%', h: pct }]
      if (sys) {
        metrics.push({ l: 'CPU', v: Math.round(sys.cpuPct) + '%', h: Math.max(0, Math.min(100, sys.cpuPct)) })
        metrics.push({ l: '内存', v: Math.round(memPct) + '%', h: Math.max(0, Math.min(100, memPct)) })
      }
      const met = metrics[rot.t % metrics.length]

      if (!snap) return null
      if (!open) {
        const hgt = Math.max(0, Math.min(100, met.h))
        // v5.15: 隐藏 SVG 色环（用户要求）；"边框同色"职能由脱开光环承担。
        // stale 提示：光环转玫瑰色 + tooltip + 面板标记。
        // v5.20: 光晕颜色不再被 stale 劫持（晋书翻译心跳死亡导致整天固定玫瑰色的教训）；
        // stale 告警只走面板标记 + 悬浮提示，光晕永远跟随当前指标色带
        const glow = rampRgba(hgt, .72)
        // v5.14→v5.22: 球缘=玻璃盘边 40px；光环带 40.8→46.5(峰值 α.72)→51px(5px 羽化收零)，间隙 1px
        const haloBg = 'radial-gradient(circle 54px at 50% 56%, rgba(0,0,0,.16) 0 76%, transparent 100%)'
          + ',radial-gradient(circle 51px at 50% 50%, transparent 0 80%, ' + glow + ' 91%, ' + rampRgba(hgt, 0) + ' 100%)'
        return h('div', {
          className: 'dshp-bub' + (drag ? ' drag' : '') + (stale.length ? ' stale' : ''),
          style: { position: 'fixed', left: pos.x + 'px', top: pos.y + 'px', zIndex: 2147482000, border: '2px solid transparent' },
          onPointerDown: onDown, onDoubleClick: onDbl,
          title: (sys ? 'CPU ' + Math.round(sys.cpuPct) + '% · 内存 ' + Math.round(memPct) + '% · ' : '') + '总进度 ' + pct.toFixed(1) + '%' + (stale.length ? ' · ⚠ ' + stale.length + ' 项心跳中断' : '') + ' · 双击展开 · 拖动移动 · 蓝→绿→橘→红→紫黑',
        },
          h('div', { className: 'dshp-bublift' },
            h('div', { className: 'dshp-grab', onPointerDown: onDown }),
            h('div', { className: 'dshp-halo', style: { background: haloBg } }),
            h('div', { className: 'dshp-bubclip' },
              h('div', { className: 'dshp-water', style: { height: hgt + '%' } },
                // 远/中两层薄浪（淡、浅）：只在 0<hgt<100 显示
                hgt > 0 && hgt < 100 ? WAVE.layers.map((L, i) => h('svg', {
                  key: 'wv' + i, className: 'dshp-wave', viewBox: '0 0 120 ' + WAVE.vbh, preserveAspectRatio: 'none',
                  style: { top: -WAVE.h + 'px', height: WAVE.h + 'px', animation: 'dshp-wave ' + L.s + 's linear infinite' + (L.rev ? ' reverse' : '') },
                }, h('path', { d: wavePath(WAVE.a, WAVE.a, WAVE.vbh, L.inv), style: { fill: rampLight(hgt, L.k, L.a) } }))) : null,
                // 近层深浪（α1 实色）＝水体本体：波带拉高贯穿至球底，水位线处零元素边界
                hgt > 0 ? h('svg', {
                  key: 'wvd', className: 'dshp-wave', viewBox: '0 0 120 ' + WAVE_DEEP_VBH, preserveAspectRatio: 'none',
                  style: { top: -WAVE.h + 'px', height: (WAVE.h + WAVE.deepExtra) + 'px', animation: 'dshp-wave ' + WAVE.deep.s + 's linear infinite' },
                }, h('path', { d: wavePath(WAVE.a, WAVE.a, WAVE_DEEP_VBH), style: { fill: rampLight(hgt, 0, 1) } })) : null)),
            h('div', { className: 'dshp-fx dshp-fx-' + rot.fx, key: rot.t },
              h('span', { className: 'dshp-bubnum' + (hgt >= 73 ? ' dshp-hi' : '') },
                met.v.indexOf('.') > 0 ? met.v.slice(0, met.v.indexOf('.')) : met.v,
                met.v.indexOf('.') > 0 ? h('span', { className: 'dshp-bubdec' }, met.v.slice(met.v.indexOf('.'), -1)) : null,
                met.v.indexOf('.') > 0 ? met.v.slice(-1) : null),
              h('br', null),
              h('span', { className: 'dshp-bubsub' + (hgt >= 73 ? ' dshp-hi' : '') }, met.l))))
      }

      return h('div', { className: 'dshp-panel', style: { position: 'fixed', left: pos.x + 'px', top: pos.y + 'px', zIndex: 2147482000, width: '420px', maxHeight: '66vh' } },
        h('div', {
          className: 'dshp-head' + (drag ? ' drag' : ''),
          onPointerDown: onDown, onDoubleClick: onDblClose,
        },
          h('b', { style: { fontSize: 15 } }, pct.toFixed(1) + '%'),
          h('b', { style: { background: 'linear-gradient(90deg,#7091b2,#8fb096,#c99a70);-webkit-background-clip:text;background-clip:text;color:transparent' } }, '进度总览'),
          h('span', { className: 'sp' }),
          sys ? h('span', { style: { fontSize: 10.5, opacity: .65 } }, '负载 ' + (sys.load1 || '-')) : null,
          h('button', { className: 'dshp-x', onClick: () => setOpen(false), title: '收起为水球' }, '—')),
        h('div', { className: 'dshp-body' },
          active.length === 0 ? h('div', { className: 'dshp-empty' }, '全部完成 · 没有进行中的任务') :
            active.map((j) => h(JobRow, { key: j.id, job: j, onArchive: doArchive })),
          toast ? h('div', { className: 'dshp-toast' }, toast) : null),
        sys ? h('div', { className: 'dshp-sys' },
          h(SysBar, { label: 'CPU', pct: sys.cpuPct, text: Math.round(sys.cpuPct) + '%' }),
          h(SysBar, { label: '内存', pct: memPct, text: sys.memUsedGB.toFixed(1) + '/' + sys.memTotalGB.toFixed(0) + 'GB' })) : null)
    }

    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'progress-float', order: 10, label: '进度' },
      () => h(Panel),
    ))

    ctx.effect(() => { if (styleDispose) return styleDispose })
  }

  return { inject: ['slots', 'timer'], apply }
  }
});
