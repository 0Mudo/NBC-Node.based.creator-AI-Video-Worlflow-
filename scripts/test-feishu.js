const fs = require('fs');

async function getFeishuToken(appId, appSecret) {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret })
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg);
  return data.tenant_access_token;
}

async function testFeishu() {
  const appId = 'cli_a97f60fe80785cbc';
  const appSecret = 'idXvoiRWnXVDZZKZsQnXTgPsuC0L3hpZ';
  const folderToken = 'H2WXfu8LLlHHvQdn33Cc1OhjnUe';
  
  try {
    const token = await getFeishuToken(appId, appSecret);
    console.log('Got token:', token);
    
    const res = await fetch(`https://open.feishu.cn/open-apis/drive/v1/files?folder_token=${folderToken}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Files:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

testFeishu();