async function export_csv(article_list) {
  const handle = await file_handle();

  const writable = await handle.createWritable();
  await writable.write(csv_convert(article_list));
  //    await writable.write(JSON.stringify(data))
  await writable.close();
}

function file_handle() {
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
