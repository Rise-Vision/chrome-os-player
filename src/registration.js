const windowManager = require("./window-manager");

window.addEventListener("DOMContentLoaded", ()=>{
  const webview = document.querySelector("webview");

  webview.addEventListener("contentload", ()=>{
    webview.contentWindow.postMessage("set-wrapper-window", "*");
  });

  window.addEventListener("message", evt=>{
    console.dir(evt);
    if (evt.data.msg === "create-window") {
      windowManager.launchWebView(evt.data.url);
    }
  });
});
