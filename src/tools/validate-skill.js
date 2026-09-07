#!/usr/bin/env node
/**
 * Kilo-Kit Skill Validator (Node.js)
 * 
 * Validates skill files for correctness, completeness, and quality.
 * 
 * Usage:
 *   node validate-skill.js <skill-path>
 *   node validate-skill.js --all <skills-directory>
 *   node validate-skill.js skills/kilo-kit/debugging/systematic --verbose
 */

import fs from 'node:fs';
import path from 'node:path';

// ============ Configuration ============

// Modern agent skills, including Claude/Codex-compatible skills, commonly use
// only `name` and `description`. Kilo-Kit core skills may include richer
// metadata, but imported skill packs should not fail validation solely because
// they omit framework-specific fields such as `version`.
const REQUIRED_FRONTMATTER = ['name', 'description'];
const RECOMMENDED_FRONTMATTER = ['version', 'behaviors', 'token_estimate', 'dependencies'];

// Keep this empty for library compatibility. Skills from different ecosystems
// use headings such as Overview, Workflow, Quick start, Rules, or Reference map.
// Those sections are useful and recommended below, but not required.
const REQUIRED_SECTIONS = [];

const RECOMMENDED_SECTIONS = [
    'Overview',
    'When to Use',
    'Process|Workflow|TDD|OWASP',
    'Guidelines',
    'Prerequisites',
    'Success Criteria',
    'Related Skills'
];

// ============ Colors ============

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[91m',
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    blue: '\x1b[94m',
    gray: '\x1b[90m'
};

// ============ YAML Parser (Regex-based) ============

