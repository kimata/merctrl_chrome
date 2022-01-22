// FIXME: スパゲッティ！
function create_article_table(id, mode, article_list, callback = () => {}) {
    var item_list
    if (mode == 'onsale') {
        item_list = [
            { name: 'target', type: 'checkbox' },
            { name: 'title', type: 'title' },
            { name: 'price', type: 'price' },
            { name: 'delivery_charge', type: 'price' },
            { name: 'payer', type: 'text' },
            { name: 'method', type: 'text' },
            { name: 'is_stop', type: 'flag' },
            { name: 'done', type: 'done' },
            { name: 'id', type: 'id' }
        ]
    } else {
        item_list = [
            { name: 'title', type: 'title' },
            { name: 'price', type: 'price' },
            { name: 'sales_commission', type: 'price' },
            { name: 'delivery_charge', type: 'price' },
            { name: 'profit', type: 'price' },
            { name: 'postage', type: 'text' },
            { name: 'purchase_date', type: 'date' },
            { name: 'id', type: 'id' }
        ]
    }

    var table = document.getElementById(id)
    console.log(table)
    console.log(item_list)
    console.log(article_list)

    table.parentNode.replaceChild(table.cloneNode(false), table)

    table = document.getElementById(id)

    var i = 1
    for (article of article_list) {
        if (mode == 'complete' && !article['detail']) {
            continue
        }
        console.log(article)

        var row = document.createElement('tr')
        var col = document.createElement('td')
        col.textContent = i++
        row.appendChild(col)

        for (item of item_list) {
            col = document.createElement('td')
            if (item['type'] == 'price') {
                var price = article[item['name']]
                if (typeof price === 'undefined') {
                    col.textContent = '-'
                } else {
                    if ('price_total_after' in article) {
                        col.textContent =
                            article['price_total_before'].toLocaleString() +
                            ' →  ' +
                            article['price_total_after'].toLocaleString() +
                            '円'
                    } else {
                        col.textContent = price.toLocaleString() + '円'
                    }
                }
                col.setAttribute('class', 'text-end text-nowrap')
            } else if (item['type'] == 'date') {
                col.textContent = article[item['name']]
                col.setAttribute('class', 'text-nowrap')
            } else if (item['type'] == 'id') {
                var link = document.createElement('a')
                link.setAttribute('href', article['url'])
                link.textContent = article[item['name']]
                col.appendChild(link)
            } else if (item['type'] == 'checkbox') {
                var checkbox = document.createElement('input')
                checkbox.setAttribute('type', 'checkbox')
                checkbox.setAttribute('id', 'checkbox_' + article['id'])
                checkbox.setAttribute('class', 'form-check-input')
                checkbox.checked = article[item['name']]

                if (article['is_stop']) {
                    checkbox.setAttribute('disabled', 'disabled')
                }
                col.appendChild(checkbox)
            } else if (item['type'] == 'flag') {
                if (article[item['name']]) {
                    col.textContent = '️\u2714'
                } else {
                    col.textContent = ''
                }
            } else if (item['type'] == 'done') {
                if ('error' in article) {
                    col.setAttribute('class', 'text-danger')
                    col.textContent = article['error']
                } else if (article[item['name']]) {
                    var badge = document.createElement('span')
                    badge.setAttribute('class', 'badge bg-success')
                    badge.textContent = '️完了'
                    col.appendChild(badge)
                }
            } else if (item['type'] == 'text') {
                text = article[item['name']]
                if (typeof text !== 'undefined') {
                    col.textContent = text
                }
            } else {
                col.textContent = article[item['name']]
            }
            row.appendChild(col)
        }
        table.appendChild(row)
    }
    callback()
}
