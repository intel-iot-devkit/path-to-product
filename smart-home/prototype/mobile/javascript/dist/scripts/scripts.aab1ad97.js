"use strict";
function videoEnded(a) {
    "/#/mobile" === location.href.split(location.host)[1] ? setTimeout(function() {
        $("#video-container").fadeOut(300),
        $("." + a + "-background").fadeIn(1e3),
        $(".middle").css("height", $("#the_garage_door .img-responsive").height())
    }, 1e3) : ($("#video-container").hide(),
    $("." + a + "-background").show())
}
function resizeVideo() {
    $("#video-container video").attr("style", "width: " + $(window).width() + "px !important;").apply
}
var J50Npi = {
    currentScript: null ,
    getJSON: function(a, b, c) {
        var d = a + (a.indexOf("?") + 1 ? "&" : "?")
          , e = document.getElementsByTagName("head")[0]
          , f = document.createElement("script")
          , g = []
          , h = "";
        this.success = c,
        b.callback = "J50Npi.success";
        for (h in b)
            g.push(h + "=" + encodeURIComponent(b[h]));
        d += g.join("&"),
        f.type = "text/javascript",
        f.src = d,
        this.currentScript && e.removeChild(currentScript),
        e.appendChild(f)
    },
    success: null 
}
  , app = angular.module("smartHomeApp", ["smartHomeApp.controllers", "smartHomeApp.filters", "smartHomeApp.directives", "smartHomeApp.services", "ngRoute", "ngAnimate", "ngResource", "ngSanitize"]);
