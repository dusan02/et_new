#!/bin/bash
# Check for dangerous return-newline patterns that can cause JSX syntax errors

echo "🔍 Checking for dangerous return-newline patterns..."

# Find all TypeScript/TSX files
files=$(find src -name "*.tsx" -o -name "*.ts" | grep -v node_modules)

if [ -z "$files" ]; then
  echo "❌ No TypeScript files found in src/"
  exit 1
fi

# Check for return followed by newline before JSX
errors=0
for file in $files; do
  if grep -nE 'return\s*$\s*<' "$file" > /dev/null 2>&1; then
    echo "❌ Found dangerous return-newline pattern in $file:"
    grep -nE 'return\s*$\s*<' "$file" | head -5
    echo "   Fix: Wrap with parentheses: return ( ... );"
    echo ""
    errors=$((errors + 1))
  fi
done

if [ $errors -eq 0 ]; then
  echo "✅ No dangerous return-newline patterns found"
  exit 0
else
  echo "❌ Found $errors file(s) with dangerous return-newline patterns"
  exit 1
fi
