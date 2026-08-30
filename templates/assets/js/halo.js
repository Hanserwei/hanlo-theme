let halo = {
    darkComment: () => {
        if (document.querySelector('#comment div').shadowRoot.querySelector('.halo-comment-widget').classList != null) {
            let commentDOMclass = document.querySelector('#comment div').shadowRoot.querySelector('.halo-comment-widget').classList
            if (commentDOMclass.contains('light'))
                commentDOMclass.replace('light', 'dark')
            else
                commentDOMclass.replace('dark', 'light')
        }

    },


    addScript: (e, t, n) => {
        if (document.getElementById(e))
            return n ? n() : void 0;
        let a = document.createElement("script");
        a.src = t,
            a.id = e,
        n && (a.onload = n),
            document.head.appendChild(a)
    },

    danmu: () => {
        const e = new EasyDanmakuMin({
            el: "#danmu",
            line: 10,
            speed: 20,
            hover: !0,
            loop: !0
        });
        let t = saveToLocal.get("danmu");
        if (t)
            e.batchSend(t, !0);
        else {
            let n = [];
            if (GLOBAL_CONFIG.source.comments.use == 'Twikoo') {
                fetch(GLOBAL_CONFIG.source.twikoo.twikooUrl, {
                    method: "POST",
                    body: JSON.stringify({
                        event: "GET_RECENT_COMMENTS",
                        accessToken: GLOBAL_CONFIG.source.twikoo.accessToken,
                        includeReply: !1,
                        pageSize: 5
                    }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).then((e => e.json())).then((({data: t}) => {
                        t.forEach((e => {
                                null == e.avatar && (e.avatar = "https://cravatar.cn/avatar/d615d5793929e8c7d70eab5f00f7f5f1?d=mp"),
                                    n.push({
                                        avatar: e.avatar,
                                        content: e.nick + "：" + btf.changeContent(e.comment),
                                        href: e.url + '#' + e.id

                                    })
                            }
                        )),
                            e.batchSend(n, !0),
                            saveToLocal.set("danmu", n, .02)
                    }
                ))
            }
            if (GLOBAL_CONFIG.source.comments.use == 'Artalk') {
                const statheaderList = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Origin': window.location.origin
                    },
                    body: new URLSearchParams({
                        'site_name': GLOBAL_CONFIG.source.artalk.siteName,
                        'limit': '100',
                        'type': 'latest_comments'
                    })
                }
                fetch(GLOBAL_CONFIG.source.artalk.artalkUrl + 'api/stat', statheaderList)
                    .then((e => e.json())).then((({data: t}) => {
                        t.forEach((e => {
                                n.push({
                                    avatar: 'https://cravatar.cn/avatar/' + e.email_encrypted + '?d=mp&s=240',
                                    content: e.nick + "：" + btf.changeContent(e.content_marked),
                                    href: e.page_url + '#atk-comment-' + e.id

                                })
                            }
                        )),
                            e.batchSend(n, !0),
                            saveToLocal.set("danmu", n, .02)
                    }
                ))
            }
            if (GLOBAL_CONFIG.source.comments.use == 'Waline') {
                const loadWaline = () => {
                    Waline.RecentComments({
                        serverURL: GLOBAL_CONFIG.source.waline.serverURL,
                        count: 50
                    }).then(({comments}) => {
                        const walineArray = comments.map(e => {
                            return {
                                'content': e.nick + "：" + btf.changeContent(e.comment),
                                'avatar': e.avatar,
                                'href': e.url + '#' + e.objectId,
                            }
                        })
                        e.batchSend(walineArray, !0),
                            saveToLocal.set("danmu", walineArray, .02)
                    })
                }
                if (typeof Waline === 'object') loadWaline()
                else getScript(GLOBAL_CONFIG.source.waline.js).then(loadWaline)
            }

        }
        document.getElementById("danmuBtn").innerHTML = "<button class=\"hideBtn\" onclick=\"document.getElementById('danmu').classList.remove('hidedanmu')\">显示弹幕</button> <button class=\"hideBtn\" onclick=\"document.getElementById('danmu').classList.add('hidedanmu')\">隐藏弹幕</button>"
    },

    changeMarginLeft(element) {
        var randomMargin = Math.floor(Math.random() * 901) + 100; // 生成100-1000之间的随机数
        element.style.marginLeft = randomMargin + 'px';
    },

    getTopSponsors() {

        var show_num = GLOBAL_CONFIG.source.power.showNum


        function getPower() {
            const url = "/apis/api.plugin.halo.run/v1alpha1/plugins/plugin-afdian/afdian/getSponsorList"
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    console.log(data)
                    if (200 === data["ec"]) {
                        const values = data["data"]["list"];
                        saveToLocal.set('power-data', JSON.stringify(values), 10 / (60 * 24))
                        renderer(values);
                    }

                })
        }

        function renderer(values) {
            var data = getArrayItems(values, 1);
            let powerStar = document.getElementById("power-star")
            if (values.length === 0) {
                powerStar.href = GLOBAL_CONFIG.source.power.powerLink + GLOBAL_CONFIG.source.power.username
                powerStar.innerHTML = ` 
                        <div id="power-star-image" style="background-image: url('/themes/theme-hanlo/assets/images/afadian/afadian.webp')">
                        </div>
                        <div class="power-star-body">
                            <div id="power-star-title">还没有人赞助～</div>
                            <div id="power-star-desc">为爱发电，点击赞助</div>
                        </div>`;
            } else {
                if (powerStar) {
                    powerStar.href = GLOBAL_CONFIG.source.power.powerLink + data[0]["user"].user_id
                    powerStar.innerHTML = ` 
                        <div id="power-star-image" style="background-image: url(${data[0]["user"].avatar})">
                        </div>
                        <div class="power-star-body">
                            <div id="power-star-title">${data[0]["user"].name}</div>
                            <div id="power-star-desc">更多支持，为爱发电</div>
                        </div>`;
                }

                if (values.length > 1) {
                    var i = 0;
                    var htmlText = '';
                    for (let value of values) {
                        if (i > parseInt(show_num)) {
                            break;
                        }
                        htmlText += ` <a href="${"https://afdian.net/u/" + value["user"]["user_id"]}" rel="external nofollow" target="_blank" th:title="${value["user"]["name"]}">${value["user"]["name"]}</a>`;
                        i = i + 1;
                    }
                    if (document.getElementById("power-item-link")) {
                        document.getElementById("power-item-link").innerHTML = htmlText;
                    }
                }
            }
        }

        function init() {
            const data = saveToLocal.get('power-data')
            if (data) {
                renderer(JSON.parse(data))
            } else {
                getPower()
            }
        }

        document.getElementById("power-star") && init()
    }
    ,

    checkAd() {
        var default_enable = GLOBAL_CONFIG.source.footer.default_enable
        if (default_enable) {
            var adElement = document.getElementById("footer-banner");
            var notMusic = document.body.getAttribute("data-type") != "music"; // 检测是否为音乐页面
            if ((adElement.offsetWidth <= 0 || adElement.offsetHeight <= 0) && notMusic) {
                // 元素不可见，可能被拦截
                console.log("Element may be blocked by AdBlocker Ultimate");
                alert("页脚信息可能被AdBlocker Ultimate拦截，请检查广告拦截插件！")
            }
        }
    },

}
