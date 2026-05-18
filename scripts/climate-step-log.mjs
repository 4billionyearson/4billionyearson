#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { access, appendFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const cwd = process.cwd();

function usage() {
  console.error([
    'Usage:',
    '  node scripts/climate-step-log.mjs run --name "Step" [--window-start 10] [--window-end 25] [--outputs a,b] --log-path /tmp/run.jsonl -- command args...',
    '  node scripts/climate-step-log.mjs summarize --log-path /tmp/run.jsonl --md-path /tmp/summary.md --json-path /tmp/summary.json',
  ].join('\n'));
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function relativize(value) {
  return toPosix(path.relative(cwd, value));
}

async function exists(value) {
  try {
    await access(value);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const [mode, ...rest] = argv;
  if (!mode) {
    usage();
    process.exit(1);
  }

  if (mode === 'run') {
    const config = {
      mode,
      outputs: [],
      name: '',
      windowStart: null,
      windowEnd: null,
      logPath: '',
      command: [],
    };

    let index = 0;
    while (index < rest.length) {
      const arg = rest[index];
      if (arg === '--') {
        config.command = rest.slice(index + 1);
        break;
      }
      if (arg === '--name') {
        config.name = rest[index + 1] ?? '';
        index += 2;
        continue;
      }
      if (arg === '--window-start') {
        config.windowStart = Number(rest[index + 1]);
        index += 2;
        continue;
      }
      if (arg === '--window-end') {
        config.windowEnd = Number(rest[index + 1]);
        index += 2;
        continue;
      }
      if (arg === '--outputs') {
        config.outputs = (rest[index + 1] ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        index += 2;
        continue;
      }
      if (arg === '--log-path') {
        config.logPath = rest[index + 1] ?? '';
        index += 2;
        continue;
      }
      console.error(`Unknown argument: ${arg}`);
      usage();
      process.exit(1);
    }

    if (!config.name || !config.logPath || config.command.length === 0) {
      usage();
      process.exit(1);
    }

    return config;
  }

  if (mode === 'summarize') {
    const config = {
      mode,
      logPath: '',
      mdPath: '',
      jsonPath: '',
    };

    for (let index = 0; index < rest.length; index += 2) {
      const arg = rest[index];
      const value = rest[index + 1] ?? '';
      if (arg === '--log-path') config.logPath = value;
      else if (arg === '--md-path') config.mdPath = value;
      else if (arg === '--json-path') config.jsonPath = value;
      else {
        console.error(`Unknown argument: ${arg}`);
        usage();
        process.exit(1);
      }
    }

    if (!config.logPath || !config.mdPath || !config.jsonPath) {
      usage();
      process.exit(1);
    }

    return config;
  }

  console.error(`Unknown mode: ${mode}`);
  usage();
  process.exit(1);
}

async function readJsonSummary(filePath) {
  if (!filePath.endsWith('.json')) return null;
  try {
    const raw = await readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    const latestLabel =
      data?.noaaStats?.landOcean?.latestMonthStats?.label
      ?? data?.paramData?.tavg?.latestMonthStats?.label
      ?? data?.latestMonthStats?.label
      ?? data?.landLatestMonthStats?.label
      ?? null;
    const lastUpdated = data?.lastUpdated ?? null;
    const generatedAt = data?.generatedAt ?? null;
    if (!latestLabel && !lastUpdated && !generatedAt) return null;
    return { latestLabel, lastUpdated, generatedAt };
  } catch {
    return null;
  }
}

async function readFileState(filePath) {
  const fileStat = await stat(filePath);
  return {
    path: relativize(filePath),
    size: fileStat.size,
    mtimeMs: Math.round(fileStat.mtimeMs),
    summary: await readJsonSummary(filePath),
  };
}

async function walkDirectory(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkDirectory(fullPath));
      continue;
    }
    if (entry.isFile()) {
      files.push(await readFileState(fullPath));
    }
  }
  return files;
}

async function collectTargetState(target) {
  const resolved = path.resolve(cwd, target);
  if (!await exists(resolved)) {
    return {
      path: toPosix(target),
      kind: 'missing',
      files: [],
    };
  }

  const targetStat = await stat(resolved);
  if (targetStat.isDirectory()) {
    return {
      path: toPosix(target),
      kind: 'directory',
      files: await walkDirectory(resolved),
    };
  }

  return {
    path: toPosix(target),
    kind: 'file',
    files: [await readFileState(resolved)],
  };
}

