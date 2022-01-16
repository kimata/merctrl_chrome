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

function notify_progress() {
  var count_done = article_info[mode]["count_done"];
  var count_total = article_info[mode]["count_total"];
  document.getElementById("article_count_done_" + ctrl["mode"]).innerText =
    count_done.toLocaleString();
  document.getElementById("article_count_total_" + ctrl["mode"]).innerText =
    count_total.toLocaleString();

  var done_rate;
  if (count_done == 0) {
    done_rate = 0;
  } else {
    done_rate = (100 * count_done) / count_total;
  }

  progress_bar = document.getElementById("progress_bar_" + ctrl["mode"]);
  progress_bar.innerText = Math.round(done_rate) + "%";
  progress_bar.style.width = Math.round(done_rate) + "%";

  if (done_rate > 0.1) {
    now = new Date();
    elapsed_sec = Math.round(
      (now.getTime() - start_time[ctrl["mode"]].getTime()) / 1000
    );
    remaining_sec = (elapsed_sec / done_rate) * (100 - done_rate);

    var remaining_text;
    if (remaining_sec < 300) {
      remaining_text = Math.round(remaining_sec) + "秒";
    } else {
      remaining_text = Math.round(remaining_sec / 60).toLocaleString() + "分";
    }

    document.getElementById("remaining_time_" + ctrl["mode"]).innerText =
      remaining_text;
  } else {
    document.getElementById("remaining_time_" + ctrl["mode"]).innerText = "?";
  }
}
