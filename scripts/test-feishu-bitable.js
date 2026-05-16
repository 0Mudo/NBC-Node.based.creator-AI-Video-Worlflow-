/**
 * 飞书多维表格 API 验证脚本 (P1 阶段测试)
 * 运行前请替换下方的配置信息，并在多维表格中建好对应的列。
 */

const FEISHU_APP_ID = 'cli_a97f60fe80785cbc'; // 替换为你的飞书自建应用 App ID
const FEISHU_APP_SECRET = 'idXvoiRWnXVDZZKZsQnXTgPsuC0L3hpZ'; // 替换为你的 App Secret
const BITABLE_APP_TOKEN = 'Wg8JbKpLEaPjIYsXaVecBF5jnUb'; // 替换为多维表格 Token (URL 中 /base/ 后面的部分)
const BITABLE_TABLE_ID = 'tblHwfGWYc1YkZBG'; // 替换为数据表 ID (URL 中 ?table= 后面的部分)

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

async function insertRecord(token) {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records`;
  
  // 这里的 fields 必须和你的多维表格中的【列名】以及【字段类型】完全对应！
  // 为了测试，请在多维表格里创建这 4 列，类型都选"文本"
  const mockRecord = {
    fields: {
      "文本": `Test Event - ${new Date().toLocaleString()}`,
      "事件类型": "asset.generated",
      "节点名称": "GPT图像生成",
      "状态": "success",
      "详细信息": "测试生成了一张图片，URL: https://example.com/test.png"
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(mockRecord)
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`插入记录失败: ${data.msg} (错误码: ${data.code})\n请检查表格列名是否匹配，以及是否给应用开通了 bitable:app 权限！`);
  }
  return data.data.record;
}

async function main() {
  if (FEISHU_APP_ID.includes('xxx')) {
    console.error('❌ 请先修改脚本里的 FEISHU_APP_ID 等配置信息！');
    return;
  }

  try {
    console.log('1. 获取 Tenant Access Token...');
    const token = await getTenantAccessToken();
    console.log('✅ Token 获取成功!\n');

    console.log('2. 尝试向多维表格插入一条测试记录...');
    const record = await insertRecord(token);
    console.log('✅ 记录插入成功! 记录 ID:', record.record_id);
    console.log('👉 现在可以去你的飞书多维表格看看有没有新数据进来了。');
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
  }
}

main();
