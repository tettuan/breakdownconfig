#!/bin/bash

# Fix validationError to configValidationError in error files

echo "Fixing validationError to configValidationError..."

# Fix in unified_error_i18n.ts
sed -i '' 's/"validationError"/"configValidationError"/g' src/errors/unified_error_i18n.ts

# Fix in legacy_adapter.ts
sed -i '' 's/"validationError"/"configValidationError"/g' src/errors/legacy_adapter.ts

# Fix in throw_to_result.ts
sed -i '' 's/"validationError"/"configValidationError"/g' src/errors/throw_to_result.ts

# Fix in JSON files
sed -i '' 's/"validationError"/"configValidationError"/g' src/errors/config_error_messages.json
sed -i '' 's/"validationError"/"configValidationError"/g' src/errors/unified_error_messages.json

# Fix in migration guide
sed -i '' 's/"validationError"/"configValidationError"/g' src/errors/migration_guide.md

echo "Fixed validationError references"