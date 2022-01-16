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
      await sleep(1);
    }
    break;
  }
}

async function complete_list_page_parse(send_response) {
  article_list = [];

  await wait_for_xpath('//mer-tab-panel[@id="completed"]//mer-list-item');

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

async function complete_detail_page_parse(send_response) {
  heading_map = {
    商品代金: {
      name: "price",
      xpath: "//mer-price",
      value: function (elem) {
        return parseInt(elem.getAttribute("value").trim(), 10);
      },
    },
    販売手数料: {
      name: "sales_commission",
      xpath: "//mer-price",
      value: function (elem) {
        return parseInt(elem.getAttribute("value").trim(), 10);
      },
    },
    配送料: {
      name: "delivery_charge",
      xpath: "//mer-price",
      value: function (elem) {
        return parseInt(elem.getAttribute("value").trim(), 10);
      },
    },
    販売利益: {
      name: "profit",
      xpath: "//mer-price",
      value: function (elem) {
        return parseInt(elem.getAttribute("value").trim(), 10);
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

  await wait_for_xpath("//mer-item-object");

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

function parse_onsale_article(index) {
  const parent_xpath =
    '//mer-list[@data-testid="listed-item-list"]/mer-list-item[' +
    (index + 1) +
    "]";

  const article_root = document.xpath(parent_xpath + "//mer-item-object")[0]
    .shadowRoot;

  const article_url = document.xpath(parent_xpath + "//a")[0].href;
  const article_id = article_url.split("/").slice(-1)[0];
  const article_title = article_root
    .querySelector("div.container")
    .getAttribute("aria-label");
  const article_price = parseInt(
    article_root.querySelector("mer-price").getAttribute("value"),
    10
  );

  var article_is_stop = 0;
  if (article_root.querySelector("div.content > mer-text") != null) {
    article_is_stop = 1;
  }

  var article_view = 0;
  try {
    article_view = article_root.querySelector(
      "mer-icon-eye-outline + span.icon-text"
    ).textContent;
  } catch (e) {}

  return {
    id: article_id,
    title: article_title,
    price: article_price,
    view: article_view,
    is_stop: article_is_stop,
    url: article_url,
  };
}

async function onsale_list_page_parse(send_response) {
  var article_list = [];

  await wait_for_xpath(
    '//mer-list[@data-testid="listed-item-list"]/mer-list-item'
  );

  const article_count = document.xpath(
    '//mer-list[@data-testid="listed-item-list"]/mer-list-item'
  ).length;
  for (var i = 0; i < article_count; i++) {
    article_list.push(parse_onsale_article(i));
  }

  send_response({
    list: article_list,
  });
}

function cmd_handler(cmd, sender, send_response) {
  if (cmd["to"] !== "content") {
    return false;
  }

  if (cmd["type"] === "parse") {
    if (cmd["target"] === "complete_list") {
      complete_list_page_parse(send_response);
    } else if (cmd["target"] === "complete_detail") {
      complete_detail_page_parse(send_response);
    } else if (cmd["target"] === "onsale_list") {
      onsale_list_page_parse(send_response);
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