function parseSimpleYaml(yamlStr) {
    const result = {};

    // Pattern 1: Simple key: value on single line
    // Pattern 2: key: >- followed by indented multiline

    // First, handle single-line values
    const singleLinePattern = /^([a-z_]+):\s*(\[.*\]|[^\n>|]+)$/gmi;
    let match;

    while ((match = singleLinePattern.exec(yamlStr)) !== null) {
        const key = match[1];
        let value = match[2].trim();

        // Skip multiline indicators
        if (value === '>-' || value === '>' || value === '|' || value === '|-' || value === '') {
            continue;
        }

        // Remove quotes
        value = value.replace(/^["']|["']$/g, '');
        result[key] = value;
    }

    // Handle multiline descriptions (>- or |)
    const multilinePattern = /^([a-z_]+):\s*[>|]-?\s*\n((?:[ \t]+[^\n]+\n?)+)/gmi;

    while ((match = multilinePattern.exec(yamlStr)) !== null) {
        const key = match[1];
        const lines = match[2].split('\n');
        const value = lines
            .map(line => line.trim())
            .filter(line => line)
            .join(' ');

        if (value) {
            result[key] = value;
        }
    }

    return result;
}

// ============ Frontmatter Parser ============

function parseFrontmatter(content) {
    if (!content.startsWith('---')) {
        return { frontmatter: null, body: content };
    }

    const endIndex = content.indexOf('---', 3);
    if (endIndex === -1) {
        return { frontmatter: null, body: content };
    }

    const yamlStr = content.slice(3, endIndex).trim();
    const body = content.slice(endIndex + 3).trim();

    try {
        const frontmatter = parseSimpleYaml(yamlStr);
        return { frontmatter, body };
    } catch (e) {
        return { frontmatter: null, body: content };
    }
}

// ============ Section Parser ============

function extractSections(body) {
    const sections = {};
    let currentSection = null;
    let currentContent = [];

    for (const line of body.split('\n')) {
        if (line.startsWith('## ')) {
            if (currentSection) {
                sections[currentSection] = currentContent.join('\n').trim();
            }
            // Remove emoji prefixes
            currentSection = line.slice(3).trim().replace(/^[^\w\s]+\s*/, '');
            currentContent = [];
        } else if (currentSection) {
            currentContent.push(line);
        }
    }

    if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
}

// ============ Validation ============

class ValidationResult {
    constructor(skillPath) {
        this.skillPath = skillPath;
        this.valid = true;
        this.issues = [];
        this.metadata = {};
    }

    addIssue(severity, message, location = '', suggestion = null) {
        this.issues.push({ severity, message, location, suggestion });
        if (severity === 'error') {
            this.valid = false;
        }
    }
}

function validateFrontmatter(frontmatter, result) {
    if (!frontmatter) {
        result.addIssue('error', 'No YAML frontmatter found', 'top of file',
            'Add YAML frontmatter between --- markers');
        return;
    }

    // Check required fields
    for (const field of REQUIRED_FRONTMATTER) {
        if (!frontmatter[field]) {
            result.addIssue('error', `Missing required field: ${field}`,
                'frontmatter', `Add '${field}:' to the YAML frontmatter`);
        }
    }

    // Check recommended fields
    for (const field of RECOMMENDED_FRONTMATTER) {
        if (!frontmatter[field]) {
            result.addIssue('info', `Optional metadata not present: ${field}`,
                'frontmatter', `Consider adding '${field}:' for better discoverability`);
        }
    }

    // Validate name format (kebab-case)
    if (frontmatter.name && !/^[a-z0-9-]+$/.test(frontmatter.name)) {
        result.addIssue('info',
            `Skill name '${frontmatter.name}' should be kebab-case`,
            'frontmatter.name', 'Use format like "my-skill-name"');
    }

    // Check for keywords in description
    if (frontmatter.description) {
        const keywordsMatch = frontmatter.description.match(/Keywords?:\s*(.+)/i);
        if (keywordsMatch) {
            const keywords = keywordsMatch[1].split(',').map(k => k.trim());
            result.metadata.keywords = keywords;
            if (keywords.length < 3) {
                result.addIssue('info',
                    `Only ${keywords.length} keywords found, recommend 3+`,
                    'frontmatter.description');
            }
        } else {
            result.addIssue('info',
                'No keywords found in description',
                'frontmatter.description',
                'Add "Keywords: keyword1, keyword2, ..." to description');
        }
    }

    // Validate version format
    if (frontmatter.version && !/^\d+\.\d+\.\d+$/.test(frontmatter.version)) {
        result.addIssue('warning',
            `Version '${frontmatter.version}' should be semver (x.y.z)`,
            'frontmatter.version');
    }
}

function validateSections(sections, result) {
    const sectionNames = Object.keys(sections);

    // Check required sections
    for (const section of REQUIRED_SECTIONS) {
        // Handle pipe-separated alternatives (e.g., "Process|Workflow|TDD")
        const alternatives = section.split('|');
        const found = sectionNames.some(s =>
            alternatives.some(alt => s.toLowerCase().includes(alt.toLowerCase()))
        );
        if (!found) {
            const displayName = alternatives[0]; // Show first alternative in error
            result.addIssue('error',
                `Missing required section: '## ${displayName}' (or equivalent)`,
                'body', `Add a '## ${displayName}' section to the skill`);
        }
    }

    // Check recommended sections
    for (const section of RECOMMENDED_SECTIONS) {
        const found = sectionNames.some(s =>
            s.toLowerCase().includes(section.toLowerCase())
        );
        if (!found) {
            result.addIssue('info',
                `Consider adding section: '## ${section}'`,
                'body');
        }
    }

    // Check Guidelines has DO and DON'T
    const guidelinesSection = Object.entries(sections).find(([name]) =>
        name.toLowerCase().includes('guidelines')
    );

    if (guidelinesSection) {
        const content = guidelinesSection[1];
        const hasDo = /###?\s*DO\s*[✅✓]?/i.test(content);
        const hasDont = /###?\s*DON'?T\s*[❌✗]?/i.test(content);

        if (!hasDo) {
            result.addIssue('info', "Guidelines missing '### DO ✅' subsection", 'Guidelines');
        }
        if (!hasDont) {
            result.addIssue('info', "Guidelines missing '### DON'T ❌' subsection", 'Guidelines');
        }
    }

    result.metadata.sections = sectionNames;
}

function validateSkill(skillPath) {
    const result = new ValidationResult(skillPath);

    // Check if directory exists
    if (!fs.existsSync(skillPath)) {
        result.addIssue('error', 'Path does not exist', skillPath);
        return result;
    }

    const stats = fs.statSync(skillPath);

    // Determine SKILL.md path
    let skillMdPath;
    if (stats.isDirectory()) {
        skillMdPath = path.join(skillPath, 'SKILL.md');
    } else if (skillPath.endsWith('SKILL.md')) {
        skillMdPath = skillPath;
    } else {
        result.addIssue('error', 'Not a skill directory or SKILL.md file', skillPath);
        return result;
    }

    // Check SKILL.md exists
    if (!fs.existsSync(skillMdPath)) {
        result.addIssue('error', 'Missing SKILL.md file', skillPath,
            'Create a SKILL.md file using the template');
        return result;
    }

    // Read content
    let content;
    try {
        content = fs.readFileSync(skillMdPath, 'utf-8');
    } catch (e) {
        result.addIssue('error', `Cannot read file: ${e.message}`, skillMdPath);
        return result;
    }

    // Parse frontmatter
    const { frontmatter, body } = parseFrontmatter(content);
    validateFrontmatter(frontmatter, result);

    // Parse and validate sections
    const sections = extractSections(body);
    validateSections(sections, result);

    // Check file size
    if (content.length < 500) {
        result.addIssue('warning',
            `SKILL.md seems too short (${content.length} chars)`,
            skillMdPath, 'Add more detail to make the skill useful');
    } else if (content.length > 50000) {
        result.addIssue('warning',
            `SKILL.md is very long (${content.length} chars)`,
            skillMdPath, 'Consider moving detail to references/');
    }

    return result;
}

// ============ Find Skills ============

function findAllSkills(basePath) {
    const skills = [];

    function search(dir) {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                search(fullPath);
            } else if (item === 'SKILL.md') {
                skills.push(path.dirname(fullPath));
            }
        }
    }

    search(basePath);
    return skills;
}

