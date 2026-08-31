let heo_cookiesTime = null
,heo_keyboard = false
,heo_intype = false
,lastSayHello = ""
,refreshNum = 1;
// 私有函数
var heo = {
    // 检测显示模式
    darkModeStatus: function () {
        let theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
        if (theme == 'light') {
            $(".menu-darkmode-text").text("深色模式");
        } else {
            $(".menu-darkmode-text").text("浅色模式");
        }
    },

    // 首页bb
    initIndexEssay: function() {
        if (document.querySelector("#bber-talk")) {
            $(".swiper-wrapper .swiper-slide").each(function () {
                var text = $(this)[0].innerText;
                if (text != 'undefined') {
                    $(this).text(btf.changeContent(text));
                }
            })
            new Swiper(".swiper-container",{
                direction: "vertical",
                loop: !0,
                autoplay: {
                    delay: 3e3,
                    pauseOnMouseEnter: !0
                }
            })
        }
    },


    // 只在首页显示
    onlyHome: function () {
        var urlinfo = window.location.pathname;
        urlinfo = decodeURIComponent(urlinfo);
        if (urlinfo == '/') {
            $('.only-home').attr('style', 'display: flex');
        } else {
            $('.only-home').attr('style', 'display: none');
        }
    },

    //是否在首页
    is_Post: function () {
        var url = window.location.href;  //获取url
        if (url.indexOf("/archives/") >= 0) { //判断url地址中是否包含code字符串
            return true;
        } else {
            return false;
        }
    },


    //监测是否在页面开头
    addNavBackgroundInit: function() {
        var e = 0
            , t = 0;
        document.body && (e = document.body.scrollTop),
        document.documentElement && (t = document.documentElement.scrollTop),
        0 != (e - t > 0 ? e : t) && (document.getElementById("page-header").classList.add("nav-fixed"),
            document.getElementById("page-header").classList.add("nav-visible"),
            $("#cookies-window").hide())
    },

    tagPageActive: function() {
        var e = window.location.pathname;
        if (/\/tags\/.*?/.test(e = decodeURIComponent(e))) {
            var t = e.split("/")[2];
            if (document.querySelector("#tag-page-tags")) {
                $("a").removeClass("select");
                var o = document.getElementById(t);
                o && (o.classList.add("select"),
                    o.style.order = "-1")
            }
        }
    },

    categoriesBarActive: function() {
        document.querySelector("#category-bar") && $(".category-bar-item").removeClass("select");
        var e = window.location.pathname;
        if ("/" == (e = decodeURIComponent(e)))
            document.querySelector("#category-bar") && document.getElementById("category-bar-home").classList.add("select");
        else {
            if (/\/categories\/.*?/.test(e)) {
                var t = e.split("/")[2];
                if (document.querySelector("#category-bar")) {
                    var o = document.getElementById(t);
                    o && (o.classList.add("select"),
                        o.style.order = "-1")
                }
            }
        }
    },

    // 页脚友链
    addFriendLinksInFooter: function () {
        var footerRandomFriendsBtn = document.getElementById("footer-random-friends-btn");
        if(!footerRandomFriendsBtn) return;
        footerRandomFriendsBtn.style.opacity = "0.2";
        footerRandomFriendsBtn.style.transitionDuration = "0.3s";
        footerRandomFriendsBtn.style.transform = "rotate(" + 360 * refreshNum++ + "deg)";
        function getLinks(){
            const fetchUrl = "/apis/api.plugin.halo.run/v1alpha1/plugins/PluginLinks/links?keyword="
            fetch(fetchUrl)
                .then(res => res.json())
                .then(json => {
                    saveToLocal.set('links-data', JSON.stringify(json.items), 10 / (60 * 24))
                    renderer(json.items);
                })
        }
        function renderer(data){
            const linksUrl = GLOBAL_CONFIG.source.links.linksUrl
            const num = GLOBAL_CONFIG.source.links.linksNum
            var randomFriendLinks = getArrayItems(data, num);
            var htmlText = '';
            for (let i = 0; i < randomFriendLinks.length; ++i) {
                var item = randomFriendLinks[i]
                htmlText += `<a class='footer-item' href='${item.spec.url}'  target="_blank" rel="noopener nofollow">${item.spec.displayName}</a>`;
            }
            htmlText += `<a class='footer-item' href='${linksUrl}'>更多</a>`
            if(document.getElementById("friend-links-in-footer")){
                document.getElementById("friend-links-in-footer").innerHTML = htmlText;
            }
        }
        function friendLinksInFooterInit(){
            const data = saveToLocal.get('links-data')
            if (data) {
                renderer(JSON.parse(data))
            } else {
                getLinks()
            }
            setTimeout(()=>{
                footerRandomFriendsBtn.style.opacity = "1";
            }, 300)
        }
        friendLinksInFooterInit();
    },

    //禁止图片右键单击
    stopImgRightDrag: function () {
        var img = $("img");
        img.on("dragstart", function () {
            return false;
        });
    },

    //置顶文章横向滚动
    topPostScroll: function () {
        if (document.getElementById("recent-post-top")) {
            let xscroll = document.getElementById("recent-post-top");
            xscroll.addEventListener("mousewheel", function (e) {
                //计算鼠标滚轮滚动的距离
                let v = -e.wheelDelta / 2;
                xscroll.scrollLeft += v;
                //阻止浏览器默认方法
                if (document.body.clientWidth < 1300) {
                    e.preventDefault();
                }
            }, false);
        }
    },

    topCategoriesBarScroll: function () {
        if (document.getElementById("category-bar-items")) {
            let xscroll = document.getElementById("category-bar-items");
            xscroll.addEventListener("mousewheel", function (e) {
                //计算鼠标滚轮滚动的距离
                let v = -e.wheelDelta / 2;
                xscroll.scrollLeft += v;
                //阻止浏览器默认方法
                e.preventDefault();
            }, false);
        }
    },

    //作者卡片问好
    sayhi: function () {
        if (GLOBAL_CONFIG.profileStyle == 'default') {
            if (document.querySelector('#author-info__sayhi')) {
                document.getElementById("author-info__sayhi").innerHTML = getTimeState() + "！我是";
            }
        }else{
            if (document.querySelector('#author-info__sayhi')) {
                document.getElementById("author-info__sayhi").innerHTML = getTimeState();
            }
        }

    },

    // 二维码
    qrcodeCreate: function () {
        if (document.getElementById('qrcode')) {
            document.getElementById("qrcode").innerHTML = "";
            var qrcode = new QRCode(document.getElementById("qrcode"), {
                text: window.location.href,
                width: 250,
                height: 250,
                colorDark: "#000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    },

    // 刷新即刻短文瀑布流
    reflashEssayWaterFall: function() {
        document.querySelector("#waterfall") && setTimeout((function() {
                waterfall("#waterfall"),
                    document.getElementById("waterfall") && document.getElementById("waterfall").classList.add("show")
            }
        ), 500)
    },

    // 下载图片
    downloadImage: function (imgsrc, name) { //下载图片地址和图片名
        rm.hideRightMenu();
        if (rm.downloadimging == false) {
            rm.downloadimging = true;
            btf.snackbarShow('正在下载中，请稍后', false, 10000)
            setTimeout(function () {
                let image = new Image();
                // 解决跨域 Canvas 污染问题
                image.setAttribute("crossOrigin", "anonymous");
                image.onload = function () {
                    let canvas = document.createElement("canvas");
                    canvas.width = image.width;
                    canvas.height = image.height;
                    let context = canvas.getContext("2d");
                    context.drawImage(image, 0, 0, image.width, image.height);
                    let url = canvas.toDataURL("image/png"); //得到图片的base64编码数据
                    let a = document.createElement("a"); // 生成一个a元素
                    let event = new MouseEvent("click"); // 创建一个单击事件
                    a.download = name || "photo"; // 设置图片名称
                    a.href = url; // 将生成的URL设置为a.href属性
                    a.dispatchEvent(event); // 触发a的单击事件
                };
                image.src = imgsrc;
                btf.snackbarShow('图片已添加盲水印，请遵守版权协议');
                rm.downloadimging = false;
            }, "10000");
        } else {
            btf.snackbarShow('有正在进行中的下载，请稍后再试');
        }
    },

    //隐藏cookie窗口
    hidecookie: function() {
        heo_cookiesTime = setTimeout((()=>{
                document.getElementById("cookies-window").classList.add("cw-hide"),
                    setTimeout((()=>{
                            $("#cookies-window").hide()
                        }
                    ), 1e3)
            }
        ), 3e3)
    },

    //隐藏今日推荐
    hideTodayCard: function() {
        document.getElementById("topGroup") && document.getElementById("topGroup").classList.add("hideCard")
    },

    //更改主题色
    changeThemeColor: function (color) {
        if (document.querySelector('meta[name="theme-color"]') !== null) {
            document.querySelector('meta[name="theme-color"]').setAttribute('content', color)
        }
    },

    //自适应主题色
    initThemeColor: function () {
        if (heo.is_Post()) {
            const currentTop = window.scrollY || document.documentElement.scrollTop
            if (currentTop === 0) {
                let themeColor = getComputedStyle(document.documentElement).getPropertyValue('--heo-main');
                heo.changeThemeColor(themeColor);
            } else {
                let themeColor = getComputedStyle(document.documentElement).getPropertyValue('--heo-background');
                heo.changeThemeColor(themeColor);
            }
        } else {
            let themeColor = getComputedStyle(document.documentElement).getPropertyValue('--heo-background');
            heo.changeThemeColor(themeColor);
        }
    },

    //跳转到指定位置
    jumpTo: function (dom) {
        $(document).ready(function () {
            $("html,body").animate({
                scrollTop: $(dom).eq(i).offset().top
            }, 500 /*scroll实现定位滚动*/); /*让整个页面可以滚动*/
        });
    },

    //显示加载动画
    showLoading: function () {
        document.querySelector("#loading-box").classList.remove("loaded");
        let cardColor = getComputedStyle(document.documentElement).getPropertyValue('--heo-card-bg');
        heo.changeThemeColor(cardColor);
    },

    //隐藏加载动画
    hideLoading: function () {
        document.querySelector("#loading-box").classList.add("loaded");
    },

    // 显示打赏中控台
    rewardShowConsole: function () {
        $('.console-card-group-reward').attr('style', 'display: flex');
        $('.console-card-group').attr('style', 'display: none');
        document.querySelector("#console").classList.add("show");
        heo.initConsoleState()

    },

    //显示中控台
    showConsole: function () {
        $('.console-card-group-reward').attr('style', 'display: none');
        $('.console-card-group').attr('style', 'display: flex');
        document.querySelector("#console").classList.add("show");


    },

    //隐藏中控台
    hideConsole: function () {
        document.querySelector("#console").classList.remove("show");
    },

    //快捷键功能开关
    keyboardToggle: function () {
        if (heo_keyboard) {
            heo_keyboard = false;
            document.querySelector("#consoleKeyboard").classList.remove("on");
            localStorage.setItem('keyboardToggle', 'false');
        } else {
            heo_keyboard = true;
            document.querySelector("#consoleKeyboard").classList.add("on");
            localStorage.setItem('keyboardToggle', 'true');
        }
    },

    //滚动到指定id
    scrollTo: function(e) {
        const t = document.getElementById(e);
        if (t) {
            const e = t.getBoundingClientRect().top + window.pageYOffset - 80
                , o = window.pageYOffset
                , n = e - o;
            let a = null;
            window.requestAnimationFrame((function e(t) {
                    a || (a = t);
                    const l = t - a
                        , i = (c = Math.min(l / 0, 1)) < .5 ? 2 * c * c : (4 - 2 * c) * c - 1;
                    var c;
                    window.scrollTo(0, o + n * i),
                    l < 600 && window.requestAnimationFrame(e)
                }
            ))
        }
    },

    //隐藏侧边栏
    hideAsideBtn: () => { // Hide aside
        const $htmlDom = document.documentElement.classList
        $htmlDom.contains('hide-aside')
            ? saveToLocal.set('aside-status', 'show', 2)
            : saveToLocal.set('aside-status', 'hide', 2)
        $htmlDom.toggle('hide-aside')
        $htmlDom.contains("hide-aside") ? document.querySelector("#consoleHideAside").classList.add("on") : document.querySelector("#consoleHideAside").classList.remove("on")
    },
    toPage: function() {
        var e = document.querySelectorAll(".page-number")
            , t = parseInt(e[e.length - 1].innerHTML)
            , o = document.getElementById("toPageText")
            , n = parseInt(o.value);
        if (!isNaN(n) && n > 0 && "0" !== ("" + n)[0] && n <= t) {
            var url = window.location.href;

            var photosIndexOf = url.indexOf("?group") >= 0 ? url.indexOf("?group") : -1;
            if (photosIndexOf >= 0) {//图库页面
                var new_url = url.substr(0,photosIndexOf);
                var group = url.substr(photosIndexOf)
                var a, l = new_url.replace(/\/page\/\d$/, "");
                a = 1 === n ? l : l + (l.endsWith("/") ? "" : "/") + "page/" + n,
                    document.getElementById("toPageButton").href = a + group
            }else{
                var a, l = url.replace(/\/page\/\d$/, "");
                a = 1 === n ? l : l + (l.endsWith("/") ? "" : "/") + "page/" + n,
                    document.getElementById("toPageButton").href = a
            }
            //首页有第一屏就跳转指定位置
            scrollToPost();

        }
    },
    changeSayHelloText: function() {
        const greetings = GLOBAL_CONFIG.helloText.length == 0 ? ["🤖️ 数码科技爱好者", "🔍 分享与热心帮助", "🏠 智能家居小能手", "🔨 设计开发一条龙", "🤝 专修交互与设计", "🏃 脚踏实地行动派", "🧱 团队小组发动机", "💢 壮汉人狠话不多"] : GLOBAL_CONFIG.helloText
            , authorInfoSayHiElement = document.getElementById("author-info__sayhi");
        // 如果只有一个问候语，设置为默认值
        if (greetings.length === 1) {
            authorInfoSayHiElement.textContent = greetings[0];
            return;
        }
        let randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        for (; randomGreeting === lastSayHello; )
            randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        authorInfoSayHiElement.textContent = randomGreeting,
            lastSayHello = randomGreeting
    },

    //初始化console图标
    initConsoleState: function() {
        document.documentElement.classList.contains("hide-aside") ? document.querySelector("#consoleHideAside").classList.add("on") : document.querySelector("#consoleHideAside").classList.remove("on")
    },
};
$(document).ready((function() {
        initBlog()
    }
)),
document.addEventListener("pjax:complete", (function() {
        initBlog();
        // 解决 katex pjax问题
        if((GLOBAL_CONFIG.htmlType == 'post' || GLOBAL_CONFIG.htmlType == 'page') && typeof window.renderKaTex != 'undefined'){
            window.renderKaTex();
        }
     }
));
