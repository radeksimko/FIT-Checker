function chromeBrowser() {
    this.removeBadge = function () {
        chrome.browserAction.setBadgeText({
            'text': ''
        });
    };

    this.setBadge = function (value) {
        chrome.browserAction.setBadgeBackgroundColor({
            'color': [0, 0, 0, 255]
        });
        chrome.browserAction.setBadgeText({
            'text': value
        });
    };

    this.getLinksAlive = function (className) {
        if (className == null) {
            className = 'link';
        }
        var parent = this;
        $("a." + className).live('click', function() {
            parent.openUrl($(this).attr('href'));
        });
    };
    
    this.openUrl = function (url) {
        chrome.tabs.create({
            'url': url
        });
    };

    this.loginToKos = function() {
        chrome.tabs.create({
            'url': 'https://kos.cvut.cz/kos/login.do',
            'selected': false
        }, function(tab) {
            chrome.tabs.executeScript(tab.id, {
                'code':
                    "var data = {};" +
                    "elements = document.forms['login'].elements;" +
                    "for (i = 0; i < elements.length; i++) {" +
                    "   if (elements[i].name != '') {" +
                    "       data[elements[i].name] = elements[i].value;" +
                    "   }" +
                    "}" +
                    "var head = document.head.innerHTML;" +
                    'pageCode = head.replace(/[\\w\\W]*var pageCode=\'([^;]*)\';[\\w\\W]*/m, "$1");' +
                    "data.pageCode = pageCode;" +
                    "chrome.extension.sendRequest(data);"
            });
        });

        chrome.extension.onRequest.addListener(
            function(request) {
                xhr = new XMLHttpRequest();
                xhr.open("POST", "https://kos.cvut.cz/kos/login.do?page=" +
                    request.pageCode, true);
                xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xhr.onreadystatechange = function() {
                    if (xhr.readyState == 4) {
                        response = xhr.responseText;
                        pageCode = response.replace(/[\w\W]*var pageCode=\'([^;]*)\';[\w\W]*/m, "$1");
                        
                        xhrDetail = new XMLHttpRequest();
                        xhrDetail.open("POST", "https://kos.cvut.cz/kos/studyPlan.do?page=" +
                            pageCode, true);
                        xhrDetail.onreadystatechange = function() {
                            if (xhrDetail.readyState == 4) {
                                //console.log(xhrDetail.responseText);
                            }
                        };
                        myParams = '';
                        
                        console.log($('form[name="studyplan"]', xhr.responseText));
                        myParams += 'action=StudyplanAction_checkAbsolved&';
                        xhrDetail.send(myParams);
                    }
                };
                var params = '';
                for (var key in request) {
                    params += key + '=' + request[key] + '&';
                }
                xhr.send(params);
            }
        );
    };
}