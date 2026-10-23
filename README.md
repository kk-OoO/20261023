# ⚡ NEON CYBER RUNNER 2026 (Next.js × Vercel)

Next.js 16 + React 19 + Tailwind CSS 4 で構築された、サイバーパンク風ネオンスネークゲームです。  
Vercel デプロイ課題用プロジェクトとして最適化されています。

---

## 🎮 ゲームの特徴
- **Web Audio API による効果音 & レトロBGM**: 外部音源不要、ブラウザ上でリアルタイム合成
- **ネオンエフェクト & パーティクル**: 取得時の光の演出
- **3種類のアイテム**:
  - 🟢 **グリーンオーブ**: +10点、長さ成長
  - 🟡 **ゴールドスター**: +50点、レアボーナス
  - 🔵 **タイムワープ**: +25点、一時的にスピード減速
- **難易度選択**: EASY / NORMAL / HARD
- **スマホ・PC両対応**: 矢印キー/WASDに加え、オンスクリーン十字キーを完備
- **ハイスコア保存**: ブラウザ（localStorage）に自動保存

---

## 💻 ローカルでの起動方法 (ローカル確認)

PowerShell またはターミナルで本フォルダを開き、以下を実行します：

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開くとゲームが遊べます。

---

## 🚀 Vercel へのデプロイ手順 (課題の提出方法)

### 方法1: GitHub連携による王道デプロイ（推奨）

1. **GitHub でリポジトリを作成**
   - [GitHub](https://github.com/) にアクセスし、右上の「+」から「New repository」をクリック
   - リポジトリ名（例: `neon-cyber-runner`）を入力して「Create repository」

2. **ローカルから GitHub に Push**
   ターミナルで以下を実行します：
   ```powershell
   git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
   git branch -M main
   git push -u origin main
   ```

3. **Vercel と GitHub を連携してデプロイ**
   - [Vercel](https://vercel.com/) にログイン（「Continue with GitHub」）
   - 「Add New...」→「Project」をクリック
   - 先ほど作成した GitHub リポジトリを選択して「Import」
   - 「Deploy」ボタンをクリックすれば、約1分で全世界に自動公開されます！

---

### 方法2: ワンクリック Claim (即時デプロイ済みリンク)

すでに Vercel 上にデプロイ済みのインスタンスが生成されています：
- **ゲーム公開URL**: [https://turbo-lilac-ys3yg3p.tmp.now](https://turbo-lilac-ys3yg3p.tmp.now)
- **Claim URL (ご自身のアカウントに紐付けるリンク)**: [https://vercel.com/claim-deployment?code=f12c2c52-db9d-452a-a191-2ae5be48d423](https://vercel.com/claim-deployment?code=f12c2c52-db9d-452a-a191-2ae5be48d423)
