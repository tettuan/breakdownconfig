#!/bin/bash

# Fix override modifiers in polymorphic_error_system.ts

FILE="src/errors/polymorphic_error_system.ts"

# Backup the file
cp "$FILE" "$FILE.backup"

# Fix all isRecoverable methods (except the abstract one on line 85)
sed -i '' '145s/isRecoverable/override isRecoverable/' "$FILE"
sed -i '' '189s/isRecoverable/override isRecoverable/' "$FILE"
sed -i '' '254s/isRecoverable/override isRecoverable/' "$FILE"
sed -i '' '303s/isRecoverable/override isRecoverable/' "$FILE"
sed -i '' '356s/isRecoverable/override isRecoverable/' "$FILE"
sed -i '' '376s/isRecoverable/override isRecoverable/' "$FILE"
sed -i '' '404s/isRecoverable/override isRecoverable/' "$FILE"

# Fix severity overrides for UnknownError
sed -i '' '384s/readonly severity/override readonly severity/' "$FILE"

echo "Fixed override modifiers in $FILE"