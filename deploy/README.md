# 部署说明

目标拓扑、发布契约与失败语义见 `specs/001-portfolio-blog/contracts/site-contract.md` 第 4 节。
本文件只讲**怎么做**。

## 目录布局

```
/srv/blog/
├── repo.git/            裸仓库，接收推送
├── work/                工作区，构建在这里跑
├── releases/
│   ├── 20260912T101500/  每一次发布的产物
│   └── 20260912T093000/  上一版，回滚用
└── current -> releases/20260912T101500/    Caddy 指向这里
```

`releases/` + `current` 软链接提供两件事：**原子性**（构建期间线上不受影响）与**回滚**（切链接即可）。

## 前置条件

- 一台香港/新加坡轻量服务器（**免备案**），建议 2 核 2G 起
- 系统 Ubuntu 24.04 LTS
- 已解析到本机的域名，且 **DNS 已生效**
- 防火墙已放行 **22 / 80 / 443**（轻量服务器默认常只开 22）

## 服务器首次配置

```bash
# 1. Node.js ≥ 22.12（系统自带版本过旧）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v

# 2. pnpm
sudo corepack enable && corepack prepare pnpm@latest --activate

# 3. git 与 rsync
sudo apt install -y git rsync
```

Caddy 走官方源安装：

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

建立裸仓库与工作目录：

```bash
sudo mkdir -p /srv/blog/{releases,work}
sudo git init --bare /srv/blog/repo.git
sudo cp deploy/post-receive /srv/blog/repo.git/hooks/post-receive
sudo chmod +x /srv/blog/repo.git/hooks/post-receive
```

安装 Caddy 配置（**务必先把 `deploy/Caddyfile` 里的 `example.com` 换成真实域名**）：

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile   # 先校验语法
sudo systemctl reload caddy
```

## 从本机发布

```bash
git remote add deploy ssh://<user>@<host>/srv/blog/repo.git
git push deploy main
```

钩子会自动完成：拉取 → 安装 → 构建 → 链接与体积检查 → 原子切换。
**你不需要执行任何部署命令**（FR-019）。

## 回滚

`current` 指向哪一版，线上就是哪一版。回滚 = 切链接：

```bash
ls -1dt /srv/blog/releases/*/        # 看有哪些版本
sudo ln -sfn /srv/blog/releases/<时间戳> /srv/blog/current.new
sudo mv -T /srv/blog/current.new /srv/blog/current
```

无需重新构建。默认保留最近 5 个发布目录（在 `post-receive` 顶部用 `KEEP_RELEASES` 调整）。

## 排障

| 现象 | 排查方向 |
|---|---|
| 推送后线上没变 | 看钩子输出。构建或检查失败时**发布会被中止**，线上仍是上一版——这是预期行为 |
| 证书申请失败 | 检查 DNS 是否已生效、80/443 是否放行。**配置调试请先改用 ACME staging**，否则命中速率限制可能一周拿不到证书 |
| 构建被 OOM 杀死 | 小内存服务器跑不动构建。这是已知风险点，见下节 |
| 首次签发较慢 | 正常。Caddy 在后台申请，并会在 Let's Encrypt 与 ZeroSSL 之间回退 |

## 已知风险与将来扩展

**小内存服务器的构建可行性尚未实测。** 本地构建耗时数秒，但 sharp 与 satori 有内存峰值。
服务器开通后**第一件事**应该是完整跑一次构建确认。若 1–2 GB 内存吃不下，需要把构建改到
CI 上进行、服务器只接收产物——这会改变本目录的发布脚本，但不影响站点内容与页面地址。

**海外线路**：当前只服务国内读者（香港节点本身海外也可访问，故未额外配置）。
将来若需要，可加一条线到 Cloudflare Pages，并用 DNS 智能解析分流。届时**不需要改动任何内容
文件或页面地址**——这是构建产物与托管解耦的直接好处（FR-029、FR-034）。届时建议把构建挪到
CI，由两条发布路径各自消费同一份产物。

## 过渡方案：没有域名时先用 GitHub Pages 跑起来

**可以，已实测验证。** 但先明确它能做什么、不能做什么：

| | GitHub Pages |
|---|---|
| 国内访客可达性 | **差且不稳定**。它不能满足面向国内读者的可达性要求 |
| 适合的用途 | 自己预览、给少数人看、以及作为将来的**海外线路** |
| 不适合 | 作为求职作品集的实际地址——面试官可能根本打不开 |

也就是说：**它可以让你先看到站点，但不能替代香港/新加坡节点。** 好处是它不白做——
将来做双线路时，这条正好是海外那一半。

### 怎么开

1. 建一个 GitHub 仓库并推送本仓库内容（当前仓库尚无远程）
2. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**
3. 推送到 `main` 即自动构建并发布，工作流见 `.github/workflows/deploy-pages.yml`

工作流会自动把 Pages 的实际地址注入构建（`SITE_URL` 与 `SITE_BASE`），因此**不需要改任何代码**：

- 仓库名为 `<user>.github.io`（用户页）→ 地址在根路径，`SITE_BASE` 为空
- 仓库名为任意名（项目页）→ 地址在 `/<repo>/` 子路径，`SITE_BASE` 自动为该前缀

### 两个必须知道的坑

**1. Jekyll 会吃掉下划线目录。** GitHub Pages 默认对分支内容跑 Jekyll，而 `_astro/` 恰好以下划线
开头。仓库里已放 `public/.nojekyll` 兜底；走 Actions 部署本来也不经过 Jekyll，双保险。

**2. `SITE_URL` 必须以 `/` 结尾**，这是 `astro-paper.config.ts` 的约定。工作流里已补上。

### 换成自有域名时

**只改环境变量，不动代码**：服务器侧不设 `SITE_URL`/`SITE_BASE` 即为根路径。
若要从 GitHub Pages 迁走，内容与页面路径完全不变（子路径模式除外——那会让路径多一层前缀）。

---

## 环境变量

| 变量 | 作用 | 缺省 |
|---|---|---|
| `SITE_URL` | 站点根地址，用于 canonical、订阅源、站点地图与分享卡片 | `https://example.com/` |
| `SITE_BASE` | 子路径前缀，仅子路径部署需要 | 空（根路径） |

两个变量都只在构建期使用，不影响运行时。
