# Semantic Consistency Verification

設計・実装・説明の三角形の意味的整合性を確認する（形式一致ではなく意味一致）。

## 三角形

| 関係 | 確認内容 |
|------|----------|
| 設計→実装 | APIシグネチャ・フローが設計通りか |
| 実装→説明 | public export・デフォルト値・CLI動作が正確に説明されているか |
| 設計→説明 | 設計意図・制約がユーザーに伝わるか |

## チェック方法

```bash
# 設計APIと実装exportの比較
grep -E "^(export|async|function)" docs/internal/<design>.md
grep "^export" src/<module>/mod.ts

# デフォルト値の整合
grep -E "= (true|false|\"[^\"]+\"|[0-9]+)" src/<module>/types.ts
grep -i "default" README.md
```

## 不整合パターン

| パターン | 対処 |
|---------|------|
| 実装先行（設計・説明が未記載） | 設計更新→説明追加 |
| 説明が古い（設計・実装は新仕様） | docs更新 |
| 設計と実装が乖離 | 設計を実装に合わせて更新→説明も更新 |

検証優先順: CLI/API動作説明 > デフォルト値・オプション組合せ > エラー・制限事項 > 内部整合
