---
name: local-ci
description: Run local CI checks before merge or push
---

push前にCIを通すため、`scripts/local_ci.sh` を実行する。エラー時は `LOG_LEVEL=debug scripts/local_ci.sh` で詳細確認する。

全チェック通過までpush禁止。
