document.xpath = function (expression) {
  ret = document.evaluate(expression, document);

  switch (ret.resultType) {
    case 1:
      return ret.numberValue;
    case 2:
      return ret.stringValue;
    case 3:
      return ret.booleanValue;
    case 4:
    case 5:
      var v = [];
      while ((e = ret.iterateNext())) {
        v.push(e);
      }
      return v;
    default:
      return ret;
  }
};

function print_stacktrace(e) {
  log.error(e.message);
  log.error(e.stack);
}

function sleep(sec) {
  return new Promise((resolve) => setTimeout(resolve, sec * 1000));
}

async function wait_for_xpath(xpath) {
    // NOTE: DOM が構築されるのを待つ
    for (var i = 0; i < 20; i++) {
        if (typeof document.xpath(xpath)[0] === "undefined") {
            await sleep(0.5);
        }
    }
}

async function complete_list_page_parse(send_response) {
  article_list = [];

  wait_for_xpath('//mer-tab-panel[@id="completed"]//mer-list-item')

  const article_count = document.xpath(
    '//mer-tab-panel[@id="completed"]//mer-list-item'
  ).length;
  for (var i = 0; i < article_count; i++) {
    const parent_xpath =
      '//mer-tab-panel[@id="completed"]//mer-list-item[' + (i + 1) + "]";

    const url = document.xpath(parent_xpath + "//a")[0].href;
    article_list.push({
      url: url,
    });
  }

  send_response({
    list: article_list,
  });
}

async function article_detail_page_parse(send_response) {
  heading_map = {
    商品代金: {
      name: "price",
      xpath: "//mer-price",
      value: function (elem) {
        return parseInt(elem.getAttribute("value").trim());
      },
    },
    販売手数料: {
      name: "sales_commission",
      xpath: "//mer-price",
      value: function (elem) {
        return parseInt(elem.getAttribute("value").trim());
      },
    },
    配送料: {
      name: "delivery_charge",
      xpath: "//mer-price",
      value: function (elem) {
        return parseInt(elem.getAttribute("value").trim());
      },
    },
    販売利益: {
      name: "profit",
      xpath: "//mer-price",
      value: function (elem) {
        return parseInt(elem.getAttribute("value").trim());
      },
    },
    送料: {
      name: "postage",
      xpath: '//span[@slot="body"]',
      value: function (elem) {
        return elem.innerText.trim();
      },
    },
    購入日時: {
      name: "purchase_date",
      xpath: '//span[@slot="body"]',
      value: function (elem) {
        return elem.innerText.trim();
      },
    },
    商品ID: {
      name: "id",
      xpath: '//span[@slot="body"]//mer-text',
      value: function (elem) {
        return elem.innerText.trim();
      },
    },
  };

  wait_for_xpath('//mer-item-object')

  article = {};
  for (node of document.xpath("//mer-item-object")[0].shadowRoot.childNodes) {
    if (node.nodeName == "DIV") {
      article["title"] = node.textContent.trim();
      break;
    }
  }

  const heading_count = document.xpath(
    'count(//div[@id="transaction-sidebar"]//mer-display-row)'
  );

  for (var i = 0; i < heading_count; i++) {
    const parent_xpath =
      '//div[@id="transaction-sidebar"]//mer-display-row[' + (i + 1) + "]";

    const title = document
      .xpath(parent_xpath + '//span[@slot="title"]')[0]
      .innerText.trim();
    const value_elem = document.xpath(
      parent_xpath + heading_map[title].xpath
    )[0];
    const value = heading_map[title].value(value_elem);

    article[heading_map[title].name] = value;
  }

  send_response({
    article: article,
  });
}

function order_count_page_parse() {
  const order_count_text = document
    .xpath(
      '//label[@for="orderFilter"]//span[contains(@class, "num-orders")]'
    )[0]
    .innerText.trim();

  const order_count = parseInt(order_count_text.replace("件", ""));

  return {
    count: order_count,
  };
}

function order_list_page_parse() {
  const order_count = document.xpath(
    'count(//div[contains(@class, " order ")])'
  );
  log.info({ order_count: order_count });

  detail_page_list = [];
  for (var i = 0; i < order_count; i++) {
    const parent_xpath = '//div[contains(@class, " order ")][' + (i + 1) + "]";
    const date = document
      .xpath(
        parent_xpath +
          '//div[contains(@class, "order-info")] // span[contains(@class, "value")]'
      )[0]
      .innerText.trim();
    const url = document.xpath(
      parent_xpath + '//a[contains(text(), "注文内容を表示")]'
    )[0].href;

    detail_page_list.push({
      date: date.replace("年", "/").replace("月", "/").replace("日", ""), // 雑だけど動く
      url: url,
    });
  }
  const is_last =
    document.xpath(
      'count(//ul[contains(@class, "a-pagination")]/li[contains(@class, "a-last")]/a)'
    ) == 0;

  return {
    list: detail_page_list,
    is_last: is_last,
  };
}

function order_detail_page_parse() {
  try {
    if (
      document.xpath('count(//div[contains(@class, "a-box shipment")])') != 0
    ) {
      return order_detail_page_parse_normal();
    } else {
      return order_detail_page_parse_digital();
    }
  } catch (e) {
    print_stacktrace(e);

    var amazon_msg = "";
    try {
      amazon_msg = document
        .xpath('//h4[contains(@class, "a-alert-heading")]')[0]
        .innerText.trim();
    } catch (e) {}
    if (amazon_msg != "") {
      return "[amazon]" + amazon_msg;
    } else {
      return e.message;
    }
  }
}

function cmd_handler(cmd, sender, send_response) {
  if (cmd["to"] !== "content") {
    return false;
  }

  if (cmd["type"] === "parse") {
    if (cmd["target"] === "complete_list") {
      complete_list_page_parse(send_response);
    } else if (cmd["target"] === "detail") {
      article_detail_page_parse(send_response);
      // } else if (cmd['target'] === 'order_count') {
      //     send_response(order_count_page_parse())
      // } else if (cmd['target'] === 'list') {
      //     send_response(order_list_page_parse())
    } else {
      log.error({
        msg: "Unknown cmd target",
        cmd: cmd,
      });
      send_response("ERROR: Unknown cmd target");
    }
  } else {
    log.error({
      msg: "Unknown cmd type",
      cmd: cmd,
    });
    send_response("ERROR: Unknown cmd type");
  }

  return true;
}

chrome.runtime.onMessage.addListener(cmd_handler);
