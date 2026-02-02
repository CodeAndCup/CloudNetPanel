#!/usr/bin/env node

/**
 * Comprehensive Code Quality Check
 * Validates all server files for common issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Running comprehensive code quality check...\n');

const issues = [];
const warnings = [];

// Check all JS files recursively
function checkDirectory(dir, relativePath = '') {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const itemRelativePath = path.join(relativePath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, database, backups, logs
      if (!['node_modules', 'database', 'backups', 'logs', 'coverage', '__tests__'].includes(item)) {
        checkDirectory(fullPath, itemRelativePath);
      }
    } else if (item.endsWith('.js')) {
      checkFile(fullPath, itemRelativePath);
    }
  }
}

function checkFile(filePath, relativePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for common issues
  
  // 1. Unclosed brackets/braces
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push(`${relativePath}: Mismatched braces (${openBraces} open, ${closeBraces} close)`);
  }
  
  const openBrackets = (content.match(/\[/g) || []).length;
  const closeBrackets = (content.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    issues.push(`${relativePath}: Mismatched brackets (${openBrackets} open, ${closeBrackets} close)`);
  }
  
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push(`${relativePath}: Mismatched parentheses (${openParens} open, ${closeParens} close)`);
  }
  
  // 2. Console.log in production code (warning only)
  if (content.includes('console.log') && !relativePath.includes('test.js')) {
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('console.log') && !line.trim().startsWith('//')) {
        warnings.push(`${relativePath}:${i+1}: console.log found (should use logger)`);
      }
    });
  }
  
  // 3. Missing module.exports in non-test files
  if (!relativePath.includes('test.js') && 
      !relativePath.includes('index.js') &&
      !relativePath.includes('config') &&
      !content.includes('module.exports')) {
    warnings.push(`${relativePath}: No module.exports found`);
  }
  
  // 4. Mixed callback/promise style
  if (content.includes('async ') && content.match(/function.*\(err,/)) {
    warnings.push(`${relativePath}: Mixed async/await and callback style detected`);
  }
  
  // 5. Duplicate module.exports
  const exportsCount = (content.match(/module\.exports\s*=/g) || []).length;
  if (exportsCount > 1) {
    issues.push(`${relativePath}: Multiple module.exports statements found (${exportsCount})`);
  }
}

// Run checks
checkDirectory(__dirname);

// Report results
console.log('📊 Results:\n');

if (issues.length === 0) {
  console.log('✅ No critical issues found!');
} else {
  console.log(`❌ Found ${issues.length} critical issue(s):\n`);
  issues.forEach(issue => console.log(`   ${issue}`));
}

console.log();

if (warnings.length === 0) {
  console.log('✅ No warnings!');
} else {
  console.log(`⚠️  Found ${warnings.length} warning(s):\n`);
  warnings.slice(0, 10).forEach(warning => console.log(`   ${warning}`));
  if (warnings.length > 10) {
    console.log(`   ... and ${warnings.length - 10} more`);
  }
}

console.log('\n' + '='.repeat(50));
if (issues.length === 0) {
  console.log('✅ Code quality check PASSED!');
  process.exit(0);
} else {
  console.log('❌ Code quality check FAILED!');
  process.exit(1);
}
