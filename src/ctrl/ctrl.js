var start_time = null;
var article_list = null;
var order_info = null;
var ctrl = {
  mode: "onsale",
};

function state_init() {
  start_time = {
    onsale: new Date(),
    complete: new Date(),
  };
  article_list = {
    complete: [],
  };
  article_info = {
    onsale: {
      count_total: 0,
      count_done: 0,
    },
    complete: {
      count_total: 0,
      count_done: 0,
    },
  };

  status_clear();
  notify_progress();
}

// 実行順序を保ちながら非同期でリストに対して処理を実行
function async_loop(list, index, func, next) {
  return new Promise(function (resolve, reject) {
    if (index == list.length) {
      return resolve(false);
    }
    func(list[index], index, function () {
      return resolve(true);
    });
  }).then(function (is_continue) {
    if (is_continue) {
      return async_loop(list, index + 1, func, next);
    } else {
      next();
    }
  });
}

function get_article_detail(article, index, mode, callback) {
  cmd_handle(
    {
      to: "background",
      type: "parse",
      target: "detail",
      index: index,
      url: article["url"],
    },
    function (response) {
      if (typeof response === "undefined") {
        return callback();
      }
      response["article"]["url"] = article["url"];
      response["article"]["detail"] = true;

      article_list[mode][parseInt(index, 10)] = response["article"];
      create_article_table("table_" + mode, article_list[mode]);

      article_info[mode]["count_done"] += 1;

      notify_progress();
      callback();
    }
  );
}

function get_complete_list() {
  new Promise((resolve) => {
    cmd_handle(
      {
        to: "background",
        type: "parse",
        target: "complete_list",
      },
      function (response) {
        response["list"] = response["list"].splice(0, 3);

        article_list["complete"] = response["list"];
        article_info["complete"]["count_total"] = response["list"].length;

        notify_progress();
        resolve(response["list"]);
      }
    );
  })
    .then((list) => {
      return new Promise(function (resolve) {
        async_loop(
          list,
          0,
          function (article, index, callback) {
            get_article_detail(article, index, "complete", callback);
          },
          resolve
        );
      });
    })
    .then(() => {
      status_info("完了しました．");
    });
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

function getNewFileHandle() {
  const options = {
    types: [
      {
        description: "CSV Files",
        accept: {
          "text/csv": [".csv"],
        },
      },
    ],
  };
  return window.showSaveFilePicker(options);
}

function csv_escape(str) {
  if (typeof str === "string") {
    if (str.includes('"') || str.includes(",")) {
      return '"' + str.replace(/"/g, '""') + '"';
    } else {
      return str;
    }
  } else {
    return str;
  }
}

function csv_convert(article_list) {
  content_list = [
    // NOTE: エンコーディングが UTF-8 固定になるので，Excel で開いたときの文字化け防止のため，
    // 先頭に BOM をつける．
    new TextDecoder("utf-8", { ignoreBOM: true }).decode(
      new Uint8Array([0xef, 0xbb, 0xbf])
    ),
  ];

  param_list = [
    ["title", "商品名"],
    ["price", "商品代金"],
    ["sales_commission", "販売手数料"],
    ["delivery_charge", "配送料"],
    ["profit", "販売利益"],
    ["postage", "送料"],
    ["purchase_date", "購入日時"],
    ["id", "商品ID"],
  ];
  for (param of param_list) {
    content_list.push(csv_escape(param[1]));
    content_list.push(", ");
  }
  content_list.pop();
  content_list.push("\n");

  for (article of article_list) {
    for (param of param_list) {
      content_list.push(csv_escape(article[param[0]]));
      content_list.push(",");
    }
    content_list.pop();
    content_list.push("\n");
  }
  return content_list.join("");
}

async function write(article_list) {
  const handle = await getNewFileHandle();

  const writable = await handle.createWritable();
  await writable.write(csv_convert(article_list));
  //    await writable.write(JSON.stringify(data))
  await writable.close();
}

document.getElementById("save").onclick = function () {
  write(article_list[ctrl["mode"]]);
};

document.getElementById("start_complete").onclick = function () {
  // document.getElementById('start').disabled = true

  status_info("開始します．");
  state_init();
  worker_init().then(() => {
    get_complete_list();
  });
};

for (mode of ["onsale", "complete"]) {
  document.getElementById("nav_" + mode).onclick = (function (mode) {
    return function () {
      document
        .getElementById("nav_" + ctrl["mode"])
        .setAttribute("class", "nav-link");
      document
        .getElementById("nav_" + mode)
        .setAttribute("class", "nav-link active");

      document.getElementById("content_" + ctrl["mode"]).style.display = "none";
      document.getElementById("content_" + mode).style.display = "block";

      ctrl["mode"] = mode;
    };
  })(mode);
}

document.getElementById("nav_complete").click();
