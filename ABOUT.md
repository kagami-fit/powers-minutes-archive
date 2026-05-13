# Powers Minutes Studio

## 一言で言うと

Codexで作成した議事録とImage-gen2図解画像を、日付別に見せる共有用Webアーカイブです。生成・編集はCodex側で行い、このサイトは閲覧専用として使います。

## 何ができるのか

- Codexで作成した議事録を日付ごとに一覧表示
- 要約、議題、決定事項、アクション、課題、次回までの対応を閲覧
- Codex内のImage-gen2で作成した図解PNGを議事録に紐づけて表示
- 文字起こし全文がある場合は詳細内で閲覧
- 閲覧者向けにはアップロード、削除、APIキー設定などの操作を表示しない

## 構成

- `server/index.js` — 共有サイトを配信する読み取り専用Expressサーバー
- `server/minutes.js` — Codex側で使う議事録生成ロジックとImage-gen2用プロンプト生成ロジック
- `scripts/add-record.js` — Codexで作成した議事録と図解画像を `public/records.json` に登録する補助スクリプト
- `.github/workflows/pages.yml` — GitHub Pagesへ `public/` を公開する自動デプロイ設定
- `public/index.html` — アプリ画面
- `public/styles.css` — 画面デザイン
- `public/app.js` — フロントエンドの日付別表示と詳細表示
- `public/records.json` — 公開する議事録一覧
- `public/records/` — 図解PNGや文字起こしTXTの保存先
- `assets/` — POWERS GYMリニューアルHPで使う店舗写真・ロゴ素材
- `index.html` — POWERS GYMリニューアルHPの静的サイト本体
- `styles.css` — POWERS GYMリニューアルHPのデザイン
- `script.js` — POWERS GYMリニューアルHPのメニュー・問い合わせ導線
- `serve-site.sh` — POWERS GYMリニューアルHPのローカル確認用サーバー起動スクリプト

## 使い方

```bash
npm install
npm run dev
```

起動後、ブラウザで以下を開きます。

```text
http://localhost:3000
```

GitHub Pagesで公開する場合は、GitHubリポジトリに `main` ブランチをpushします。push後、GitHub Actionsが `public/` フォルダを静的サイトとして公開します。

```bash
git push -u origin main
```

議事録を追加するときは、Codexに音声・動画・文字起こしを渡して生成します。作成済みの文字起こしTXTと図解PNGを登録する場合は、以下を使います。

```bash
npm run add-record -- \
  --title "週次MTG" \
  --date 2026-05-13 \
  --participants "佐藤,鈴木" \
  --transcript ./meeting.txt \
  --diagram ./diagram.png
```

## 状態

- ルートプロジェクト — 開発中
- `server/` — 稼働中。閲覧専用サーバーとして実装済み
- `public/` — 稼働中。日付別アーカイブ、詳細表示、図解画像表示を実装済み
- `scripts/` — 稼働中。Codex生成物の登録補助を実装済み
- `data/` — 旧MVPの実行時データ用。共有サイトでは未使用
- `assets/` — 稼働中。POWERS GYMリニューアルHPの画像素材として使用

---

# POWERS GYM リニューアルHP

## 一言で言うと

POWERS GYM公式サイトを、40代以降の方やジム初心者が入りやすい完全個室パーソナルジムの静的Webサイトとして再構築したものです。完全個室・マンツーマン・相談しやすさを前面に出しています。

## 何ができるのか

- 新丸子・武蔵小杉エリアの完全個室パーソナルジムとして、店舗情報・料金・設備・利用シーンを案内
- 初回相談、体験、パーソナルトレーニングの導線を整理
- 40代以降・初心者向けに「人目が気にならない」「無理なく始められる」訴求へ変更
- 電話、相談フォーム、体験相談への導線を設置
- スマホ表示では下部固定CTAから電話・相談・体験へすぐ移動可能

## 構成

- `index.html` — サイト本体。各セクション、フォーム、Google Map、構造化データを含む
- `styles.css` — デザイン、レスポンシブ、モバイルメニュー、固定CTAのスタイル
- `script.js` — モバイルメニュー、ヘッダー変化、問い合わせフォームのメール起動処理
- `assets/` — 元サイトから取得した店舗写真・ロゴ画像

## 使い方

```bash
python3 -m http.server 4173
```

ブラウザで以下を開きます。

```text
http://localhost:4173/
```

Codex外で安定して起動する場合：

```bash
./serve-site.sh
```

## 状態

- ルートの静的HP — 稼働中。`index.html` から表示可能
- `assets/` — 稼働中。店舗写真・ロゴを配置済み
- `serve-site.sh` — 稼働中。ローカル確認用
- 問い合わせフォーム — 開発中。現状は送信時にメール作成画面を開く仕様
- 体験相談導線 — 稼働中。問い合わせフォームへ遷移
