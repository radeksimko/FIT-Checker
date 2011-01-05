// Browser class instance variable
var browser;

// Status functions - messages to user
function hideStatus() {
    $("div#status").fadeOut();
}
function setStatus(text, type) {
    $(document).scrollTop(0);
    $("div#status").html(text).addClass(type);
    if (type == 'ok') {
        setTimeout(hideStatus, 500);
    }
}

// Fill prepared data into the extension DOM
function fillData(username, subjects, contents, statuses, points) {
    var i = 0;
    var htmlList = '';
    var statusClass = '';
    var pointsContent = null;

    htmlList = '<ul>';
    for (i = 0; i < subjects.length; i++) {
        if (statuses[i] == 'inclusion') {
            statusClass = ' orange';
        } else if(statuses[i] == 'succeed') {
            statusClass = ' green';
        } else if(statuses[i] == 'failed') {
            statusClass = ' red';
        } else {
            statusClass = '';
        }
        htmlList += '<li><a class="tab' + statusClass + '" href="#" id="' +
        subjects[i] + '">' + subjects[i] + '</a></li>';
        if (contents[i] == null) {
            contents[i] = 'Data nejsou k dispozici.';
        }
        pointsContent = '';
        if (points[i] != null) {
            pointsContent = '<div class="points">' + points[i] + '</div>';
        }
        $("div#content").append('<div id="' + subjects[i] +
            '_content" class="subject">' + contents[i] + pointsContent +
                '<a class="edux-link" href="https://edux.fit.cvut.cz/courses/' +
                subjects[i] + '/classification/student/' + username +
                '/start">' + subjects[i] + ' na Eduxu</a>' +
            '</div>');
        $("div#" + subjects[i] + '_content').hide();
    }
    
    browser.getLinksAlive('edux-link');

    htmlList += '</ul>';
    $("div#menu").html(htmlList);
    $("div#menu").css("display", "block");

    $("a#" + subjects[0]).parent().addClass("current");
    $("div#" + subjects[0] + '_content').show();

    setStatus('Sta\u017Eeno', 'ok');

    $('#menu a.tab').live('click', function() {
        // Get the tab name
        var contentname = $(this).attr("id") + "_content";

        // hide all other tabs
        $("div#content div.subject").hide();
        $("div#menu ul li").removeClass("current");

        // show current tab
        $("div#" + contentname).show();
        $(this).parent().addClass("current");
    });
}

// Parsing logic for each subject
function parseSubjectData(responseText) {
    status = null;
    sumOfPoints = null;
    
    subjectName = $("div#sidebar h2 a[name*='-']", responseText).text();
    subjCont = $("div.overTable", responseText).html();
    
    if (subjCont != null) {
        // Get rid of unneccessary content
        subjCont = subjCont.replace(/(.*)<thead>.*<\/thead>(.*)/, "$1$2");
        subjCont = subjCont.replace(/(.*)<tr><td>login<\/td>.*<\/tr>(.*)/, "$1$2");

        inclusion = subjCont.replace(
            /.*<tr><td>zápočet<\/td><td[^>]*>([^<]*)<\/td><\/tr>.*/, "$1");
        if (inclusion == 'Z' || inclusion == 'ANO') {
            status = 'inclusion';
        }
        mark = subjCont.replace(
            /.*<tr><td>klasifikovaný zápočet<\/td><td[^>]*>([^<]*)<\/td><\/tr>.*/, "$1");
        if (mark == 'A' || mark == 'B' || mark == 'C' || mark == 'D' || mark == 'E') {
            status = 'succeed';
        } else if (mark == 'F') {
            status = 'failed';
        }

        // Get sum of all points
        var i = 0;
        var el;
        sumOfPoints = null;
        sumStrings = ['celkem', 'Celkem', 'suma', 'cvičení celkem', 'hodnoceni'];
        for (i = 0; i < sumStrings.length; i++) {
            el = $("td:contains('" + sumStrings[i] + "')", subjCont);
            if (el.length > 0) {
                sumOfPoints = el.next().text();
                break;
            }
        }
    }
    
    return {
        'subject': subjectName,
        'status': status,
        'points': sumOfPoints,
        'content': subjCont
    };
}

var subjects = [];
var statuses = [];
var points = [];
var subjectContents = [];

