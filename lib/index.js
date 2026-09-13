// dsh-progress host v4: heartbeat/dircount/dirsize/proc probes + CPU/MEM stats.
// Serves /dsh-progress/data (installed webServer route); dynamic twin uses harness RPC.
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Cordis 服务契约：webServer 为硬依赖，声明 inject 让宿主等服务就位后再激活本插件。
// （不声明时 apply 时序可能早于 webServer 注册，ctx.get 拿到 undefined → host 半区躺平。）
export const name = "dsh-progress"
export const inject = ["webServer"]

const HOME = os.homedir()
const WATCH_CONFIG = path.join(HOME, '.dsh', 'progress.watch.json')

function sh(cmd) {
  return new Promise((resolve) => {
    execFile('/bin/sh', ['-c', cmd], { timeout: 8000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      resolve(err ? null : stdout)
    })
  })
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}

function walkSync(root, depth, maxDepth, out) {
  let entries
  try { entries = fs.readdirSync(root, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.progress') continue
    const p = path.join(root, e.name)
    if (e.isDirectory()) {
      if (depth < maxDepth) walkSync(p, depth + 1, maxDepth, out)
    } else if (e.isFile()) out.push(p)
  }
}

// 专用扫描：递归找 .progress 目录并收集其中文件（剪掉重目录，供心跳/计数用）
const HEAVY = ['node_modules', 'pages', 'vision', 'ocr', 'dist', 'build', 'target', '__pycache__', '.venv', 'venv', 'face_cards', '蒸馏']
function scanProgressFiles(root, depth, maxDepth, out) {
  let entries
  try { entries = fs.readdirSync(root, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    const nm = e.name
    if (nm === '.progress') {
      try {
        for (const f of fs.readdirSync(path.join(root, nm), { withFileTypes: true })) {
          if (f.isFile()) out.push(path.join(root, nm, f.name))
        }
      } catch {}
      continue
    }
    if (nm.startsWith('.') || HEAVY.includes(nm)) continue
    if (e.isDirectory() && depth < maxDepth) scanProgressFiles(path.join(root, nm), depth + 1, maxDepth, out)
  }
}

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  console.log('[dsh-progress] apply invoked, webServer =', webServer ? 'present' : 'absent')
  const SYSFILE = path.join(HOME, '.dsh', '.progress', 'sys.progress.json')
  function sysFromFile() {
    try {
      const j = JSON.parse(fs.readFileSync(SYSFILE, 'utf8'))
      if (!j || !j.heartbeat || Date.now() - j.heartbeat > 30000) return null
      if (j.cpuPct == null && j.memUsedGB == null) return null
      return { cpuPct: Number(j.cpuPct) || 0, memUsedGB: Number(j.memUsedGB) || 0, memTotalGB: Number(j.memTotalGB) || 0, load1: j.load1 != null ? Number(j.load1) : null }
    } catch { return null }
  }
  const wsReg = ctx.get('workspaceRegistry')
  let wsRoots = []
  try {
    if (wsReg && typeof wsReg.list === 'function') {
      Promise.resolve(wsReg.list()).then((ws) => {
        wsRoots = (ws || []).map((w) => w && w.path).filter(Boolean)
      }).catch(() => {})
    }
  } catch {}
  let sysCache = { at: 0, data: null }

  async function sysAndProcs(cfg, jobs) {
    const fromFile = sysFromFile()
    if (fromFile) sysCache.data = fromFile
    const procs = (cfg.watches || []).filter((w) => w.type === 'proc' && w.enabled !== false)
    const STAT_CMD = [
      "ps -A -o %cpu= | awk '{c+=$1} END{printf \"SYSCPU %.0f\\n\", c}'",
      "echo \"NCPU $(sysctl -n hw.ncpu)\"",
      "echo \"MEMTOTAL $(sysctl -n hw.memsize)\"",
      "echo \"LOAD $(sysctl -n vm.loadavg | cut -d' ' -f2)\"",
      "vm_stat | awk '/Pages active:/{a=$NF}/wired down:/{w=$NF}/compressor:/{c=$NF}/Pages free:/{f=$NF}END{gsub(/[^0-9]/,\"\",a);gsub(/[^0-9]/,\"\",w);gsub(/[^0-9]/,\"\",c);gsub(/[^0-9]/,\"\",f);printf \"VMPAGES %s %s %s %s\\n\",a,w,c,f}'",
    ].join('; ')
    const parts = [STAT_CMD]
    for (const w of procs) parts.push("echo '@@PROC:" + w.id + "'; pgrep -if '" + String(w.match || '') + "' | head -5")
    const out = await sh(parts.join('; '))
    if (out == null) return
    const m = out.match(/SYSCPU ([\d.]+)/)
    const mn = out.match(/NCPU (\d+)/)
    const mt = out.match(/MEMTOTAL (\d+)/)
    const ml = out.match(/LOAD ([\d.]+)/)
    const mp = out.match(/VMPAGES (\d+) (\d+) (\d+) (\d+)/)
    const PS = 16384
    let usedGB = null
    if (mp) usedGB = (parseInt(mp[1]) + parseInt(mp[2]) + parseInt(mp[3])) * PS / 1073741824
    if (m) sysCache.data = {
      cpuPct: Math.min(100, (parseFloat(m[1]) || 0) / Math.max(1, mn ? parseInt(mn[1]) : 1)),
      memUsedGB: usedGB != null ? usedGB : 0,
      memTotalGB: mt ? parseFloat(mt[1]) / 1073741824 : 0,
      load1: ml ? parseFloat(ml[1]) : null,
      freeGB: mp ? parseInt(mp[4]) * PS / 1073741824 : null,
    }
    sysCache.at = Date.now()
    for (const w of procs) {
      const re = new RegExp('@@PROC:' + w.id + "[^\n]*\n([^@]*)")
      const pm = out.match(re)
      const pids = pm ? pm[1].split('\n').map((s) => s.trim()).filter(Boolean) : []
      // 2026-09-13 用户裁定：空闲哨兵不渲染——"未检测到进程"不该常驻面板。
      // 语义：proc 哨兵 = 下载进程雷达，探测到进程才上屏；需要常驻显示的哨兵在 watch 配置加 "showIdle": true。
      if (!pids.length && w.showIdle !== true) continue
      jobs.push({
        id: w.id, label: w.label || w.id,
        status: pids.length ? 'running' : 'paused',
        done: 0, total: 0, unit: '', speed: 0, eta: null,
        note: pids.length ? '运行中 · PID ' + pids.slice(0, 3).join(',') : '未检测到进程',
        stale: false, heartbeatAge: null,
        kind: 'proc',
      })
    }
  }

  // ---- 收尸器（2026-09-12）：机制化消灭僵尸心跳 ----
  // 病根：终态写入全靠任务方自觉；dsh web 重启杀后台任务/会话被弃/脚本无 trap 兜底时终态永远缺席，
  // 而显示层只标红不清算 → 僵尸必然累积（2026-09-12 用户问"为什么总会出现"后裁定加装）。
  // 规则：done 残留 >10min → 删（终态本该任务自删，此处兜底）；
  //       running 心跳断供 >24h（无 heartbeat 字段则以文件 mtime 计）→ 隔离到 .progress/_dead/，不直删；
  //       paused（有意停靠，如等用户提供凭据）/ error（保留待处置）一律不动。
  //       .progress 只扫一层文件，_dead/ 子目录天然不回流显示。
  let lastReapAt = 0
  function reapHeartbeat(f, j, now, w) {
    try {
      const ageOf = (t) => Math.max(0, now - t)
      if (j.status === 'done' && ageOf(j.heartbeat || fs.statSync(f).mtimeMs) > (w.doneGraceSec || 600) * 1000) {
        fs.rmSync(f, { force: true })
        console.log('[dsh-progress] 收尸·清除 done 残留:', f)
        return true
      }
      if (j.status === 'running') {
        const age = j.heartbeat ? ageOf(j.heartbeat) : ageOf(fs.statSync(f).mtimeMs)
        if (age > (w.deadSec || 86400) * 1000) {
          const deadDir = path.join(path.dirname(f), '_dead')
          fs.mkdirSync(deadDir, { recursive: true })
          fs.renameSync(f, path.join(deadDir, path.basename(f)))
          console.log('[dsh-progress] 收尸·隔离断供 running（' + Math.round(age / 3600000) + 'h 无心跳）:', f)
          return true
        }
      }
    } catch { /* 收尸失败不影响数据面 */ }
    return false
  }

  function collectHeartbeats(w, now, jobs) {
    const roots = [...new Set([...(w.roots || []).map((r) => path.resolve(HOME, r.replace(/^~\//, ''))), ...wsRoots])]
    const doReap = now - lastReapAt > 10 * 60 * 1000
    if (doReap) lastReapAt = now
    for (const root of roots) {
      const files = []
      scanProgressFiles(root, 0, w.depth || 4, files)
      for (const f of files) {
        if (!f.endsWith('.progress.json')) continue
        const j = readJson(f)
        if (!j || !j.id) continue
        if (doReap && reapHeartbeat(f, j, now, w)) continue
        const age = j.heartbeat ? Math.max(0, now - j.heartbeat) : null
        jobs.push({
          id: j.id, label: j.label || j.id, status: j.status || 'running',
          done: Number(j.done) || 0, total: Number(j.total) || 0,
          unit: j.unit || '', speed: Number(j.speed) || 0, eta: j.eta || null,
          note: j.note || '',
          stale: j.status !== 'done' && j.status !== 'paused' && age !== null && age > (w.staleSec || 300) * 1000,
          heartbeatAge: age !== null ? Math.round(age / 1000) : null,
          kind: 'hb',
        })
      }
    }
  }

  function countMatches(pattern) {
    const idx = pattern.lastIndexOf('/')
    const dir = path.resolve(HOME, pattern.slice(0, idx).replace(/^~\//, ''))
    const base = pattern.slice(idx + 1)
    const files = []
    walkSync(dir, 0, 2, files)
    const star = base.indexOf('*')
    if (star === -1) return files.filter((f) => f === path.join(dir, base)).length
    const pre = base.slice(0, star), post = base.slice(star + 1)
    return files.filter((f) => {
      const b = path.basename(f)
      return b.startsWith(pre) && b.endsWith(post)
    }).length
  }

  function dirSize(rootDir) {
    const files = []
    walkSync(path.resolve(HOME, rootDir.replace(/^~\//, '')), 0, 6, files)
    let total = 0
    for (const f of files) {
      try { total += fs.statSync(f).size } catch {}
    }
    return total
  }

  async function collectAll() {
    const cfg = readJson(WATCH_CONFIG) || { watches: [] }
    const now = Date.now()
    const jobs = []
    for (const w of cfg.watches || []) {
      if (w.enabled === false || w.type === 'proc') continue
      try {
        if (w.type === 'heartbeat') collectHeartbeats(w, now, jobs)
        else if (w.type === 'dircount') {
          const done = countMatches(w.donePattern || '')
          const total = w.totalPattern ? countMatches(w.totalPattern) : w.total || 0
          jobs.push({ id: w.id, label: w.label || w.id, status: total && done >= total ? 'done' : 'running', done, total, unit: w.unit || '个', speed: 0, eta: null, note: w.note || '', stale: false, heartbeatAge: null, kind: 'watch' })
        } else if (w.type === 'dirsize') {
          const bytes = dirSize(w.path || '')
          const target = w.targetBytes || 0
          jobs.push({ id: w.id, label: w.label || w.id, status: target > 0 && bytes >= target * 0.995 ? 'done' : 'running', done: bytes, total: target, unit: 'B', speed: 0, eta: null, note: w.note || '', stale: false, heartbeatAge: null, kind: 'watch' })
        }
      } catch (e) {
        jobs.push({ id: w.id, label: w.label || w.id, status: 'error', done: 0, total: 0, unit: '', speed: 0, eta: null, note: String(e && e.message || e), stale: false, heartbeatAge: null })
      }
    }
    await sysAndProcs(cfg, jobs)
    const rank = { error: 0, stale: 2, running: 1, paused: 3, done: 4 }
    jobs.sort((a, b) => (a.stale ? 0 : (rank[a.status] !== undefined ? rank[a.status] : 5)) - (b.stale ? 0 : (rank[b.status] !== undefined ? rank[b.status] : 5)) || (b.total - b.done) - (a.total - a.done))
    return { now, jobs, sys: sysCache.data }
  }

  // ---- 归档质检（v4.8.0，2026-09-13 用户裁定）：点击归档 = 查活进程 → SIGTERM 温停 → 清心跳 → 回报 ----
  // 心跳可选 pid 字段（pid: 123 或 pids: [..]）供精确质检；无 pid 只清心跳并如实标注"未做进程质检"。
  function findHeartbeatFile(id) {
    if (!/^[A-Za-z0-9_-]+$/.test(id)) return null
    const cfg = readJson(WATCH_CONFIG) || { watches: [] }
    const roots = []
    for (const w of (cfg.watches || []).filter((x) => x.type === 'heartbeat')) {
      for (const r of [...new Set([...(w.roots || []).map((r) => path.resolve(HOME, r.replace(/^~\//, ''))), ...wsRoots])]) roots.push({ root: r, depth: w.depth || 4 })
    }
    for (const { root, depth } of roots) {
      const files = []
      scanProgressFiles(root, 0, depth, files)
      const hit = files.find((f) => path.basename(f) === id + '.progress.json')
      if (hit) return hit
    }
    return null
  }

  const pidAlive = (pid) => { try { process.kill(pid, 0); return true } catch (e) { return !!(e && e.code === 'EPERM') } }

  async function handleArchive(id) {
    const f = findHeartbeatFile(id)
    if (!f) return { ok: false, error: 'heartbeat not found: ' + id }
    const j = readJson(f) || {}
    const pids = [...new Set([...(Array.isArray(j.pids) ? j.pids.map(Number) : []), ...(j.pid ? [Number(j.pid)] : [])])].filter((p) => Number.isInteger(p) && p > 1)
    const killed = [], alreadyDead = []
    for (const p of pids) {
      if (!pidAlive(p)) { alreadyDead.push(p); continue }
      try { process.kill(p, 'SIGTERM'); killed.push(p) } catch { alreadyDead.push(p) }
    }
    await new Promise((r) => setTimeout(r, 3000)) // 温停观察窗：SIGTERM 后仍在的只报告，不强杀
    const stillAlive = pids.filter((p) => killed.includes(p) && pidAlive(p))
    const parts = ['已归档']
    if (pids.length === 0) parts.push('心跳无pid字段，未做进程质检')
    else parts.push('进程质检：停' + killed.length + (alreadyDead.length ? ' · 已死' + alreadyDead.length : '') + (stillAlive.length ? ' · 温停未净' + stillAlive.length + '（不强杀）' : ' · 全净'))
    const note = parts.join('：')
    const total = Number(j.total) > 0 ? Number(j.total) : 1
    try {
      fs.writeFileSync(f, JSON.stringify({ ...j, status: 'done', done: total, speed: 0, eta: null, note, heartbeat: Date.now() }, null, 1))
      setTimeout(() => { try { fs.rmSync(f, { force: true }) } catch {} }, 6000) // 6s 后删文件；收尸器 done>10min 为兜底
    } catch (e) { return { ok: false, error: 'write fail: ' + (e && e.message) } }
    console.log('[dsh-progress] 归档质检', id, '→', note)
    return { ok: true, id, file: f, killed, alreadyDead, stillAlive, noPid: pids.length === 0, note }
  }

  // 双保险挂载：inject 声明让宿主等服务就位（首选路径）；若装载器未消费 inject，
  // 用受 effect 管辖的重试兜底（2026-09-12 水球失踪事故：apply 时序早于 webServer 注册）。
  // ⚠️ ctx.effect 语义 = 立即执行回调 + 收管返回的 disposer：register 必须写在回调内部。
  const mountRoute = () => {
    const ws = webServer ?? ctx.get('webServer')
    if (!ws) return false
    ctx.effect(() => ws.register({
      kind: 'prefix',
      path: '/dsh-progress/data',
      async handler(req, res) {
        try {
          const payload = JSON.stringify(await collectAll())
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
          res.end(payload)
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end(String(e && e.message || e))
        }
      },
    }))
    // v4.8.0 归档质检入口：POST /dsh-progress/archive {"id":"task-id"}
    ctx.effect(() => ws.register({
      kind: 'prefix',
      path: '/dsh-progress/archive',
      async handler(req, res) {
        const send = (code, obj) => {
          res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
          res.end(JSON.stringify(obj))
        }
        try {
          if (req.method !== 'POST') return send(405, { ok: false, error: 'POST only' })
          const body = await new Promise((resolve) => {
            let b = ''
            req.on('data', (c) => { b += c; if (b.length > 4096) req.destroy() })
            req.on('end', () => resolve(b))
            req.on('error', () => resolve(b))
          })
          const parsed = JSON.parse(body || '{}')
          if (!parsed.id) return send(400, { ok: false, error: 'missing id' })
          send(200, await handleArchive(String(parsed.id)))
        } catch (e) { send(500, { ok: false, error: String(e && e.message || e) }) }
      },
    }))
    console.log('[dsh-progress] /dsh-progress/data 路由已挂载')
    return true
  }

  if (!mountRoute()) {
    console.log('[dsh-progress] apply 时 webServer 未就绪，启动重试等待')
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      if (mountRoute() || tries >= 30) {
        clearInterval(timer)
        if (tries >= 30 && !ctx.get('webServer')) console.log('[dsh-progress] 60 秒重试后 webServer 仍未就绪，host 半区放弃')
      }
    }, 2000)
    ctx.effect(() => () => clearInterval(timer))
  }
}
