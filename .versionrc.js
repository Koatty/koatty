module.exports = {
    // skip: {
    //     tag: true,
    // },
    //server-version自动commit的模板
    releaseCommitMessageFormat:
        "🔧 build: v{{currentTag}}",
    //需要server-version更新版本号的文件
    bumpFiles: [
        {
            filename: "package.json",
            // The `json` updater assumes the version is available under a `version` key in the provided JSON document.
            type: "json",
        },
    ],
};