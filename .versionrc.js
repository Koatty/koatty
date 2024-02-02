module.exports = {
  // skip: {
  //     bump: true, // 自增版本
  //     commit: true, // 自动commit
  //     tag: true, // 自动打tag
  // },
  "types": [
    {
      "type": "feat",
      "section": "Features"
    },
    {
      "type": "fix",
      "section": "Bug Fixes"
    },
    {
      "type": "chore",
      "hidden": true
    },
    {
      "type": "docs",
      "hidden": true
    },
    {
      "type": "style",
      "hidden": true
    },
    {
      "type": "refactor",
      "section": "Refactor"
    },
    {
      "type": "perf",
      "section": "Performance"
    },
    {
      "type": "test",
      "hidden": true
    }
  ],
  //server-version自动commit的模板
  releaseCommitMessageFormat:
    "build: v{{currentTag}}",
  //需要server-version更新版本号的文件
  bumpFiles: [
    {
      filename: "package.json",
      // The `json` updater assumes the version is available under a `version` key in the provided JSON document.
      type: "json",
    },
  ],
};