# SPLA3 Skill Tree — Discord + Web + DB

元のHEX SKILL TREEをベースにしたDiscord連携版です。

## できること

### Discord

```text
/skilltree
```

を実行すると、

- ランダムなSeedを発行
- Seedから決定論的に同じスキルツリーを生成
- WebページへのリンクをDiscordへ投稿
- SeedとDiscordのサーバー/チャンネル情報をDBへ保存

します。

### Web

Webページでは、

- スキル取得
- 取得状況の共有
- 保存
- Seedの入力
- 同じSeedのツリー再生成
- Discordへ現在の画像を投稿

ができます。

### Seed

例:

```text
SPLA3-8F29KQ
```

同じSeedなら同じスキル選択・同じ六角形配置になります。

さらに進捗はSeed単位で共有されるため、同じSeedを開いたユーザーは同じ取得状況を見ます。

## 構成

```text
web/
  index.html
  config.js
  skills.json
  assets/skills/       ← 181 PNG

worker/
  src.ts
  wrangler.jsonc
  schema.sql
  package.json

bot/
  bot.py
  requirements.txt
  .env.example

scripts/
  make-manifest.py
```

## 重要：画像

元のHTMLは受け取っていますが、このプロジェクトに181個のPNG画像そのものは含まれていません。

そのため、

```text
web/assets/skills/
```

に実際の181個のPNGを入れてください。

ファイル名は連番でなくて構いません。

その後:

```bash
python scripts/make-manifest.py
```

で `web/skills.json` を生成できます。

## 1. GitHub Pages

`web/` の中身をGitHub Pagesで公開します。

公開URLを例として:

```text
https://example.github.io/spla3-skilltree/
```

とします。

`web/config.js` を編集:

```javascript
window.SKILLTREE_API_BASE = "https://YOUR-WORKER.workers.dev";
```

## 2. Cloudflare D1

Cloudflare Workers + D1を使用します。

```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 create spla3-skilltree
```

表示されたdatabase_idを `wrangler.jsonc` に設定します。

その後:

```bash
npx wrangler d1 execute spla3-skilltree --remote --file=./schema.sql
```

## 3. Cloudflare Worker

`wrangler.jsonc` の

```text
PUBLIC_WEB_URL
```

をGitHub PagesのURLに変更。

Discord Bot TokenはSecretとして登録:

```bash
npx wrangler secret put DISCORD_BOT_TOKEN
```

デプロイ:

```bash
npx wrangler deploy
```

## 4. Discord Bot

Discord Developer PortalでBot/Applicationを作成します。

Bot Tokenを取得し、Bot側の `.env` に設定します。

```bash
cd bot
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

インストール:

```bash
pip install -r requirements.txt
```

`.env.example` を `.env` にコピーして設定。

```text
DISCORD_TOKEN=...
SKILLTREE_API_BASE=https://YOUR-WORKER.workers.dev
SKILLTREE_WEB_BASE=https://example.github.io/spla3-skilltree
```

起動:

```bash
python bot.py
```

Botが起動すると `/skilltree` を同期します。

## 5. Bot権限

Botには少なくとも対象チャンネルでメッセージ送信権限が必要です。

画像投稿時にはBotが対象チャンネルへファイル付きメッセージを送信します。

## セキュリティ

- Discord Bot TokenはGitHubに絶対にコミットしない
- Cloudflare Worker Secretを使用する
- `.env` はGitHubへアップロードしない
- D1のdatabase_idは公開されても通常は秘密情報ではありませんが、管理権限情報は公開しない

## 現在のデータモデル

`skilltrees`

```text
seed
guild_id
channel_id
created_by
web_url
created_at
```

`skilltree_progress`

```text
seed
progress_json
updated_at
```

進捗はSeed単位で共有されます。

## API

```text
POST /api/trees
GET  /api/trees/:seed
POST /api/progress
POST /api/discord/post-image
```

## 注意

このリポジトリは「コード一式」です。

Discord Botを実際に動かすには、

1. Discord Application/Bot作成
2. Bot Token設定
3. Cloudflare D1作成
4. Workerデプロイ
5. GitHub Pages公開
6. 181個のPNG配置

が必要です。

コード側には秘密情報を入れていません。