function signature(file) {
  return `${file.size}:${file.mtimeMs}`;
}

function isWithinTarget(filePath, targetPath, targetKind) {
  if (targetKind === 'file') return filePath === targetPath;
  return filePath === targetPath || filePath.startsWith(`${targetPath}/`);
}

function diffTargetStates(beforeTargets, afterTargets) {
  const beforeFiles = new Map(beforeTargets.flatMap((target) => target.files.map((file) => [file.path, signature(file)])));
  const afterFiles = new Map(afterTargets.flatMap((target) => target.files.map((file) => [file.path, signature(file)])));
  const paths = new Set([...beforeFiles.keys(), ...afterFiles.keys()]);
  return [...paths]
    .filter((filePath) => beforeFiles.get(filePath) !== afterFiles.get(filePath))
    .sort((left, right) => left.localeCompare(right));
}

function summarizeTargets(targets, changedFiles) {
  return targets.map((target) => {
    const changedInTarget = changedFiles.filter((filePath) => isWithinTarget(filePath, target.path, target.kind));
    const firstSummary = target.files.find((file) => file.summary)?.summary ?? null;
    return {
      path: target.path,
      kind: target.kind,
      fileCount: target.files.length,
      changedCount: changedInTarget.length,
      changedFiles: changedInTarget.slice(0, 10),
      latestLabel: firstSummary?.latestLabel ?? null,
      lastUpdated: firstSummary?.lastUpdated ?? null,
      generatedAt: firstSummary?.generatedAt ?? null,
    };
  });
}

async function appendEntry(logPath, entry) {
  await mkdir(path.dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

function buildSkipReason(day, start, end) {
  if (start != null && end != null) return `UTC day ${day} outside window ${start}-${end}`;
  if (start != null) return `UTC day ${day} before window start ${start}`;
  if (end != null) return `UTC day ${day} after window end ${end}`;
  return 'No execution window configured';
}

function isInsideWindow(day, start, end) {
  if (start != null && day < start) return false;
  if (end != null && day > end) return false;
  return true;
}

function trimTail(buffer) {
  return buffer
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(-20);
}

async function runCommand(command) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let tailBuffer = '';
    const remember = (chunk) => {
      tailBuffer += chunk.toString();
      if (tailBuffer.length > 16000) {
        tailBuffer = tailBuffer.slice(-16000);
      }
    };

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      remember(chunk);
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      remember(chunk);
    });

    child.on('error', rejectPromise);
    child.on('close', (code, signal) => {
      resolvePromise({
        exitCode: code ?? 1,
        signal: signal ?? null,
        logTail: trimTail(tailBuffer),
      });
    });
  });
}

function formatDuration(ms) {
  if (ms == null) return '-';
  return `${(ms / 1000).toFixed(1)}s`;
}

function buildSnapshotNote(target) {
  const parts = [];
  if (target.latestLabel) parts.push(target.latestLabel);
  if (target.lastUpdated) parts.push(`lastUpdated ${target.lastUpdated}`);
  return parts.join(' · ');
}

