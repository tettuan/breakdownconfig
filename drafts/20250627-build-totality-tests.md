# プロジェクト: Total Function Testing

すべてのテストを完成させる。
エラーを0件にするまで、チームを構成し、部下へ作業を割り当てる。

`Total Function` について、必ず `docs/totality.md` を参照すること。
ビジネスドメイン情報は、 `docs/index.ja.md` および `docs/glossary.ja.md` を必ず読むこと。
テスト戦略は、`docs/tests.ja.md`
他の`docs/*`資料は、適宜実装ファイルを変更するタイミングで読むこと。

## チームの構成

あなたは指揮官であり上司である。
最初にチームを立ち上げて進める。

`instructions/team-head.ja.md` に詳細の記載がある。
チーム立ち上げの指示なので、必ず最初に読むこと。
各paneの存在を確認し、無ければ起動し、あればClaudeの起動を確認すること。全員を調べ、Claudeが起動していない部下に対し,Claude起動する。

## 実施内容

1. 資料を読んで、ドメインに基づいた Totality を理解する。
2. 理解した結果を tmp/ 配下に作成し、ドメイン情報として保持する。
3. `deno task ci`し、全ての問題が解消するまで修正を続ける

## 完了条件

1. `deno task ci`がpassする

# タスクの進め方

- Git:
  - 現在のGitブランチが適切か判断する (see @instructions/git-workflow.md)
  - 作成が必要なら Git ブランチを作成し、移動する
- サイクル: 仕様把握 → 調査 → 計画・設計 → 実行 → 記録・検証 → 学習 → 仕様把握へ戻る
- アサイン: サイクル段階に応じて、メンバーの役割を変更し最適アサイン。常時フル稼働を目指す。

### 進捗更新

- 進捗させるべきタスクは `tmp/tasks.md` に書き出し、完了マークをつけたりしながら進めてください。
- すべてが完了したら、`tmp/completed.md` に完了したレポートを記録してください。

# 作業開始指示

まずチームを立ち上げます。
チーム全体のパフォーマンスが重要です。
ワーカープールマネージャーを活躍させ、すべてのゴルーチンをフル稼働させてください。
今なにをすべきか（タスク分割や、状況整理、要件定義）について、ワーカープールマネージャーが把握していることが重要です。
ワーカープールマネージャーには、部下ゴルーチンへ指示を割り当てさせてください。(完了した部下を/clear実行しトークン管理すること。)
常に冷静に判断し、浮かれることなく、軍隊やSWAT級の遂行力を発揮すること。

プロジェクトの成功を祈ります。開始してください。
