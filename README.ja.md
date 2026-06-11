# just-enough-claude-code

[English](README.md) | **日本語**

[![CI](https://github.com/imag-fff/just-enough-claude-code/actions/workflows/ci.yml/badge.svg)](https://github.com/imag-fff/just-enough-claude-code/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

小規模プロジェクト向けの、最小限でテスト可能な [Claude Code](https://claude.com/claude-code) ハーネス:
**hooks 4本、agents 3体、commands 3個、skill 1個 — インストール経路は1つ、ランタイム依存ゼロ、全 hook をユニットテスト済み。**

[everything-claude-code (ECC)](https://github.com/affaan-m/ECC) に着想を得ています。ECC はエージェントハーネスがどこまで行けるかを示すプロジェクトですが、本プロジェクトは逆の賭けをしています: 小規模プロジェクトでは、ハーネスの最初の 5% が価値の大半を生む — ただし**読めて、テストできて、信頼できる**サイズである限り。設計思想の全文は [docs/design.ja.md](docs/design.ja.md) を参照してください。

## なぜ「just enough (必要十分)」なのか

- **インストール経路は1つだけ。** `install.sh` がプロジェクトにハーネスをコピーするだけ。プラグインマーケットプレイスも、プロファイルも、複数のインストール方法の組み合わせ問題もありません。
- **30分で全部読めるサイズ。** 約15ファイル。ツール呼び出しのたびに何が実行されるのか、使う前に完全に把握できるべきです。
- **全 hook が純関数 + テスト付き。** hook は `run(input) → {exitCode, stderr}` を export し、プロセス I/O は共有モジュール1箇所に集約。22テスト、push のたびに CI が走ります。
- **デフォルトでプロジェクトローカル。** すべてプロジェクトの `.claude/` に入り、コードと一緒にバージョン管理されます。`~/.claude/` や他のプロジェクトには一切触れません。
- **壊れたら開く、ブロックは声高に。** クラッシュした hook はアクションを許可します (壊れたシートベルトが車を止めてはいけない)。ブロックする hook はモデルに理由を正確に伝え、軌道修正させます。

## 中身

```
.claude/
├── settings.json          # hook 登録 + シークレットへの Read 拒否ルール
├── hooks/
│   ├── lib.js             # 共有 I/O レイヤー — hook 本体は純関数のまま
│   ├── guard-bash.js      # PreToolUse: 破滅的なシェルコマンドをブロック
│   ├── guard-files.js     # PreToolUse: .env / 秘密鍵 / secrets への書き込みをブロック
│   ├── track-edits.js     # PostToolUse: 編集された全ファイルを記録
│   └── session-summary.js # Stop: 編集履歴を .claude/logs/sessions.log に集約
├── agents/
│   ├── code-reviewer.md   # 確信のある指摘のみを返す diff レビュー
│   ├── test-writer.md     # プロジェクトの規約に従ってテストを拡充
│   └── explorer.md        # 読み取り専用のコードベース調査 (ファイルダンプではなく結論を返す)
├── commands/
│   ├── commit.md          # /commit — 論理的に分割した Conventional Commits。push はしない
│   ├── review.md          # /review — code-reviewer agent による diff レビュー
│   └── fix-tests.md       # /fix-tests — テストスイートをグリーンに戻す
└── skills/tdd/SKILL.md    # 厳格なルール付き red-green-refactor ループ
```

その他: `install.sh` (インストーラー)、`scripts/merge-settings.js` (非破壊的な settings マージ)、`templates/CLAUDE.md.template` (プロジェクトメモリの雛形)、`tests/` (ユニットテスト + マニフェスト整合性テスト)。

| Hook | イベント | 役割 |
|---|---|---|
| `guard-bash` | PreToolUse (Bash) | `rm -rf /`、main への force push、`curl \| sh`、`chmod 777`、`git checkout .` をブロックし、理由をモデルにフィードバック |
| `guard-files` | PreToolUse (Edit/Write) | `.env*`、秘密鍵、`secrets/`、`.ssh/` への書き込みをブロック (`.env.example` は編集可) |
| `track-edits` | PostToolUse (Edit/Write) | 編集されたパスをセッションごとの状態ファイルに追記 |
| `session-summary` | Stop | 「エージェントが何を触ったか」を `.claude/logs/sessions.log` に記録 |

## クイックスタート

必要なもの: Claude Code CLI、Node.js 18 以上 (hooks のランタイム)、bash。

```bash
git clone https://github.com/imag-fff/just-enough-claude-code.git
cd just-enough-claude-code
./install.sh /path/to/your/project        # --dry-run でプレビュー可能
```

インストーラーの動作:

1. `agents/`、`commands/`、`skills/`、`hooks/` をプロジェクトの `.claude/` にコピー
2. `settings.json` をコピー — すでに存在する場合は、既存のエントリに一切触れずに hooks と deny ルールを**マージ**
3. プロジェクトに `CLAUDE.md` がなければ雛形を配置

既存ファイルは上書きしません (`--force` で上書き可)。冪等なので何度実行しても安全です。

動作確認:

```bash
cd /path/to/your/project && claude   # 起動中なら Claude Code を再起動
```

Claude Code 内で `/hooks` を実行すると、4本の hook が登録されているはずです。試しに Claude に `git checkout .` を実行させてみてください — ガードが理由付きで拒否する様子が見られます。

## カスタマイズ

このハーネスはその場で編集して使うことを前提にしています — インストールした時点であなたのプロジェクトのコードです。

**ガードルールの追加** (30秒): `.claude/hooks/guard-bash.js` の `RULES` に追記:

```js
{ pattern: /\bdocker\s+system\s+prune\b/, reason: 'Prunes shared local Docker state.' },
```

**新しい hook の追加** (3ステップ):

1. `.claude/hooks/my-hook.js` を作成し、`run(input)` を export して `main(run)` を呼ぶ — 既存の hook をスケルトンとしてコピーすれば OK。
2. `.claude/settings.json` の該当イベントに登録。
3. `tests/` にテストを追加。登録とファイルが一致するまでマニフェストテストが落ちます — これは意図した挙動です。

**不要なものの削除**: ファイルと登録を削除するだけ。整合性はマニフェストテストが確認します。

## テストの実行

```bash
npm test            # node --test で22テスト。依存パッケージのインストール不要
```

各ガードの許可/ブロックのマトリクス、編集トラッキングのパイプライン (一時ディレクトリに対する実 I/O)、settings マージ (冪等性・ユーザーデータの保全)、そして「登録された hook は実在するか / 同梱された hook は登録されているか」のマニフェストチェックをカバーしています。

## 設計

何を意図的に入れなかったか、hook の解剖、セキュリティモデルなど、設計判断の全文は [docs/design.ja.md](docs/design.ja.md) ([English](docs/design.md)) にあります。

## 謝辞

- Affaan Mustafa 氏の [everything-claude-code](https://github.com/affaan-m/ECC) — テスト可能な hook のパターン (`run()` の export + 薄いプロセスラッパー) は ECC の hook アーキテクチャから借用しています。

## ライセンス

[MIT](LICENSE)
