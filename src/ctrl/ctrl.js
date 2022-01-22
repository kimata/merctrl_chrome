const mode_list = ['onsale', 'complete']
var start_time = {}
var article_info = {}
var article_list = {}
var ctrl = {
    mode: 'onsale'
}

function state_init() {
    mode = ctrl['mode']
    start_time[mode] = new Date()
    article_list[mode] = []
    status_clear()
    progress_init()
    notify_progress()
}

function progress_init() {
    mode = ctrl['mode']

    article_info[mode] = {
        count_total: 0,
        count_done: 0
    }
    notify_progress()
}

// 実行順序を保ちながら非同期でリストに対して処理を実行
function async_loop(list, index, func, next) {
    return new Promise(function (resolve, reject) {
        if (index == list.length) {
            return resolve(false)
        }
        func(list[index], index, function () {
            return resolve(true)
        })
    }).then(function (is_continue) {
        if (is_continue) {
            return async_loop(list, index + 1, func, next)
        } else {
            next()
        }
    })
}

function get_article_detail(article, index, mode, callback) {
    cmd_handle(
        {
            to: 'background',
            type: 'parse',
            target: 'complete_detail',
            index: index,
            url: article['url']
        },
        function (response) {
            if (typeof response === 'undefined') {
                return callback()
            }
            response['article']['url'] = article['url']
            response['article']['detail'] = true

            article_list[mode][parseInt(index, 10)] = response['article']
            create_article_table('table_' + mode, mode, article_list[mode])

            article_info[mode]['count_done'] += 1

            notify_progress()
            callback()
        }
    )
}

function get_complete_list() {
    new Promise((resolve) => {
        cmd_handle(
            {
                to: 'background',
                type: 'parse',
                target: 'complete_list'
            },
            function (response) {
                article_list['complete'] = response['list']
                article_info['complete']['count_total'] = response['list'].length

                notify_progress()
                resolve(response['list'])
            }
        )
    })
        .then((list) => {
            return new Promise(function (resolve) {
                async_loop(
                    list,
                    0,
                    function (article, index, callback) {
                        get_article_detail(article, index, 'complete', callback)
                    },
                    resolve
                )
            })
        })
        .then(() => {
            status_info('完了しました．')
            worker_destroy()
            button_state_update(true)
        })
}

function update_pricedown_button(event) {
    if (event.target.id == 'checkbox_all') {
        for (var item of document.getElementsByClassName('form-check-input')) {
            if (item.disabled) {
                continue
            }
            item.checked = event.target.checked
        }
    }

    if (
        parseInt(document.getElementById('down_step').value, 10) == 0 ||
        parseInt(document.getElementById('threshold').value, 10) == 0
    ) {
        document.getElementById('start_pricedown').disabled = true
        return
    }

    var checked = false
    for (var item of document.getElementsByClassName('form-check-input')) {
        if (item.checked) {
            checked = true
            break
        }
    }
    document.getElementById('start_pricedown').disabled = !checked

    article_list_check_update()
}

function checkbox_callback() {
    for (var checkbox of document.getElementsByClassName('form-check-input')) {
        checkbox.onchange = update_pricedown_button
    }
    document.getElementById('down_step').onchange = update_pricedown_button
    document.getElementById('threshold').onchange = update_pricedown_button
}

function get_onsale_list() {
    new Promise((resolve) => {
        cmd_handle(
            {
                to: 'background',
                type: 'parse',
                target: 'onsale_list'
            },
            function (response) {
                article_list['onsale'] = response['list']
                var mode = 'onsale'
                create_article_table('table_' + mode, mode, article_list[mode], checkbox_callback)
                resolve()
            }
        )
    }).then(() => {
        status_info('完了しました．')
        worker_destroy()
        button_state_update(true)
    })
}

function do_article_pricedown(article, index, setting, callback) {
    log.trace(article)

    if (!article['target']) {
        status_info(index + 1 + '件目は対象外なのでスキップしました．')
        article_info['onsale']['count_done'] += 1
        notify_progress()
        callback()
        return
    }

    cmd_handle(
        {
            to: 'background',
            type: 'parse',
            target: 'pricedown_input',
            index: index,
            url: 'https://jp.mercari.com/sell/edit/' + article['id'],
            down_step: setting['down_step'],
            threshold: setting['threshold']
        },
        function (response) {
            if (typeof response === 'undefined') {
                article_info['onsale']['count_done'] += 1
                notify_progress()
                return callback()
            }
            Object.assign(article, response['article'])

            delete article['error']
            if ('error' in response) {
                article['error'] = response['error']
                delete article['price_after']
                delete article['price_total_after']
            } else {
                article['price'] = article['price_total_after']
            }
            article['done'] = true

            create_article_table('table_' + mode, mode, article_list[mode])

            article_info['onsale']['count_done'] += 1
            notify_progress()
            callback()
        }
    )
}

function do_list_pricedown() {
    var down_step = parseInt(document.getElementById('down_step').value, 10)
    var threshold = parseInt(document.getElementById('threshold').value, 10)

    progress_init()
    article_info['onsale']['count_total'] = article_list['onsale'].length

    article_list_done_clear()
    create_article_table('table_' + mode, mode, article_list[mode])

    new Promise((resolve) => {
        async_loop(
            article_list['onsale'],
            0,
            function (article, index, callback) {
                do_article_pricedown(
                    article,
                    index,
                    {
                        down_step: down_step,
                        threshold: threshold
                    },
                    callback
                )
            },
            resolve
        )
    }).then(() => {
        status_info('完了しました．')
        worker_destroy()
    })
}

function button_state_update(done) {
    for (mode of ['complete', 'onsale']) {
        if (done) {
            document.getElementById('start_' + mode).disabled = false
        } else {
            document.getElementById('start_' + mode).disabled = true
        }
    }
}

function article_list_done_clear() {
    for (var article of article_list['onsale']) {
        delete article['done']
        delete article['error']
    }
}

function article_list_check_update() {
    for (var article of article_list['onsale']) {
        article['target'] = document.getElementById('checkbox_' + article['id']).checked
    }
}

document.getElementById('save').onclick = function () {
    export_csv(article_list[ctrl['mode']])
}

document.getElementById('start_complete').onclick = function () {
    button_state_update(false)

    state_init()
    status_info('開始します．')

    worker_init().then(() => {
        var mode = ctrl['mode']
        create_article_table('table_' + mode, mode, article_list[mode])

        get_complete_list()
    })
}

document.getElementById('start_onsale').onclick = function () {
    button_state_update(false)

    state_init()
    status_info('開始します．')

    worker_init().then(() => {
        var mode = ctrl['mode']
        create_article_table('table_' + mode, mode, article_list[mode])

        get_onsale_list()
    })
}

document.getElementById('start_pricedown').onclick = function () {
    ctrl['mode'] = 'onsale'

    status_clear()
    status_info('開始します．')

    worker_init().then(() => {
        do_list_pricedown()
    })
}

for (mode of mode_list) {
    document.getElementById('nav_' + mode).onclick = (function (mode) {
        return function () {
            document.getElementById('nav_' + ctrl['mode']).setAttribute('class', 'nav-link')
            document.getElementById('nav_' + mode).setAttribute('class', 'nav-link active')

            document.getElementById('content_' + ctrl['mode']).style.display = 'none'
            document.getElementById('content_' + mode).style.display = 'block'

            ctrl['mode'] = mode
        }
    })(mode)
}