async function runStep(config) {
  const day = new Date().getUTCDate();
  const startedAt = new Date();
  const beforeTargets = await Promise.all(config.outputs.map((output) => collectTargetState(output)));
  const entry = {
    name: config.name,
    command: config.command.join(' '),
    utcDay: day,
    window: {
      start: config.windowStart,
      end: config.windowEnd,
    },
    startedAt: startedAt.toISOString(),
  };

  if (!isInsideWindow(day, config.windowStart, config.windowEnd)) {
    const finishedAt = new Date();
    const changedFiles = [];
    await appendEntry(config.logPath, {
      ...entry,
      status: 'skipped',
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      reason: buildSkipReason(day, config.windowStart, config.windowEnd),
      changedFiles,
      outputTargets: summarizeTargets(beforeTargets, changedFiles),
      logTail: [],
    });
    return;
  }

  let result;
  try {
    result = await runCommand(config.command);
  } catch (error) {
    const finishedAt = new Date();
    const afterTargets = await Promise.all(config.outputs.map((output) => collectTargetState(output)));
    const changedFiles = diffTargetStates(beforeTargets, afterTargets);
    await appendEntry(config.logPath, {
      ...entry,
      status: 'failed',
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      exitCode: 1,
      error: error instanceof Error ? error.message : String(error),
      changedFiles,
      outputTargets: summarizeTargets(afterTargets, changedFiles),
      logTail: [],
    });
    throw error;
  }

  const finishedAt = new Date();
  const afterTargets = await Promise.all(config.outputs.map((output) => collectTargetState(output)));
  const changedFiles = diffTargetStates(beforeTargets, afterTargets);
  await appendEntry(config.logPath, {
    ...entry,
    status: result.exitCode === 0 ? 'success' : 'failed',
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    exitCode: result.exitCode,
    signal: result.signal,
    changedFiles,
    outputTargets: summarizeTargets(afterTargets, changedFiles),
    logTail: result.logTail,
  });

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

function parseLog(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function buildMarkdown(entries) {
  const counts = {
    success: entries.filter((entry) => entry.status === 'success').length,
    failed: entries.filter((entry) => entry.status === 'failed').length,
    skipped: entries.filter((entry) => entry.status === 'skipped').length,
  };

  const lines = [
    '# Climate Snapshot Run',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `- Steps logged: ${entries.length}`,
    `- Success: ${counts.success}`,
    `- Failed: ${counts.failed}`,
    `- Skipped: ${counts.skipped}`,
    '',
    '| Step | Status | Duration | Changed | Snapshot |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const entry of entries) {
    const snapshot = entry.outputTargets
      ?.map((target) => buildSnapshotNote(target))
      .filter(Boolean)
      .slice(0, 2)
      .join(' / ') ?? '';
    lines.push(`| ${escapeCell(entry.name)} | ${escapeCell(entry.status)} | ${escapeCell(formatDuration(entry.durationMs))} | ${escapeCell(entry.changedFiles?.length ?? 0)} | ${escapeCell(snapshot || '-')} |`);
  }

  for (const entry of entries) {
    lines.push('', `## ${entry.name}`, '');
    lines.push(`- Status: ${entry.status}`);
    lines.push(`- Duration: ${formatDuration(entry.durationMs)}`);
    if (entry.window?.start != null || entry.window?.end != null) {
      lines.push(`- Window: ${entry.window.start ?? '?'}-${entry.window.end ?? '?'}`);
    }
    if (entry.reason) lines.push(`- Reason: ${entry.reason}`);
    if (entry.exitCode != null) lines.push(`- Exit code: ${entry.exitCode}`);
    if (entry.error) lines.push(`- Error: ${entry.error}`);
    if (entry.changedFiles?.length) {
      lines.push(`- Changed files (${entry.changedFiles.length}): ${entry.changedFiles.slice(0, 10).join(', ')}`);
    } else {
      lines.push('- Changed files: none');
    }

    if (entry.outputTargets?.length) {
      lines.push('- Outputs:');
      for (const target of entry.outputTargets) {
        const note = buildSnapshotNote(target);
        const changed = target.changedCount ? `, changed ${target.changedCount}` : '';
        lines.push(`  - ${target.path} (${target.kind}, ${target.fileCount} files${changed}${note ? `, ${note}` : ''})`);
      }
    }

    if (entry.logTail?.length) {
      lines.push('', '```text', ...entry.logTail, '```');
    }
  }

  return lines.join('\n');
}

async function summarizeLog(config) {
  const entries = await exists(config.logPath)
    ? parseLog(await readFile(config.logPath, 'utf8'))
    : [];

  const payload = {
    generatedAt: new Date().toISOString(),
    entryCount: entries.length,
    entries,
  };
  const markdown = buildMarkdown(entries);

  await mkdir(path.dirname(config.mdPath), { recursive: true });
  await mkdir(path.dirname(config.jsonPath), { recursive: true });
  await writeFile(config.mdPath, `${markdown}\n`, 'utf8');
  await writeFile(config.jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

const config = parseArgs(process.argv.slice(2));

if (config.mode === 'run') {
  await runStep(config);
} else {
  await summarizeLog(config);
}