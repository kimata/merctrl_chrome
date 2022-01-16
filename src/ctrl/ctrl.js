const mode_list = ["onsale", "complete"];
var start_time = {};
var article_info = {};
var article_list = {};
var ctrl = {
  mode: "onsale",
};

function state_init() {
  mode = ctrl["mode"];
  start_time[mode] = new Date();
  article_list[mode] = [];
  article_info[mode] = {
    count_total: 0,
    count_done: 0,
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
      target: "complete_detail",
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
      create_article_table("table_" + mode, mode, article_list[mode]);

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
      worker_destroy();
      button_state_update(true);
    });
}

function get_onsale_list() {
  new Promise((resolve) => {
    cmd_handle(
      {
        to: "background",
        type: "parse",
        target: "onsale_list",
      },
      function (response) {
        article_list["onsale"] = response["list"];
        console.log(response["list"]);
        var mode = "onsale";
        create_article_table("table_" + mode, mode, article_list[mode]);
        resolve();
      }
    );
  }).then(() => {
    status_info("完了しました．");
  });
}

function button_state_update(done) {
  for (mode of ["complete", "onsale"]) {
    if (done) {
      document.getElementById("start_" + mode).disabled = false;
    } else {
      document.getElementById("start_" + mode).disabled = true;
    }
  }
}

document.getElementById("save").onclick = function () {
  export_csv(article_list[ctrl["mode"]]);
};

document.getElementById("start_complete").onclick = function () {
  button_state_update(false);

  status_info("開始します．");
  state_init();
  worker_init().then(() => {
    get_complete_list();
  });
};

document.getElementById("start_onsale").onclick = function () {
  button_state_update(false);

  status_info("開始します．");
  state_init();
  worker_init().then(() => {
    get_onsale_list();
  });
};

for (mode of mode_list) {
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
