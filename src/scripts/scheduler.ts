import cron from "node-cron";
import axios from "axios";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function syncAll() {
  const time = new Date().toISOString();
  console.log(`\n[${time}] 定时抓取开始...`);

  const tasks = [
    { name: "短剧", endpoint: `${BASE_URL}/api/dramas/sync` },
    { name: "小说", endpoint: `${BASE_URL}/api/novels/sync` },
  ];

  for (const task of tasks) {
    try {
      const { data } = await axios.post(task.endpoint, null, { timeout: 180000 });
      console.log(`  [${task.name}] 成功: ${data.count ?? 0} 条 - ${data.message ?? ""}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [${task.name}] 失败: ${msg}`);
    }
  }

  console.log(`[${new Date().toISOString()}] 定时抓取完成\n`);
}

// 每2小时执行
cron.schedule("0 */2 * * *", syncAll);

console.log("=== 定时抓取调度器已启动 ===");
console.log("计划: 每2小时自动抓取");
console.log(`目标: ${BASE_URL}`);
console.log("按 Ctrl+C 停止\n");

// 启动时立即执行一次
syncAll();
