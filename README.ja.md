# just-enough-claude-code

[English](README.md) | **日本語**

[![CI](https://github.com/imag-fff/just-enough-claude-code/actions/workflows/ci.yml/badge.svg)](https://github.com/imag-fff/just-enough-claude-code/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

小規模なプロジェクトのための、最小限でテストしやすい [Claude Code](https://claude.com/claude-code) ハーネスです。hooks 4本、agents 3体、commands 3個、skill 1個。インストール方法はひとつだけ、ランタイム依存はゼロ、hook はすべてユニットテスト済みです。

着想は [everything-claude-code (ECC)](https://github.com/affaan-m/ECC) から得ました。ECC はエージェントハーネスをどこまで作り込めるかを示すプロジェクトですが、こちらはあえて逆を狙っています。小さなプロジェクトなら、ハーネスの最初の 5% でほとんどの価値が手に入ります。ただし、読めて、テストできて、信頼できるサイズに収まっていることが条件です。設計の考え方は [docs/design.ja.md](docs/design.ja.md) に詳しく書きました。

## なぜ「just enough（必要十分）」なのか

- **インストールはひとつの方法だけ。** `install.sh` がハーネスをプロジェクトにコピーします。プラグインマーケットプレイスもプロファイルもなく、どの入れ方を選ぶかで悩むこともありません。
- **30分あれば全部読めます。** ファイルは15個ほど。ツールが呼ばれるたびに何が走るのかを、使い始める前に把握できます。
- **hook はすべて純関数で、テストが付いています。** hook は `run(input) → {exitCode, stderr}` を export するだけで、プロセスの入出力は共有モジュール1箇所にまとめてあります。テストは22本、push のたびに CI が走ります。
- **標準でプロジェクトローカル。** すべてがプロジェクトの `.claude/` に収まり、コードと一緒にバージョン管理されます。`~/.claude/` や他のプロジェクトには手を出しません。
- **壊れても止めない、止めるときは理由を添えて。** hook がクラッシュしてもアクションはそのまま通します（シートベルトが勝手に車を止めては困るのと同じです）。意図して止めるときは、理由をモデルにきちんと伝えて、軌道修正を促します。

## 中身

```
.claude/
├── settings.json          # hook の登録と、シークレットへの Read 拒否ルール
├── hooks/
│   ├── lib.js             # 共有の I/O 層。hook 本体は純関数に保つ
│   ├── guard-bash.js      # PreToolUse: 危険なシェルコマンドを止める
│   ├── guard-files.js     # PreToolUse: .env・秘密鍵・secrets への書き込みを止める
│   ├── track-edits.js     # PostToolUse: 編集したファイルをすべて記録
│   └── session-summary.js # Stop: 編集履歴を .claude/logs/sessions.log に集約
├── agents/
│   ├── code-reviewer.md   # 確信が持てた指摘だけを返す diff レビュー
│   ├── test-writer.md     # プロジェクトの規約に沿ってテストを足す
│   └── explorer.md        # 読み取り専用のコード調査（中身の羅列ではなく結論を返す）
├── commands/
│   ├── commit.md          # /commit: 論理単位に分けた Conventional Commits。push はしない
│   ├── review.md          # /review: code-reviewer agent による diff レビュー
│   └── fix-tests.md       # /fix-tests: テストスイートをグリーンに戻す
└── skills/tdd/SKILL.md    # 厳格なルール付きの red-green-refactor ループ
```

このほかに、`install.sh`（インストーラー）、`scripts/merge-settings.js`（settings を壊さずにマージする）、`templates/CLAUDE.md.template`（プロジェクトメモリの雛形）、`tests/`（ユニットテストとマニフェスト整合性テスト）があります。

| Hook | イベント | 役割 |
|---|---|---|
| `guard-bash` | PreToolUse (Bash) | `rm -rf /`、main への force push、`curl \| sh`、`chmod 777`、`git checkout .` を止め、理由をモデルに返す |
| `guard-files` | PreToolUse (Edit/Write) | `.env*`、秘密鍵、`secrets/`、`.ssh/` への書き込みを止める（`.env.example` は編集可） |
| `track-edits` | PostToolUse (Edit/Write) | 編集したパスをセッションごとの状態ファイルに追記する |
| `session-summary` | Stop | 「エージェントが何に触れたか」を `.claude/logs/sessions.log` に記録する |

## クイックスタート

必要なものは、Claude Code CLI、Node.js 18 以上（hook のランタイム）、bash です。

```bash
git clone https://github.com/imag-fff/just-enough-claude-code.git
cd just-enough-claude-code
./install.sh /path/to/your/project        # --dry-run で事前確認できます
```

インストーラーの動きはこうです。

1. `agents/`、`commands/`、`skills/`、`hooks/` をプロジェクトの `.claude/` にコピーする
2. `settings.json` をコピーする。すでにある場合は、既存の項目には触れず、hooks と deny ルールだけをマージする
3. プロジェクトに `CLAUDE.md` がなければ、雛形を置く

既存のファイルは上書きしません（上書きしたいときは `--force`）。何度実行しても結果は同じなので、繰り返し走らせても安全です。

確認してみましょう。

```bash
cd /path/to/your/project && claude   # 起動中なら Claude Code を再起動してください
```

Claude Code で `/hooks` を実行すると、4本の hook が登録されているのが見えます。試しに Claude へ `git checkout .` を実行させてみてください。ガードが理由を添えて断ってくるはずです。

## カスタマイズ

このハーネスは、その場で書き換えながら使うことを前提にしています。インストールした時点で、もうあなたのプロジェクトのコードです。

**ガードのルールを足す**（30秒）: `.claude/hooks/guard-bash.js` の `RULES` に1行追加します。

```js
{ pattern: /\bdocker\s+system\s+prune\b/, reason: 'Prunes shared local Docker state.' },
```

**新しい hook を足す**（3ステップ）:

1. `.claude/hooks/my-hook.js` を作り、`run(input)` を export して `main(run)` を呼びます。既存の hook を雛形にコピーするのが手早いです。
2. `.claude/settings.json` の該当イベントに登録します。
3. `tests/` にテストを足します。登録とファイルが食い違っているあいだはマニフェストテストが落ちますが、これは意図した動きです。

**いらないものを消す**: ファイルと登録を削除するだけです。整合性はマニフェストテストが見てくれます。

## テストの実行

```bash
npm test            # node --test で22本。追加のインストールは不要です
```

各ガードの許可／ブロックの組み合わせ、編集トラッキングのパイプライン（一時ディレクトリに対する実際の I/O）、settings のマージ（何度やっても同じ結果になること、ユーザーのデータが守られること）、そして「登録された hook が実在するか、同梱した hook が登録されているか」のマニフェストチェックまでをカバーしています。

## 設計

何をあえて入れなかったか、hook の構造、セキュリティの考え方など、設計上の判断は [docs/design.ja.md](docs/design.ja.md)（[English](docs/design.md)）にまとめました。

## 謝辞

- Affaan Mustafa 氏の [everything-claude-code](https://github.com/affaan-m/ECC)。テストしやすい hook のパターン（`run()` を export し、プロセス処理は薄いラッパーに任せる形）は、ECC の hook アーキテクチャを参考にさせてもらいました。

## ライセンス

[MIT](LICENSE)
