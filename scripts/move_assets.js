const fs = require('fs');
const path = require('path');

function moveFiles() {
  const source1 = "C:\\Users\\冬\\Documents\\NBC素材";
  const source2 = "E:\\ComfyUI_Hui_Simple\\ComfyUI\\output";
  const targetBase = "H:\\素材库";

  const targetGPT = path.join(targetBase, "生成素材\\GPT-Image");
  const targetSeedance = path.join(targetBase, "生成素材\\Seedance");
  const targetComfy = path.join(targetBase, "生成素材\\ComfyUI");
  const targetFeishu = path.join(targetBase, "生成素材\\飞书云盘");
  const targetProject = path.join(targetBase, "项目资产");
  const targetData = path.join(targetBase, "数据日志");
  const targetOther = path.join(targetBase, "生成素材\\其他");

  [targetGPT, targetSeedance, targetComfy, targetFeishu, targetProject, targetData, targetOther].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  function processDir(src, isComfy) {
    if (!fs.existsSync(src)) return;
    const items = fs.readdirSync(src, { withFileTypes: true });
    for (const item of items) {
      const srcPath = path.join(src, item.name);
      if (item.isDirectory()) {
        if (isComfy) continue; // don't recurse comfy
        if (item.name === 'feishu_cache' || item.name === 'staging') {
            const files = fs.readdirSync(srcPath);
            files.forEach(f => {
                const dest = path.join(targetFeishu, f);
                try { fs.copyFileSync(path.join(srcPath, f), dest); fs.unlinkSync(path.join(srcPath, f)); } catch(e) {}
            });
        } else {
            // wahaha etc
            const projDir = path.join(targetProject, item.name);
            if (!fs.existsSync(projDir)) fs.mkdirSync(projDir, { recursive: true });
            const files = fs.readdirSync(srcPath);
            files.forEach(f => {
                const dest = path.join(projDir, f);
                try { fs.copyFileSync(path.join(srcPath, f), dest); fs.unlinkSync(path.join(srcPath, f)); } catch(e) {}
            });
        }
      } else {
        const ext = path.extname(item.name).toLowerCase();
        if (!isComfy && ['.jsonl', '.cursor', '.json'].includes(ext)) {
          const dest = path.join(targetData, item.name);
          try { fs.copyFileSync(srcPath, dest); fs.unlinkSync(srcPath); } catch(e) {}
          continue;
        }

        let destDir = targetBase;
        if (item.name.startsWith('ComfyUI_') || isComfy) {
          destDir = targetComfy;
          if (item.name.startsWith('seedance_')) destDir = targetSeedance;
        } else if (item.name.startsWith('gptImage')) {
          destDir = targetGPT;
        } else if (item.name.startsWith('seedance_')) {
          destDir = targetSeedance;
        } else {
          destDir = targetOther;
        }

        const dest = path.join(destDir, item.name);
        try { fs.copyFileSync(srcPath, dest); fs.unlinkSync(srcPath); } catch(e) { console.error(e) }
      }
    }
  }

  processDir(source2, true);
  processDir(source1, false);
}

moveFiles();