function downloadByLocalStorage(username, allSubjects, i) {
    xhrIn = new XMLHttpRequest();
    xhrIn.open("GET", "https://edux.fit.cvut.cz/courses/" +
        allSubjects[i] + '/classification/student/' +
        username + '/start', true);
    xhrIn.onreadystatechange = function() {
        if (xhrIn.readyState == 4) {
            result = parseSubjectData(xhrIn.responseText);
            if (result != null && $.inArray(result.subject, subjects) == -1) {
                subjects.push(result.subject);
                statuses.push(result.status);
                points.push(result.points);
                subjectContents.push(result.content);
            }

            percents = Math.floor((((i+1)/allSubjects.length)*100));
            setStatus('Stahuji data - ' + percents + '%', 'loading');
            i++;

            // Final phase
            if ((i) == allSubjects.length) {
                fillData(username, subjects, subjectContents, statuses, points);
                return null;
            }
            downloadByLocalStorage(username, allSubjects, i);
        }
    };
    xhrIn.send();

}

function downloadData(detect) {
    var username;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://edux.fit.cvut.cz/", true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if (xhr.responseText == '') {
                setStatus('Edux je nedostupn\u00FD' +
                    '(<a href="#" onClick="synchronizeData()">' +
                    'zkusit znova</a>)', 'error');
                return false;
            }
            
            if ($('input[value="Přihlásit se"]', xhr.responseText).length > 0) {
                setStatus('Nejste p\u0159ihl\u00E1\u0161en/a na <a href="' +
                    'https://edux.fit.cvut.cz/start?do=login" class="link">' +
                    'Eduxu</a>', 'error');
                browser.getLinksAlive();
                return false;
            }
            
            // Get logged user
            username = $("div.user", xhr.responseText).text()
                .replace(/.*\(([a-z0-9]*)\).*/, "$1");
            
            _gaq.push(['_trackEvent', username, 'request']);
            
            $("div#user").hide();
            $("div#user").text(username);
            $("div#user").fadeIn();

            setStatus('Stahuji data - 0%', 'loading');

            if (detect == false) {
                allSubjects = JSON.parse(localStorage.getItem('subjects'));
                downloadByLocalStorage(username, allSubjects, 0);
            } else {
                // Walk through ALL available subjects
                var i = 0;
                allSubjects = $("a[href^=/courses/]", xhr.responseText);
                allSubjects.each(function(index) {
                    var xhrIn = new XMLHttpRequest();
                    xhrIn.open("GET", "https://edux.fit.cvut.cz" +
                        $(this).attr('href') + '/classification/student/' +
                        username + '/start', true);
                    xhrIn.onreadystatechange = function() {
                        if (xhrIn.readyState == 4) {
                            result = parseSubjectData(xhrIn.responseText);
                            if (result.content != null &&
                                    $.inArray(result.subject, subjects) == -1) {
                                subjects.push(result.subject);
                                statuses.push(result.status);
                                points.push(result.points);
                                subjectContents.push(result.content);
                            }
                            i++;

                            percents = Math.floor(((i/allSubjects.length)*100));
                            setStatus('Stahuji data - ' + percents + '%', 'loading');
                            
                            // Final phase
                            if (i == allSubjects.length) {
                                fillData(username, subjects, subjectContents,
                                    statuses, points);
                                localStorage.setItem('subjects',
                                    JSON.stringify(subjects));
                            }
                        }
                    };
                    xhrIn.send();
                });
            }
        }
    }
    xhr.send();
}

function getSubjectNames () {
    var savedSubjects = JSON.parse(localStorage.getItem('subjects'));
    var i = 1;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://edux.fit.cvut.cz/", true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            allSubjects = $("a[href^=/courses/]", xhr.responseText);
            allSubjects.each(function(index) {
                if ($.inArray($(this).text(), savedSubjects) == -1) {
                    checked = '';
                } else {
                    checked = ' checked="checked"';
                }
                $("fieldset").append('<input type="checkbox"' + checked +
                    ' id="' + $(this).text() + '" /> <label for="' +
                    $(this).text() + '">' + $(this).text() + '</label><br />');
                if (index+1 == allSubjects.length) {
                    $("fieldset").append('<br /><button type="submit" ' +
                        'onclick="saveForm()">Ulo\u017Eit</button>');
                    setStatus('Sta\u017Eeno', 'ok');
                }
                i++;
            });
        }
    };
    xhr.send();
}

function saveForm() {
    setStatus('Ukládám...', 'loading');
    
    var checkedSubjects = [];
    $('input[type="checkbox"]:checked').each(function() {
        checkedSubjects.push($(this).attr("id"));
    });

    localStorage.setItem('subjects', JSON.stringify(checkedSubjects));

    setStatus('Ulo\u017Eeno', 'ok');
}

function synchronizeData() {
    browser = new chromeBrowser;
    browser.loginToKos();
    
    var savedSubjects = localStorage.getItem('subjects');
    
    if (savedSubjects == null) {
        downloadData(true);
    } else {
        downloadData(false);
    }
}

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-325731-18']);
_gaq.push(['_trackPageview']);

(function() {
    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
})();