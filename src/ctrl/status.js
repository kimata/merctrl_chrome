// ステータスメッセージ関係

function status_info(msg, nl = true) {
  if (nl) {
    msg += "\n";
  }

  var textarea = document.getElementById("status_" + ctrl["mode"]);
  textarea.value += msg;
  textarea.scrollTop = textarea.scrollHeight;
}

function status_error(mode, msg) {
  status_info("[ERROR]" + msg, true);
  log.trace(msg);
}

function status_clear() {
  document.getElementById("status_" + ctrl["mode"]).value = "";
}
