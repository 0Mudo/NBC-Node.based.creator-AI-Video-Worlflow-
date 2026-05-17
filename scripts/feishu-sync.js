/**
 * NBC 事件同步到飞书多维表格的 Agent 脚本
 *
 * 运行方式: node scripts/feishu-sync.js [配置文件路径]
 * (建议通过 cron 或类似定时任务定期执行，例如每 5 分钟执行一次)
 * 
 * 配置方式（优先级从高到低）：
 *   1. 命令行参数指定配置文件路径
 *   2. 环境变量（NBC_FEISHU_APP_ID 等）
 *   3. 配置文件：文档/NBC素材/nbc_feishu_sync_config.json
 * 
 * 机制：读取 cursor 文件，获取上次同步的行号。读取 nbc_events.jsonl 中的增量行，
 * 解析事件并写入到飞书多维表格。写入成功后更新 cursor。
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

// ---- 默认值（会被配置文件/环境变量覆盖） ----
const DEFAULT_CONFIG = {
  feishuAppId: '',
  feishuAppSecret: '',
  bitableAppToken: '',
  bitableTableId: '',
  nbcDir: path.join(os.homedir(), 'Documents', 'NBC素材'),
  // 需要同步的事件白名单（可按需增减）
  allowedActions: [
    'project:create',
    'generation:start',
    'generation:complete',
    'generation:fail',
  ],
  // 飞书表格列名映射（如果你的表格列名不同，在这里改）
  fieldNames: {
    primary: '文本',
    eventType: '事件类型',
    nodeName: '节点名称',
    status: '状态',
    details: '详细信息',
    operator: '操作人',
  },
  // 单次批量插入最大条数
  batchSize: 100,
};

// ---- 加载配置 ----
function loadConfig(customPath) {
  const config = { ...DEFAULT_CONFIG };

  // 1) 从配置文件加载
  const configPaths = [
    customPath,
    path.join(os.homedir(), 'Documents', 'NBC素材', 'nbc_feishu_sync_config.json'),
  ].filter(Boolean);

  let loaded = false;
  for (const p of configPaths) {
    if (p && fs.existsSync(p)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(p, 'utf-8'));
        Object.assign(config, fileConfig);
        // 合并嵌套的 fieldNames
        if (fileConfig.fieldNames) {
          config.fieldNames = { ...DEFAULT_CONFIG.fieldNames, ...fileConfig.fieldNames };
        }
        if (fileConfig.allowedActions) {
          config.allowedActions = fileConfig.allowedActions;
        }
        console.log(`已从配置文件加载: ${p}`);
        loaded = true;
        break;
      } catch (e) {
        console.warn(`配置文件解析失败 (${p}): ${e.message}`);
      }
    }
  }

  // 2) 环境变量覆盖（用于 CI/生产环境，避免配置文件中的硬编码）
  const envMap = {
    feishuAppId: 'NBC_FEISHU_APP_ID',
    feishuAppSecret: 'NBC_FEISHU_APP_SECRET',
    bitableAppToken: 'NBC_FEISHU_BITABLE_APP_TOKEN',
    bitableTableId: 'NBC_FEISHU_BITABLE_TABLE_ID',
  };
  for (const [key, env] of Object.entries(envMap)) {
    if (process.env[env]) config[key] = process.env[env];
  }
  
  // 环境变量覆盖 nbcDir
  if (process.env.NBC_DATA_DIR) {
    config.nbcDir = process.env.NBC_DATA_DIR;
  }
  // 环境变量覆盖 batchSize
  if (process.env.NBC_SYNC_BATCH_SIZE) {
    config.batchSize = parseInt(process.env.NBC_SYNC_BATCH_SIZE, 10) || 100;
  }

  // 3) 校验必填项
  const missing = [];
  if (!config.feishuAppId) missing.push('feishuAppId');
  if (!config.feishuAppSecret) missing.push('feishuAppSecret');
  if (!config.bitableAppToken) missing.push('bitableAppToken');
  if (!config.bitableTableId) missing.push('bitableTableId');

  if (missing.length > 0) {
    console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  NBC 飞书同步脚本 — 配置缺失                                     ║
╠══════════════════════════════════════════════════════════════════╣
║  未配置: ${missing.join(', ').padEnd(50)}║
║                                                                  ║
║  请按以下任一方式配置：                                           ║
║                                                                  ║
║  方式1：创建配置文件                                              ║
║    在 "文档\\NBC素材\\nbc_feishu_sync_config.json" 中写入：       ║
║    {                                                             ║
║      "feishuAppId": "cli_...",                                   ║
║      "feishuAppSecret": "...",                                   ║
║      "bitableAppToken": "Wg8J...",                               ║
║      "bitableTableId": "tblH..."                                 ║
║    }                                                             ║
║    (可复制 scripts/nbc_feishu_sync_config.template.json 修改)     ║
║                                                                  ║
║  方式2：环境变量                                                  ║
║    set NBC_FEISHU_APP_ID=cli_...                                 ║
║    set NBC_FEISHU_APP_SECRET=...                                 ║
║    set NBC_FEISHU_BITABLE_APP_TOKEN=Wg8J...                      ║
║    set NBC_FEISHU_BITABLE_TABLE_ID=tblH...                       ║
║                                                                  ║
║  方式3：命令行指定配置文件路径                                     ║
║    node scripts/feishu-sync.js D:\\my_config.json                 ║
╚══════════════════════════════════════════════════════════════════╝
`);
    if (!loaded) {
      console.log('提示：如果你是首次使用，可运行以下命令复制配置模板：');
      console.log(`  copy scripts\\nbc_feishu_sync_config.template.json "%USERPROFILE%\\Documents\\NBC素材\\nbc_feishu_sync_config.json"`);
    }
    process.exit(1);
  }

  return config;
}

// 自定义命令行参数：node feishu-sync.js [config文件路径]
const customConfigPath = process.argv[2];
const CONFIG = loadConfig(customConfigPath);

const EVENT_FILE = path.join(CONFIG.nbcDir, 'nbc_events.jsonl');
const CURSOR_FILE = path.join(CONFIG.nbcDir, 'nbc_events.cursor');

async function getTenantAccessToken() {
  const url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      app_id: CONFIG.feishuAppId,
      app_secret: CONFIG.feishuAppSecret,
    }),
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取 Token 失败: ${data.msg} (错误码: ${data.code})`);
  }
  return data.tenant_access_token;
}

async function batchInsertRecords(token, records) {
  if (records.length === 0) return;
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.bitableAppToken}/tables/${CONFIG.bitableTableId}/records/batch_create`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ records }),
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`批量插入记录失败: ${data.msg} (错误码: ${data.code})`);
  }
  return data.data;
}

function getCursor() {
  if (!fs.existsSync(CURSOR_FILE)) return 0;
  const content = fs.readFileSync(CURSOR_FILE, 'utf-8').trim();
  return parseInt(content, 10) || 0;
}

function setCursor(lineNum) {
  fs.writeFileSync(CURSOR_FILE, lineNum.toString(), 'utf-8');
}

function shouldSyncEvent(event) {
  return CONFIG.allowedActions.includes(event.action);
}

function mapEventToRecord(event) {
  const F = CONFIG.fieldNames;

  let details = event.details?.summary || '';
  if (event.action === 'generation:complete' && event.details?.resultFile) {
    details += `\n文件: ${event.details.resultFile}`;
  }
  if (event.action === 'generation:fail' && event.details?.error) {
    details += `\n错误: ${event.details.error}`;
  }
  if (event.details?.generationParams) {
    details += `\n参数: ${JSON.stringify(event.details.generationParams)}`;
  }

  const operator = event.operatorName || '未知';
  details += `\n操作人: ${operator}`;

  let status = 'info';
  if (event.action.includes('complete')) status = 'success';
  if (event.action.includes('fail')) status = 'error';
  if (event.action.includes('start')) status = 'running';

  return {
    fields: {
      [F.primary]: `[${new Date(event.timestamp).toLocaleString()}] ${event.projectName || '全局'}`,
      [F.eventType]: event.action,
      [F.nodeName]: event.details?.nodeLabel || '-',
      [F.status]: status,
      [F.details]: details.trim(),
      [F.operator]: operator,
    },
  };
}

async function syncEvents() {
  if (!fs.existsSync(EVENT_FILE)) {
    console.log('事件日志文件不存在，暂无需要同步的数据。');
    console.log(`预期路径: ${EVENT_FILE}`);
    return;
  }

  const cursor = getCursor();
  console.log(`当前 Cursor: ${cursor} 行`);
  console.log(`数据目录: ${CONFIG.nbcDir}`);
  console.log(`白名单事件: ${CONFIG.allowedActions.join(', ')}`);

  const newRecords = [];
  let skippedCount = 0;
  let currentLineNum = 0;

  const fileStream = fs.createReadStream(EVENT_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    currentLineNum++;
    if (currentLineNum <= cursor) continue;

    try {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (!shouldSyncEvent(event)) { skippedCount++; continue; }
      newRecords.push(mapEventToRecord(event));
    } catch (e) {
      console.warn(`解析第 ${currentLineNum} 行失败: ${e.message}`);
    }
  }

  if (newRecords.length === 0) {
    console.log('没有新的事件需要同步。');
    return;
  }

  console.log(
    `发现 ${newRecords.length} 条新事件${skippedCount > 0 ? ` (已过滤 ${skippedCount} 条非关键事件)` : ''}，开始同步到飞书...`
  );

  try {
    const token = await getTenantAccessToken();
    for (let i = 0; i < newRecords.length; i += CONFIG.batchSize) {
      const batch = newRecords.slice(i, i + CONFIG.batchSize);
      await batchInsertRecords(token, batch);
      console.log(`成功同步 ${i + 1} 到 ${Math.min(i + batch.length, newRecords.length)} 条事件。`);
    }

    setCursor(currentLineNum);
    console.log(`同步完成！Cursor 已更新为: ${currentLineNum}`);
  } catch (err) {
    console.error('同步失败:', err.message);
  }
}

syncEvents();
