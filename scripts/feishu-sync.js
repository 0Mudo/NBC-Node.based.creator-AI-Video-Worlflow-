/**
 * NBC 事件同步到飞书多维表格的 Agent 脚本
 *
 * 运行方式: node scripts/feishu-sync.js
 * (建议通过 cron 或类似定时任务定期执行，例如每 5 分钟执行一次)
 * 
 * 机制：读取 cursor 文件，获取上次同步的行号。读取 nbc_events.jsonl 中的增量行，
 * 解析事件并写入到飞书多维表格。写入成功后更新 cursor。
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

// --- 飞书配置 ---
const FEISHU_APP_ID = 'cli_a97f60fe80785cbc'; 
const FEISHU_APP_SECRET = 'idXvoiRWnXVDZZKZsQnXTgPsuC0L3hpZ'; 
const BITABLE_APP_TOKEN = 'Wg8JbKpLEaPjIYsXaVecBF5jnUb'; 
const BITABLE_TABLE_ID = 'tblHwfGWYc1YkZBG';

// --- 本地文件配置 ---
// NBC 默认将事件日志写在: 文档/NBC素材/nbc_events.jsonl
const nbcDir = path.join(os.homedir(), 'Documents', 'NBC素材');
const EVENT_FILE = path.join(nbcDir, 'nbc_events.jsonl');
const CURSOR_FILE = path.join(nbcDir, 'nbc_events.cursor');

async function getTenantAccessToken() {
  const url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET
    })
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取 Token 失败: ${data.msg} (错误码: ${data.code})`);
  }
  return data.tenant_access_token;
}

// 批量插入记录
async function batchInsertRecords(token, records) {
  if (records.length === 0) return;
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/batch_create`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({ records })
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`批量插入记录失败: ${data.msg} (错误码: ${data.code})`);
  }
  return data.data;
}

function getCursor() {
  if (!fs.existsSync(CURSOR_FILE)) {
    return 0;
  }
  const content = fs.readFileSync(CURSOR_FILE, 'utf-8').trim();
  return parseInt(content, 10) || 0;
}

function setCursor(lineNum) {
  fs.writeFileSync(CURSOR_FILE, lineNum.toString(), 'utf-8');
}

// 需要上传到飞书的事件类型白名单
const ALLOWED_ACTIONS = [
  'project:create',
  'workflow:export',
  'generation:start',
  'generation:complete',
  'generation:fail',
]

function shouldSyncEvent(event) {
  return ALLOWED_ACTIONS.includes(event.action)
}

// 格式化事件到飞书记录
function mapEventToRecord(event) {
  // 我们在 P1 验证中，在飞书建了 5 列："文本"(主键), "事件类型", "节点名称", "状态", "详细信息"
  
  // 提取详细信息
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

  // 追加操作人信息到详细信息或作为一个额外的列 (假设目前在详细信息里体现，若多维表格有专门的"操作人"列可单独映射)
  const operator = event.operator || '未知';
  details += `\n操作人: ${operator}`;

  // 映射状态
  let status = 'info';
  if (event.action.includes('complete')) status = 'success';
  if (event.action.includes('fail')) status = 'error';
  if (event.action.includes('start')) status = 'running';

  return {
    fields: {
      "文本": `[${new Date(event.timestamp).toLocaleString()}] ${event.projectName || '全局'}`,
      "事件类型": event.action,
      "节点名称": event.details?.nodeLabel || '-',
      "状态": status,
      "详细信息": details.trim(),
      "操作人": operator // 注意：如果飞书多维表格中没有这一列会报错。建议用户在飞书端添加文本类型的"操作人"列。
    }
  };
}

async function syncEvents() {
  if (!fs.existsSync(EVENT_FILE)) {
    console.log('事件日志文件不存在，暂无需要同步的数据。');
    return;
  }

  const cursor = getCursor();
  console.log(`当前 Cursor: ${cursor} 行`);

  const newRecords = [];
  let skippedCount = 0;
  let currentLineNum = 0;

  const fileStream = fs.createReadStream(EVENT_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    currentLineNum++;
    if (currentLineNum <= cursor) {
      continue; // 跳过已同步的行
    }

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

  console.log(`发现 ${newRecords.length} 条新事件${skippedCount > 0 ? ` (已过滤 ${skippedCount} 条非关键事件)` : ''}，开始同步到飞书...`);
  
  try {
    const token = await getTenantAccessToken();
    // 飞书批量创建接口一次最多 500 条
    const BATCH_SIZE = 100;
    for (let i = 0; i < newRecords.length; i += BATCH_SIZE) {
      const batch = newRecords.slice(i, i + BATCH_SIZE);
      await batchInsertRecords(token, batch);
      console.log(`成功同步 ${i + 1} 到 ${i + batch.length} 条事件。`);
    }
    
    // 更新 cursor
    setCursor(currentLineNum);
    console.log(`同步完成！Cursor 已更新为: ${currentLineNum}`);
  } catch (err) {
    console.error('同步失败:', err.message);
    // 注意：如果失败，我们不更新 cursor，下次运行会重试
  }
}

syncEvents();