app.config(["$routeProvider", function(a) {
    a.when("/admin", {
        controller: "AdminController",
        templateUrl: "views/admin.html"
    }).when("/mobile", {
        controller: "AdminController",
        templateUrl: "views/mobile.html"
    }).otherwise({
        redirectTo: "/"
    })
}
]);
var services = angular.module("smartHomeApp.services", []);
services.factory("poller", ["$http", "$timeout", "$filter", "$q", function(a, b, c, d) {
    function e(a, b, c) {
        a.sort(function(a, d) {
            var e = a[b].toString()
              , f = d[b].toString();
            return e === f ? 0 : Boolean(c) ? f > e ? 1 : -1 : e > f ? 1 : -1
        })
    }
    var f = {};
    return f.data = {
        response: {},
        calls: 0
    },
    f.init = function() {
        var a = "http://inteliotstorage.mybluemix.net/api/smarthome/deleteAll"
          , b = "";
        $.post(a, b, function(a) {
            console.log("Purge ", a)
        }, "json").fail(function(a, b, c) {
            console.log("FAIL: Purge", c)
        })
    }
    ,
    f.getData = function() {
        var c = d.defer();
        return a.get("http://inteliotstorage.mybluemix.net/api/smarthome").then(function(a) {
            f.data.response = a.data,
            f.data.calls++,
            e(f.data.response, "timestamp", !0),
            f.data.response_by_time = f.data.response;
            var c = []
              , d = {}
              , g = [];
            angular.forEach(f.data.response, function(a, b) {
                var d = a.name + ":" + a.status;
                g.indexOf(d) < 0 && (g.push(d),
                c.push(a))
            });
            var h = 0;
            angular.forEach(c, function(a, b) {
                "unblocked" !== a.status && (d[a.name + "_" + a.status] = h,
                h++)
            }),
            e(c, "name"),
            f.data.log_response = c,
            f.data.log_times = d,
            f.data.response = f.recentActions(f.data.response),
            b(f.getData, 2e3)
        }),
        c.promise
    }
    ,
    f.recentActions = function(a) {
        var b = {}
          , c = [];
        for (var d in a)
            "front_door" === a[d].name && "unlock" === a[d].status ? (a[d].name = "front_door_lock",
            a[d].status = "unlocked") : "front_door" === a[d].name && "lock" === a[d].status && (a[d].name = "front_door_lock",
            a[d].status = "locked"),
            "undefined" == typeof b[a[d].name] && c.push(a[d]),
            b[a[d].name] = 0;
        return c
    }
    ,
    "/#/admin" === location.href.split(location.host)[1] && f.init(),
    setTimeout(function() {
        f.getData()
    }, 1e3),
    {
        data: f.data
    }
}
]);
var ctrls = angular.module("smartHomeApp.controllers", ["smartHomeApp.services"]);
ctrls.controller("AdminController", ["$scope", "poller", "$http", "$timeout", function(a, b, c, d) {
    var serverDomainName = 'http://inteliotstorage.mybluemix.net/';
    var socketA = io.connect(serverDomainName, {reconnect: true});

	socketA.on("connect", function () {
	    console.log("Smart Home Apps Connected to Server");
	});

	socketA.on("disconnect", function () {
	    console.log("Smart Home Apps Disconnected from Server");
        if(serverDomainName == 'http://inteliotstorage.mybluemix.net/') {
            serverDomainName = 'http://localhost:3000';
            socketA = io.connect(serverDomainName, {reconnect: true});
        }
        else {
            serverDomainName = 'http://inteliotstorage.mybluemix.net/';
            socketA = io.connect(serverDomainName, {reconnect: true});
        }
	});


    function e(a, b, c) {
        a.sort(function(a, d) {
            var e = a[b].toString()
              , f = d[b].toString();
            return e === f ? 0 : Boolean(c) ? f > e ? 1 : -1 : e > f ? 1 : -1
        })
    }
    function f(a, b, c) {
        for (var d = 0; d < a.length; d++)
            if (a[d][b] === c)
                return !0;
        return !1
    }
    var g = {
        front_doorbell: {
            name: "front_doorbell",
            ring_again: {
                desc: "Doorbell Rang",
                descSm: "Rang",
                image: "images/door-bell-on2.8e3e2c4e.gif",
                color: "orange"
            },
            ring: {
                desc: "Doorbell Rang",
                descSm: "Rang",
                image: "images/door-bell-on.8e3e2c4e.gif",
                color: "orange"
            },
            sensor: {
                img: "images/Buzzer.eb89a001.png",
                name: "Buzzer"
            }
        },
        front_door: {
            name: "front_door",
            open: {
                desc: "Door Opened",
                descSm: "Open",
                image: "images/door-open.beca4b8e.gif",
                color: "green"
            },
            close: {
                desc: "Door Closed",
                descSm: "Closed",
                image: "images/door-closed.7cb6d4df.gif",
                color: "dark-orange"
            },
            sensor: {
                img: "images/Touch.5de92e0a.png",
                name: "Touch"
            }
        },
        front_door_lock: {
            name: "front_door_lock",
            locked: {
                desc: "Door Locked",
                descSm: "Locked",
                image: "images/door-lock-on.fdc49b61.gif",
                color: "dark-orange"
            },
            unlocked: {
                desc: "Door Unlocked",
                descSm: "Unlocked",
                image: "images/door-lock-off.809c4e08.gif",
                color: "green"
            },
            sensor: {
                img: "images/Rotary_Sensor.e3a3fe33.png",
                name: "Rotary Angle"
            }
        },
        garage_door: {
            name: "garage_door",
            open: {
                desc: "Garage Open",
                descSm: "Open",
                image: "images/Garage_Door_Open.50361006.gif",
                color: "orange"
            },
            close: {
                desc: "Garage Closed",
                descSm: "Closed",
                image: "images/Garage_Door_Close.3769ae56.gif",
                color: "dark-orange"
            },
            sensor: {
                img: "images/Motor.4e0d9c71.png",
                name: "Step Motor"
            }
        },
        garage_block: {
            name: "garage_block",
            unblocked: {
                desc: "Garage Unblocked",
                descSm: "Unblocked",
                image: "images/Garage_Door_Open.123aec11.jpg",
                color: "green"
            },
            blocked: {
                desc: "Garage Blocked",
                descSm: "Blocked",
                image: "images/Garage_Door_Blocked.5a7420b7.gif",
                color: "red"
            },
            sensor: {
                img: "images/Light_Sensor.d0a00828.png",
                name: "Light Sensor"
            }
        },
        mobile_garage_door: {
            name: "mobile_garage_door",
            open: {
                desc: "Garage Open",
                descSm: "Open",
                image: "images/Remote_window_open.ebf11cc3.gif",
                color: "Button Sensor"
            },
            close: {
                desc: "Garage Closed",
                descSm: "Closed",
                image: "images/Remote_window_closed.56008da5.gif",
                color: "Button Sensor"
            },
            blocked: {
                desc: "Garage Blocked",
                descSm: "Blocked",
                image: "images/Remote_window_blocked.b46f8f68.gif",
                color: "Button Sensor"
            }
        }
    };
    a.logObj = [],
    a.smartApps = g,
    a.data = b.data,
    a.eventLogs = [],
    a.cloudDataHold = [],
    a.sortColumn = "timestamp",
    a.quantity = 10,
    a.date = new Date,
    a.reverseSort = !0,
    a.showAboutModal = !1,
    a.showLogModal = !1,
    a.showSetupModal = !1,
    a.slideSensor = !1,
    a.animate = !0,
    a.front_door = "",
    a.garage_door = "",
    "/#/mobile" === location.href.split(location.host)[1] && (a.mobile_garage_door = '<img class="img-responsive" src="images/clear-mobile-middle.b10cf2b2.png">'),
    a.lastAction = "",
    a.lastAction2 = "",
    a.sensor_type_0 = "",
    a.sensor_type_1 = "",
    a.sensor_image_0 = "",
    a.sensor_image_1 = "",
    a.lastAction_0 = "",
    a.lastAction_1 = "",
    a.color_0 = "",
    a.color_1 = "",
    a.$watch(function() {
        return a.data.response
    }, function(c, d) {
        "undefined" != typeof c && (angular.equals(d, c) || a.appReact(b.data.response))
    }),
    a.buildLog = function() {
        angular.forEach(g, function(b, c) {
            "mobile_garage_door" !== c && angular.forEach(b, function(b, d) {
                if ("name" !== d && "sensor" !== d && "ring_again" !== d && "unblocked" !== d) {
                    var e = {};
                    e.name = c,
                    e.status = d,
                    a.logObj.push(e)
                }
            })
        }),
        e(a.logObj, "name")
    }
    ,
    a.buildLog(),
    a.modelReact = function(b, c) {
        var d = "mobile_garage_door";
        angular.forEach(a.data.response, function(d) {
            "garage_block" === d.name && "blocked" === d.status && (b = "blocked",
            c = 1,
            a.overlayNotification("Remove block to continue."))
        }),
        a.mobile_garage_door = '<img class="img-responsive" src="' + g[d][b].image + '" alt="' + g[d][b].desc + '"/>',
        1 !== c && (d = "garage_door",
        a.saveToJson(d))
    }
    ,
    a.appReact = function(b) {
        if (b[0]) {
            var c = 0;
            angular.forEach(b, function(a) {
                "garage_block" === a.name && "blocked" === a.status && (c = 1)
            }),
            "garage_door" === b[0].name && a.modelReact(b[0].status, 1);
            var d = {}
              , e = ["front_door", "front_door_lock"]
              , f = ["garage_door", "garage_block"]
              , h = ["front_doorbell"];
            this.updateStatusTab(b);
            var i = [];
            angular.forEach(a.data.response_by_time, function(b, j) {
                i.length < 2 && (i.push(b),
                e.indexOf(b.name) >= 0 && !d.door ? (d.door = b.name,
                a.the_front_door = '<img class="img-responsive" src="' + g[b.name][b.status].image + '" alt="' + g[b.name][b.status].desc + '"/>') : f.indexOf(b.name) >= 0 && !d.garage ? (d.garage = b.name,
                "close" === b.status && c ? a.the_garage_door = '<img class="img-responsive" src="' + g.garage_block.blocked.image + '" alt="' + g.garage_block.blocked.desc + '"/>' : a.the_garage_door = '<img class="img-responsive" src="' + g[b.name][b.status].image + '" alt="' + g[b.name][b.status].desc + '"/>') : h.indexOf(b.name) >= 0 && !d.bell && 0 === j && (d.bell = b.name,
                a.the_door_bell = '<img class="img-responsive" src="' + g[b.name][b.status].image + '" alt="' + g[b.name][b.status].desc + '"/>'))
            }),
            this.updateLastAction(i)
        }
    }
    ,
    a.updateLastAction = function(b) {
        b && (a.slideSensor = !0),
        b ? (a.cloudDataHold = b,
        a.slideSensor = !a.slideSensor,
        d(function() {
            $(".animate-last-action.slide-down").show(),
            angular.element("#animate-last-actions").triggerHandler("click")
        }, 500),
        a.lastAction_0 = "",
        a.lastAction_1 = "") : (b = a.cloudDataHold,
        angular.forEach(a.cloudDataHold, function(b, c) {
            g[b.name] && (a["lastAction_" + c] = g[b.name][b.status].desc,
            a["sensor_image_" + c] = g[b.name].sensor.img,
            a["sensor_type_" + c] = g[b.name].sensor.name,
            a["color_" + c] = g[b.name][b.status].color)
        }),
        a.slideSensor = !a.slideSensor)
    }
    ,
    a.updateStatusTab = function(b) {
        var c = "";
        for (var d in b)
            if (b.hasOwnProperty(d) && (c = b[d].name)) {
                a[c] = g[c][b[d].status].descSm;
                var e = b[d].timestamp.substr(b[d].timestamp.lastIndexOf("_") + 1);
                ":" === e.substring(0, 5).slice(-1) ? a[c + "_time"] = e.substring(0, 4) + " " + e.slice(-2) : a[c + "_time"] = e.substring(0, 5) + " " + e.slice(-2)
            }
    }
    ,
    a.saveToJson = function(b) {
        var c = {};
        c.name = b,
        c.timestamp = this.convertToISOString(this.getCurrentDatetime()),
        angular.forEach(a.data.response, function(a) {
            a.name === b && (c.status = a.status)
        }),
        "front_doorbell" === b ? "ring" === c.status ? c.status = "ring_again" : c.status = "ring" : "front_door" === b ? "open" === c.status ? c.status = "close" : c.status = "open" : "garage_door" === b ? "open" === c.status ? c.status = "close" : c.status = "open" : "front_door_lock" === b ? "locked" === c.status ? c.status = "unlocked" : c.status = "locked" : "garage_block" === b && ("blocked" === c.status ? c.status = "unblocked" : c.status = "blocked");
        var d = 1;
        if ("garage_block" !== b || f(a.data.response, "name", "garage_door") && f(a.data.response, "status", "open") ? "garage_door" === b && f(a.data.response, "name", "garage_block") && f(a.data.response, "status", "blocked") ? (d = 0,
        this.overlayNotification("There is a block in the garge door. Remove it to continue.")) : "front_door_lock" === b && f(a.data.response, "name", "front_door") && f(a.data.response, "status", "open") ? (d = 0,
        this.overlayNotification("The front door is locked. Unlock it first.")) : "front_door" === b && f(a.data.response, "name", "front_door_lock") && f(a.data.response, "status", "locked") && (d = 0,
        this.overlayNotification("The front door is locked. Unlock it first.")) : (d = 0,
        this.overlayNotification("The garage must be open to inject a block.")),
        d) {
        	if((c.name === "garage_door") && (c.status === "open" || c.status === "close")) {
        		if(c.status === "open") {
        			if(socketA) {
        				//Send a message to the server via Websockets to open Garage Door
        				console.log("Send a message to the server via Websockets to open Garage Door");
        				socketA.emit('request', { "request": "openGarageDoor" });
        			}
        		}
        		else if(c.status === "close") {
        			if(socketA) {
        				//Send a message to the server via Websockets to close Garage Door
        				console.log("//Send a message to the server via Websockets to close Garage Door");
        				socketA.emit('request', { "request": "closeGarageDoor" });
        			}
        		}
        	}
        	else {
            	var e = "http://inteliotstorage.mybluemix.net/api/smarthome";
            	$.post(e, c, function(a) {}, "json").fail(function(a) {})
        	}
        }
    }
    ,
    a.sortData = function(b) {
        a.reverseSort = a.sortColumn === b ? !a.reverseSort : !1,
        a.sortColumn = b
    }
    ,
    a.getSortClass = function(b) {
        return a.sortColumn === b ? a.reverseSort ? "arrow-down" : "arrow-up" : ""
    }
    ,
    a.toggleModal = function(b) {
        switch (b) {
        case "about":
            a.showAboutModal = !a.showAboutModal;
            break;
        case "log":
            a.showLogModal = !a.showLogModal;
            break;
        case "setup":
            a.showSetupModal = !a.showSetupModal
        }
    }
    ,
    a.convertToISOString = function(a) {
        var b = new Date(Date.parse(a))
          , c = b
          , d = c
          , e = d.getTime() / 1e3 / 60
          , f = (new Date).getTimezoneOffset()
          , g = e - f
          , h = new Date(1e3 * g * 60);
        return h = h.toISOString("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    }
    ,
    a.getCurrentDatetime = function() {
        var a = new Date
          , b = new Date(a.getUTCFullYear(),a.getUTCMonth(),a.getUTCDate(),a.getUTCHours(),a.getUTCMinutes(),a.getUTCSeconds());
        return b
    }
    ,
    a.fetchCloudData = function() {
        pollerService.getData().then(function(a) {})
    }
    ,
    a.overlayNotification = function(a) {
        var b = '<div id="overlay"><div id="confirmWrapper"><div class="confirmText">' + a + '</div><div class="confirmCancel">Continue</div><br class="clear"/></div>';
        $(b).appendTo("#content-container"),
        $(".confirmCancel").click(function() {
            $("#overlay").remove()
        }),
        $(document).keyup(function(a) {
            27 === a.which && $("#overlay").remove()
        })
    }
}
]);
var directives = angular.module("smartHomeApp.directives", []);
directives.directive("modal", function() {
    return {
        template: '<div class="modal fade"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button><h4 class="modal-title">{{ title }}</h4></div><div class="modal-body" ng-transclude></div></div></div></div>',
        restrict: "E",
        transclude: !0,
        replace: !0,
        scope: !0,
        link: function(a, b, c) {
            a.title = c.title,
            a.$watch(c.visible, function(a) {
                a === !0 ? $(b).modal("show") : $(b).modal("hide")
            }),
            a.dialogStyle = {},
            c.width && (a.dialogStyle.width = c.width),
            c.height && (a.dialogStyle.height = c.height),
            $(b).on("shown.bs.modal", function() {
                a.$apply(function() {
                    a.$parent[c.visible] = !0
                })
            }),
            $(b).on("hidden.bs.modal", function() {
                a.$apply(function() {
                    a.$parent[c.visible] = !1
                })
            })
        }
    }
});
var filters = angular.module("smartHomeApp.filters", []);
filters.filter("sampleDate", function(a) {
    return function(b, c) {
        return a("date")(Date.parse(b) || b, c)
    }
});
