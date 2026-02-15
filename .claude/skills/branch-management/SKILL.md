---
name: branch-management
description: Review and guide branch strategy when creating PRs, merging, or creating branches involving main, develop, and release branches
allowed-tools: [Bash, Read, Grep, Glob]
---

# ブランチ管理ガイド

## 責務

ブランチ戦略・命名規則・PR作成ルールを管理する。

- リリースフロー全体（version bump → tag → merge）は `/release-procedure` skill を参照
- CI 実行方法・エラー対処は `/local-ci` skill を参照

## ブランチ戦略

### ブランチの役割

| ブランチ | 役割 | 派生元 |
|---------|------|--------|
| `main` | 本番リリース（tag 付与対象） | - |
| `develop` | 開発統合ブランチ | - |
| `release/*` | リリース準備 | develop |
| `feature/*` | 新機能 | develop |
| `fix/*` | バグ修正 | develop |
| `refactor/*` | リファクタリング | develop |
| `docs/*` | ドキュメント | develop |

### フロー

```
feature/* ─┐
fix/*      ├─→ develop → release/* → develop → main → tag
refactor/* ─┘
```

## ルール一覧

| 操作 | 許可 | 禁止 |
|------|------|------|
| main への変更 | develop からの PR マージのみ | 直接 push、他ブランチからのマージ |
| develop への変更 | 作業ブランチ or release/* からの PR マージ | 直接 push |
| release/* の作成 | develop から派生 | main や作業ブランチから派生 |
| 作業ブランチの作成 | develop から派生 | main から直接派生 |

## 実施手順

### 作業ブランチを作成する場合

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

### PR を作成する場合

| 現在のブランチ | PR先 | コマンド例 |
|---------------|------|-----------|
| feature/*, fix/*, refactor/*, docs/* | develop | `gh pr create --base develop` |
| release/* | develop | `gh pr create --base develop` |
| develop | main | `gh pr create --base main` |

### マージ方法の選択基準

| マージ方法 | 使用場面 | コマンド |
|-----------|---------|---------|
| Squash | 作業ブランチ → develop（複数コミットを1つに） | `gh pr merge --squash` |
| Merge | release → develop（履歴保持） | `gh pr merge --merge` |
| Merge | develop → main（履歴保持） | `gh pr merge --merge` |

## 警告パターン

以下の操作を検知した場合は警告:

| 操作 | 警告メッセージ |
|------|---------------|
| `git push origin main` | main への直接 push は禁止です。develop からの PR を作成してください。 |
| `git push origin develop` | develop への直接 push は禁止です。作業ブランチからの PR を作成してください。 |
| `git checkout -b feature/* main` | 作業ブランチは develop から派生してください。 |
| `git merge main` | main からのマージは想定外です。派生元を確認してください。 |

## クイックリファレンス

```
作業開始:
  git checkout develop && git pull origin develop
  git checkout -b feature/my-work

作業完了（PR作成）:
  gh pr create --base develop

PRマージ:
  gh pr checks <PR番号>
  gh pr merge <PR番号> --squash   # 作業ブランチ用
  gh pr merge <PR番号> --merge    # release/develop用

完全リリースフロー:
  /release-procedure skill を参照
```
