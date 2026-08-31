window.createHanloTestConfig = function createHanloTestConfig(htmlType) {
  return {
    htmlType,
    postTitle: "",
    isPost: false,
    isHome: htmlType === "page-one",
    lazyload: { enable: false, error: "/error.png" },
    loadingBox: false,
    loadProgressBar: false,
    rightMenuEnable: false,
    source: {},
  };
};