// ============ Output ============

function printResult(result, verbose = false) {
    const statusIcon = result.valid
        ? `${colors.green}✅ VALID${colors.reset}`
        : `${colors.red}❌ INVALID${colors.reset}`;

    console.log(`\n${statusIcon}: ${result.skillPath}`);

    const errors = result.issues.filter(i => i.severity === 'error');
    const warnings = result.issues.filter(i => i.severity === 'warning');
    const infos = result.issues.filter(i => i.severity === 'info');

    if (errors.length || warnings.length || (verbose && infos.length)) {
        console.log(`   └─ ${errors.length} errors, ${warnings.length} warnings, ${infos.length} info`);
    }

    for (const issue of result.issues) {
        if (issue.severity === 'info' && !verbose) continue;

        let icon, color;
        switch (issue.severity) {
            case 'error':
                icon = '❌'; color = colors.red; break;
            case 'warning':
                icon = '⚠️'; color = colors.yellow; break;
            default:
                icon = 'ℹ️'; color = colors.blue;
        }

        console.log(`      ${icon} ${color}${issue.message}${colors.reset}`);
        if (issue.location) {
            console.log(`         📍 ${issue.location}`);
        }
        if (issue.suggestion && verbose) {
            console.log(`         💡 ${issue.suggestion}`);
        }
    }
}

// ============ Main ============

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
Kilo-Kit Skill Validator

Usage:
  node validate-skill.js <skill-path>           Validate single skill
  node validate-skill.js --all <directory>      Validate all skills in directory
  
Options:
  --all, -a      Validate all skills under path
  --verbose, -v  Show all issues including info
  --help, -h     Show this help

Examples:
  node validate-skill.js skills/kilo-kit/debugging/systematic
  node validate-skill.js --all skills/kilo-kit
  node validate-skill.js skills/kilo-kit/debugging/systematic --verbose
`);
        process.exit(0);
    }

    const verbose = args.includes('--verbose') || args.includes('-v');
    const all = args.includes('--all') || args.includes('-a');

    // Get path (first non-flag argument)
    const targetPath = args.find(a => !a.startsWith('-')) || '.';
    const resolvedPath = path.resolve(targetPath);

    // Find skills
    let skills;
    if (all) {
        skills = findAllSkills(resolvedPath);
        if (skills.length === 0) {
            console.log(`No skills found under ${resolvedPath}`);
            process.exit(1);
        }
    } else {
        skills = [resolvedPath];
    }

    // Validate
    const results = [];
    for (const skillPath of skills) {
        const result = validateSkill(skillPath);
        results.push(result);
        printResult(result, verbose);
    }

    // Summary
    const validCount = results.filter(r => r.valid).length;
    const totalCount = results.length;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`SUMMARY: ${validCount}/${totalCount} skills valid`);

    if (validCount < totalCount) {
        console.log('Run with --verbose for more details');
        process.exit(1);
    } else {
        console.log(`${colors.green}All skills passed validation! ✅${colors.reset}`);
        process.exit(0);
    }
}

main();
