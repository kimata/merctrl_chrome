chrome.action.onClicked.addListener(function () {
  url = "ctrl/index.htm";
  chrome.tabs.create({ url: url, active: true }, function (tab) {
    chrome.tabs.update(tab.id, { autoDiscardable: false }, function (tab) {
      chrome.runtime.onMessage.addListener(function (
        cmd,
        sender,
        send_response
      ) {
        if (cmd["to"] !== "background") {
          send_response();
          return false;
        }
        chrome.tabs.onRemoved.addListener(function (tabid, removed) {
          console.log(cmd["tabid"]);
          if (tabid == tab.id) {
            chrome.tabs.remove(cmd["tabid"]);
          }
        });
        send_response();
      });
    });
  });
});
