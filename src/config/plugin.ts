/*
 * @Description: plugin config
 * @Usage:
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2023-12-09 22:17:13
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */


export default {
  // ============================================================
  // User plugin loading list (executed in order)
  // Note: Core components (@Component) are loaded automatically
  // ============================================================
  list: [
    // 'AuthPlugin',      // Authentication plugin
    // 'CachePlugin',     // Cache plugin
    // 'SchedulePlugin',  // Scheduled task plugin
  ],

  // ============================================================
  // Component/Plugin configuration
  // ============================================================
  config: {
    // --- Core components (@Component) ---
    // Framework built-in components, usually do not need to modify
    // Can be disabled by setting enabled: false
    RouterComponent: {
      enabled: true,
    },
    ServeComponent: {
      enabled: true,
    },

    // --- User plugins (@Plugin) ---
    // Configuration for user-defined plugins
    // AuthPlugin: {
    //   enabled: true,
    //   // Plugin-specific configuration
    //   secret: 'your-jwt-secret',
    // },
    // CachePlugin: {
    //   enabled: true,
    //   redis: {
    //     host: 'localhost',
    //     port: 6379,
    //   },
    // },
  }
};