---
name: release-procedure
description: Use when user says 'release', 'リリース', 'deploy', 'publish', 'vtag', 'version up', 'バージョンアップ', or discusses merging to main/develop. Guides through version bump and release flow.
allowed-tools: [Bash, Read, Edit, Grep, Glob]
---

# リリース手順ガイド

## 責務

リリースフロー全体を管理する（version bump → PR → merge → tag の手順）。

- ブランチ戦略・命名規則の詳細は `/branch-management` skill を参照
- CI 実行方法・エラー対処の詳細は `/local-ci` skill を参照

## バージョン管理ファイル

このプロジェクトでは `deno.json` の `version` フィールドのみでバージョンを管理する。

## リリースフロー

### フロー図

```
develop → release/x.y.z → (bump & CI) → PR: release → develop → PR: develop → main → tag → JSR publish
```

### 手順詳細

#### ステップ 1: release/* ブランチ作成

```bash
git checkout develop
git pull origin develop
git checkout -b release/x.y.z
```

#### ステップ 2: バージョンアップ

```bash
# ブランチ名から自動検出してバージョン更新
scripts/bump_version.sh

# または明示的に指定
scripts/bump_version.sh x.y.z

# 確認
grep '"version"' deno.json
```

#### ステップ 3: ローカルCI確認

```bash
scripts/local_ci.sh
```

#### ステップ 4: プッシュ

```bash
git push -u origin release/x.y.z
```

#### ステップ 5: release/* → develop PR

```bash
gh pr create --base develop --head release/x.y.z \
  --title "Release x.y.z: <変更概要>" \
  --body "## Summary
- <変更点>

## Version
- x.y.z"
```

#### ステップ 6: CI確認 & develop へマージ

```bash
gh pr checks <PR番号> --watch
gh pr merge <PR番号> --merge
```

#### ステップ 7: develop → main PR

```bash
gh pr create --base main --head develop \
  --title "Release x.y.z" \
  --body "Release version x.y.z to production"
```

#### ステップ 8: CI確認 & main へマージ

```bash
gh pr checks <PR番号> --watch
gh pr merge <PR番号> --merge
```

#### ステップ 9: tag 作成（JSR publish トリガー）

```bash
git checkout main
git pull origin main
scripts/create_release_tag.sh
```

tag push が `publish.yml` をトリガーして JSR publish が自動実行される。

#### ステップ 10: クリーンアップ

```bash
git branch -d release/x.y.z
git push origin --delete release/x.y.z
```

## 重要: 連続マージの禁止事項

**release/* → develop → main への連続マージは、必ずユーザーの明示的な指示を受けてから実行すること。**

禁止事項:
- ユーザーの指示なしに連続マージを実行
- 「リリースして」等の曖昧な指示で main まで一気にマージ
- 独自判断での develop → main マージ

正しい手順:
1. 各 PR 作成後、ユーザーに報告して次の指示を待つ
2. 「develop まで」「main まで」等の明示的な指示を確認
3. tag 作成もユーザーの指示を待つ

## クイックリファレンス

```
バージョンアップ:
  1. develop から release/x.y.z 作成
  2. scripts/bump_version.sh 実行
  3. scripts/local_ci.sh 実行
  4. git push -u origin release/x.y.z

リリースフロー:
  1. PR: release/x.y.z → develop 作成 & マージ
  2. PR: develop → main 作成 & マージ
  3. main で scripts/create_release_tag.sh → JSR publish 自動
  4. release/* ブランチ削除

関連Skill:
  - CI実行・エラー対処 → /local-ci, /ci-troubleshooting
  - ブランチ戦略・削除判断 → /branch-management
```

## トラブルシューティング

### JSR publish がスキップされた

原因: deno.json のバージョンが既存と同じ

```bash
gh run view <run-id> --log | grep -i "skip"
```

### CI バージョンチェック失敗

原因: deno.json とブランチ名の不一致

```bash
grep '"version"' deno.json
git branch --show-current
# 対処: scripts/bump_version.sh を再実行
```

### tag が古いコミットを指している

```bash
git show vx.y.z --oneline

# 対処: タグ削除 & 再作成
git tag -d vx.y.z
git push origin :refs/tags/vx.y.z
scripts/create_release_tag.sh
```
