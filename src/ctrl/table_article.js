function create_article_table(id, article_list) {
  item_list = [
    { name: "title", type: "title" },
    { name: "price", type: "price" },
    { name: "sales_commission", type: "price" },
    { name: "delivery_charge", type: "price" },
    { name: "profit", type: "price" },
    { name: "postage", type: "text" },
    { name: "purchase_date", type: "date" },
    { name: "id", type: "id" },
  ];

  var table = document.getElementById(id);
  table.parentNode.replaceChild(table.cloneNode(false), table);

  table = document.getElementById(id);

  var i = 1;
  for (article of article_list) {
    if (!article["detail"]) {
      continue;
    }

    var row = document.createElement("tr");
    var col = document.createElement("td");
    col.textContent = i++;
    row.appendChild(col);

    for (item of item_list) {
      col = document.createElement("td");
      if (item["type"] == "price") {
        col.textContent = article[item["name"]].toLocaleString() + "円";
        col.setAttribute("class", "text-end text-nowrap");
      } else if (item["type"] == "date") {
        col.textContent = article[item["name"]];
        col.setAttribute("class", "text-nowrap");
      } else if (item["type"] == "id") {
        var link = document.createElement("a");
        link.setAttribute("href", article["url"]);
        link.textContent = article[item["name"]];
        col.appendChild(link);
      } else {
        col.textContent = article[item["name"]];
      }
      row.appendChild(col);
    }
    table.appendChild(row);
  }
}
