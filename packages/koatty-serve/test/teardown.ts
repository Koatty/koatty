// test/teardown.ts - Jest全局清理
export default async (): Promise<void> => {
  // 清理事件监听器
  if (process.removeAllListeners) {
    process.removeAllListeners();
  }
  
  // 等待一点时间让所有清理完成
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('Global test cleanup completed');
}; 