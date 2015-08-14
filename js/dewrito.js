/*
    (c) 2015 Brayden Strasen & Ryan Palmer
    http://creativecommons.org/licenses/by-nc-sa/4.0/
*/
var players = [],
	masterServers = [],
	serverz = [],
	joined = 0,
	track = 5,
	scale = 1,
	anit = 400,
	currentGame = "HaloOnline",
	currentType = "Slayer",
	currentSetting = "menu",
	currentAlbum = isset(localStorage.getItem('album'), "halo3"),
	currentServer,
	selectedserver,
	loopPlayers,
	host = 1,
	forge = 0,
	servers,
	network = "offline",
	browsing = 0,
	sortMap,
	sortType,
	sortFull = false,
	sortLocked = false,
	Halo3Index = 7,
	currentVersion,
	usingGamepad = true,
	currentMenu = "main2",
	debug = false,
	songs,
	thisSong,
	nextSong,
	songIndex,
	localBackground = isset(localStorage.getItem('localbackground'), 0);

(function() {
	var e = (window.innerHeight - 80) / 2;
	var d = getURLParameter('debug');
	if (d !== undefined && d == "1") {
		console.log("debug yes");
	}
})();

function debugLog(val) {
	if (!debug) return;

	console.log(val);
}

var checked = 0;
var masters = 0;

function getMasterServers() {
	$.getJSON("https://raw.githubusercontent.com/ElDewrito/ElDorito/master/dewrito.json", function(data) {
		masters = data.masterServers.length;
		$.each(data.masterServers, function(key, val) {
			debugLog("Trying master server: " + val['list']);
			$.ajax({
				url: val['list'],
				dataType: 'json',
				jsonp: false,
				success: function(data) {
					if (data.result['msg'] == "OK") {
						debugLog("Master server " + val['list'] + " is online and OK");
						masterServers.push(val);
						checked++;
						if (checked == masters) {
							getServers(false);
							getTotalPlayers();
							totalPlayersLoop();
							getCurrentVersion();
						}
					}
				},
				error: function() {
					console.error("Issue connecting to master server: " + val['list']);
					checked++;
					if (checked == masters) {
						getServers(false);
						getTotalPlayers();
						totalPlayersLoop();
						getCurrentVersion();
					}
				}
			});
		});
	});
}

function getServers(browser) {
	if (usingGamepad) {
		gamepadDeselect();
	}
	servers = [];
	gp_servers = 0;
	gp_on = 0;
	for (var i = 0; i < serverz.servers.length; i++) {
		queryServer(serverz.servers[i], i, browser);
	}
}

var pings = [];

function queryServer(serverInfo, i, browser) {
	if (serverInfo.numPlayers > 16 || serverInfo.maxPlayers > 16) {
		return false;
	}
	var isPassworded = serverInfo.passworded !== undefined;
	if (serverInfo.map) {
		servers[i] = {
			"address": sanitizeString(serverInfo.address),
			"host": sanitizeString(serverInfo.hostPlayer),
			"name": sanitizeString(serverInfo.name),
			"variant": sanitizeString(serverInfo.variant),
			"variantType": sanitizeString(serverInfo.variantType),
			"map": sanitizeString(serverInfo.map),
			"mapFile": sanitizeString(serverInfo.mapFile),
			"status": sanitizeString(serverInfo.status),
			"eldewritoVersion": sanitizeString(serverInfo.eldewritoVersion),
			"ping": parseInt(serverInfo.ping),
			"location_flag": serverInfo.location_flag,
			"players": {
				"max": parseInt(serverInfo.maxPlayers),
				"current": parseInt(serverInfo.numPlayers)
			},
			"password": isPassworded
		};
	}
	addServer(i);
}

function getMapName(filename) {
	switch (filename) {
		case "guardian":
			return "Guardian";
		case "riverworld":
			return "Valhalla";
		case "s3d_avalanche":
			return "Diamondback";
		case "s3d_edge":
			return "Edge";
		case "s3d_reactor":
			return "Reactor";
		case "s3d_turf":
			return "Icebox";
		default:
			return "s3d_edge";
	}
}

function promptPassword(i) {
	var password = prompt(servers[i].name + " has a password, enter the password to join", "");
	if (password !== null) {
		// window.open("dorito:" + servers[i].address + "/" + password);
		dewRcon.send('connect ' + servers[i].address + ' ' + password);
	}
}

var gp_servers = 0;

function addServer(i) {
	++gp_servers;
	var on = (!servers[i].variant) ? "" : "on";

	servers[i].location_flag = typeof servers[i].location_flag == 'undefined' ? "[" : servers[i].location_flag;
	servers[i].ping = servers[i].ping || 0;

	$('#browser').append("<div data-gp='serverbrowser-" + gp_servers + "' class='server" + ((servers[i].password) ? " passworded" : "") + " ' id='server" + i + "' data-server=" + i + "><div class='thumb'><img src='img/maps/" + getMapName(servers[i].mapFile).toString().toUpperCase() + ".png'></div><div class='info'><span class='name'>" + ((servers[i].password) ? "[LOCKED] " : "") + servers[i].name + " (" + servers[i].host + ")  " + servers[i].location_flag + "<span id='ping-" + i + "'>"+servers[i].ping+"</span>ms]</span><span class='settings'>" + servers[i].variant + " " + on + " " + servers[i].map + " <span class='elversion'>" + servers[i].eldewritoVersion + "</span></span></div><div class='players'>" + servers[i].players.current + "/" + servers[i].players.max + "</div></div>");
	$('.server').hover(function() {
		$('#click')[0].currentTime = 0;
		$('#click')[0].play();
	});
	$('.server').unbind().click(function() {
		selectedserver = $(this).attr('data-server');
		changeMenu("serverbrowser-custom", selectedserver);
	});
	filterServers();
	if (usingGamepad && gp_servers == 1) {
		gamepadSelect('serverbrowser-1');
	}
	$('*[data-gp]').mouseenter(function() {
		var a = $(this).attr('data-gp').split("-"),
			b = parseInt(a[a.length-1]);
		gp_on = b;
		gamepadSelect(currentMenu + "-" + gp_on);
	});
	$('*[data-gp]').mouseout(function() {
		gp_on = 0;
		gamepadSelect(currentMenu + "-" + gp_on);
	});
}

var settingsToLoad = [['username', 'player.name'], ['servername', 'server.name'], ['centeredcrosshair', 'camera.crosshair'], ['fov', 'camera.fov'], ['starttimer', 'server.countdown'], ['maxplayers', 'server.maxplayers'], ['serverpass', 'server.password'], ['rawinput', 'input.rawinput'], ['saturation', 'graphics.saturation'], ['gameversion', 'game.version']];
var loadedSettings = false;

function loadSettings(i) {
	setTimeout(function() {
		for (var l = 0; l < settingsToLoad.length; l++) {
			if (Object.keys(settings)[i] == settingsToLoad[l][0]) {
				dewRcon.send(settingsToLoad[l][1]);
			}
			if (Object.keys(settings)[i + 1] == settingsToLoad[l][0]) {
				settings[Object.keys(settings)[i + 1]].current = (Object.keys(settings)[i + 1] == "serverpass" && (parseFloat(settings.saturation.current) == parseFloat(dewRcon.lastMessage))) ? "" : dewRcon.lastMessage;
				settings[Object.keys(settings)[i + 1]].update();
				console.log(Object.keys(settings)[i + 1] + ": " + settings[Object.keys(settings)[i + 1]].current);
				if (Object.keys(settings)[i + 1] == 'gameversion') {
						settings[Object.keys(settings)[i + 1]].set(dewRcon.lastMessage);
						$('#version').text("Eldewrito " + dewRcon.lastMessage);
				}
				if (Object.keys(settings)[i + 1] == 'username')
					loadedSettings = true;
			}
		}
		if (--i) {
			loadSettings(i);
		}
	}, 5);
}

function initialize() {
	getCurrentVersion();
	var set, b, g, i, e;
	if (window.location.protocol == "https:") {
		alert("The server browser doesn't work over HTTPS, switch to HTTP if possible.");
	}
	$.getJSON("music.json", function(j) {
		songs = j;
		for (i = 0; i < Object.keys(songs).length; i++) {
			b = Object.keys(songs)[i];
			$('#choosemusic').children('.music-select').append("<div data-gp='music-"+(i+1)+"' data-game='" + b + "' class='selection'><span class='label'>" + getGame(b).toUpperCase() + "</span></div>");
			$('#choosemusic').append("<div class='music-select2 animated' id='songs-" + b + "'></div>");
			for (e = 0; e < Object.keys(songs[b]).length; e++) {
				g = songs[b][e];
				$('#songs-' + b).append("<div data-gp='songs-"+b+"-"+(e+1)+"' data-song='" + g + "' class='selection'><span class='label'>" + g.toUpperCase() + "</span></div>");
			}
		}
		$('.music-select .selection').click(function() {
			changeSong1($(this).attr('data-game'));
		});
		$('.music-select2 .selection').click(function() {
			changeSong2($(this).attr('data-song'));
		});
		$('.music-select .selection').hover(function() {
			$('#click')[0].currentTime = 0;
			$('#click')[0].play();
		});
		$('.music-select2 .selection').hover(function() {
			$('#click')[0].currentTime = 0;
			$('#click')[0].play();
		});
		changeSong2(isset(localStorage.getItem('song'), "Mythic Menu Theme"));
	});
	for (i = 0; i < Object.keys(settings).length; i++) {
		set = Object.keys(settings)[i];
		var category = settings[set].category;
		if (settings[set].typeof == "select") {
			++catergories[category];
			$('#settings-' + category).append("<div data-gp='settings-" + category + "-" + catergories[category] + "' data-option='" + set + "' class='selection'><span class='label'>" + settings[set].name + "</span><span class='left'></span><span class='value'>...</span><span class='right'></span></div>");
		}
		if (settings[set].typeof == "input") {
			++catergories[category];
			$('#settings-' + category).append("<div data-gp='settings-" + category + "-" + catergories[category] + "' data-option='" + set + "' class='selection'><span class='label'>" + settings[set].name + "</span><span class='input'><input type='text' maxlength=40 /></span></div>");
		}
		if (settings[set].typeof == "color") {
			++catergories[category];
			$('#settings-' + category).append("<div data-gp='settings-" + category + "-" + catergories[category] + "' data-option='" + set + "' class='selection'><span class='label'>" + settings[set].name + "</span><span class='input'><input id='option-" + set + "'/></span></div>");
			$('#option-' + set).spectrum({
				color: settings[set].current,
				preferredFormat: "hex",
				showInput: true,
				showPalette: true,
				showSelectionPalette: false,
				palette: [
                    ["#fb8b9f", "#cf3e3e", "#e97339"],
                    ["#ffdb41", "#2f703d", "#375799"],
                    ["#41aaa9", "#d4d4d4", "#5a5a5a"]
                ],
				change: function(color) {
					changeSetting(set, color.toHexString());
					debugLog(color.toHexString());
				}
			});
		}
		settings[set].update();
	}
	loadSettings(Object.keys(settings).length);
	for (i = 0; i < Object.keys(maps).length; i++) {
		b = Object.keys(maps)[i];
		$('#choosemap').children('.map-select').append("<div data-game='" + b + "' class='selection'><span class='label'>" + maps[b].name + "</span></div>");
		$('#choosemap').append("<div class='map-select2 animated' id='maps-" + b + "'></div>");
		for (e = 1; e < Object.keys(maps[b]).length; e++) {
			g = Object.keys(maps[b])[e];
			$('#maps-' + b).append("<div data-map='" + g + "' class='selection'><span class='label'>" + g + "</span></div>");
		}
	}
	for (i = 0; i < Object.keys(gametypes).length; i++) {
		b = Object.keys(gametypes)[i];
		$('#choosetype').children('.type-select').append("<div data-maintype='" + b + "' class='selection'><span class='label'>" + b.toUpperCase() + "</span></div>");
		$('#choosetype').append("<div class='type-select2 animated' id='types-" + b.replace(/\s/g, "") + "'></div>");
		for (e = 0; e < Object.keys(gametypes[b]).length; e++) {
			g = Object.keys(gametypes[b])[e];
			$('#types-' + b.replace(/\s/g, "")).append("<div data-type='" + g + "' class='selection'><span class='label'>" + g.toUpperCase() + "</span></div>");
		}
	}
	settings.logo.current = 1;
	settings.logo.update();
}

function changeSetting(s, by) {
	$('#click')[0].currentTime = 0;
	$('#click')[0].play();
	var e = settings[s];
	if (e.name == "GAME VERSION") {
		e.update();
		return;
	}
	if (e.typeof == "select") {
		if (by == 1) {
			if (e.current < e.max) {
				e.current += e.increment;
			} else {
				e.current = e.min;
			}
		} else if (by == 0) {
			if (e.current > e.min) {
				e.current -= e.increment;
			} else {
				e.current = e.max;
			}
		}
	}
	if (e.typeof == "input" || e.typeof == "color") {
		e.current = by;
	}
	settings[s] = e;
	e.update();
	localStorage.setItem(s, e.current);
}

function toggleNetwork() {
	if (network == "offline") {
		//network = "online";
		//callbacks.networkType(1);
	} else {
		network = "offline";
		//callbacks.networkType(2);
	}
	$('#network').text(network.toUpperCase());
	$('#click')[0].currentTime = 0;
	$('#click')[0].play();
}

var friends = [], friends_online;

function jumpToServer(ip) {
		var d;
		for (var i = 0; i < serverz.servers.length; i++) {
			if (serverz.servers[i].address == ip)
				d = serverz.servers[i];
		}
		host = 0;
		browsing = 0;
		$('#lobby').empty();
		$('#lobby').append("<tr class='top'><td class='info' colspan='2'>Current Lobby <span id='joined'>1</span>/<span id='maxplayers'>0</span></td></tr>");
		if(d.numPlayers == d.maxPlayers) {
			$.snackbar({
				content: "Game is full. Unable to join."
			});
			$('#notification')[0].currentTime = 0;
			$('#notification')[0].play();
			return;
		}
		changeMap2(getMapName(d.mapFile));
		$('#subtitle').text(d.name + " : " + d.address);
		if (d.variant === "")
			d.variant = "Slayer";
		$('#gametype-display').text(d.variant.toUpperCase());
		if (d.variantType === "none")
			d.variantType = "Slayer";
		$('#gametype-icon').css('background', "url('img/gametypes/" + (d.variantType === "ctf" || d.variantType === "koth") ? d.variantType : d.variantType.toString().capitalizeFirstLetter + ".png') no-repeat 0 0/cover");
		$('#dewrito').css({
			"opacity": 0,
			"top": "920px"
		});
		$('.menu-container').css({
			"top": "720px"
		});
		$('#customgame').css({
			"top": "0px"
		});
		$('#friendslist').css('right','-250px');
		$('.options-section').hide();
		$('#options').fadeOut(anit);
		$('#friends-online').fadeIn(anit);
		$('#back').fadeIn(anit);
		$('#back').attr('data-action', 'custom-serverbrowser');
		$('#customgame').attr('data-from', 'serverbrowser');
		playersJoin(d.numPlayers, d.maxPlayers, 20, d.address);
		currentServer = d;
		lobbyLoop(d.address);
		loopPlayers = true;
		$('#start').children('.label').text("JOIN GAME");
		$('#title').text('CUSTOM GAME');
		$('#network-toggle').hide();
		$('#type-selection').show();
		currentMenu = "customgame";
		$('#slide')[0].currentTime = 0;
		$('#slide')[0].play();
}

function loadFriends() {
	$('#friends').empty();
	friends_online = 0;
	friends = JSON.parse(localStorage.getItem("friends"));
	if(!friends || friends.length < 1) {
		friends = [];
		localStorage.setItem("friends", JSON.stringify(friends));
		$('#friends-online').text("0 Friends Online");
		$('#friends').append("<div class='nofriends'>You have no friends :(<br/>Add some below</div>");
		return false;
	}
	friends.sort(function(a, b) {
			if (a.toLowerCase() < b.toLowerCase()) return -1;
			if (a.toLowerCase() > b.toLowerCase()) return 1;
			return 0;
	});
	friends.sort(function(a, b) {
			if (isOnline(a) > isOnline(b)) return -1;
			if (isOnline(a) < isOnline(b)) return 1;
			return 0;
	});
	for(var i=0; i < friends.length; i++) {
		var o = (isOnline(friends[i])) ? "online" : "offline";
		$('#friends').append("<div class='friend "+o+"'>"+friends[i]+"</div>");
		if(o == "online") {
			friends_online++;
		}
	}
	$('#friends-online').text(friends_online+" Friends Online");
	$('.friend,#friend-add,#friend-remove').hover(function() {
		$('#click')[0].currentTime = 0;
		$('#click')[0].play();
	});
	$('.friend.online').click(function() {
		jumpToServer(serverz.players[$(this).text()].address);
	});
}

function addFriend() {
	var name = $('#friend-input').val();
	if(name !== null || name !== "" || name !== undefined) {
		$('#friend-input').val("");
		if(friends.indexOf(name) == -1) {
			friends.push(name);
			friends.sort(function(a, b) {
					if (a.toLowerCase() < b.toLowerCase()) return -1;
					if (a.toLowerCase() > b.toLowerCase()) return 1;
					return 0;
			});
			friends.sort(function(a, b) {
					if (isOnline(a) > isOnline(b)) return -1;
					if (isOnline(a) < isOnline(b)) return 1;
					return 0;
			});
		}
		localStorage.setItem("friends", JSON.stringify(friends));
		loadFriends();
	}
}

function removeFriend() {
	var name = $('#friend-input').val();
	if(name !== null || name !== "" || name !== undefined) {
		$('#friend-input').val("");
		friends.remove(name);
		friends.sort(function(a, b) {
				if (a.toLowerCase() < b.toLowerCase()) return -1;
				if (a.toLowerCase() > b.toLowerCase()) return 1;
				return 0;
		});
		friends.sort(function(a, b) {
				if (isOnline(a) > isOnline(b)) return -1;
				if (isOnline(a) < isOnline(b)) return 1;
				return 0;
		});
		localStorage.setItem("friends", JSON.stringify(friends));
		loadFriends();
	}
}

function isOnline(friend) {
	return typeof serverz.players[friend] == 'undefined' ? 0 : 1; //Orion, check if friend is online or not here
}

var online = true;

$(document).ready(function() {
	Mousetrap.bind('a', function() {
		$("[data-gp='" + currentMenu + "-" + gp_on + "']").trigger('click');
	});
	Mousetrap.bind('b', function() {
		$("#back").trigger('click');
	});
	Mousetrap.bind('y', function() {
		if (currentMenu == "serverbrowser") {
			$('#refresh').trigger('click');
		}
	});
	Mousetrap.bind('up', function() {
		console.log("ARROW_UP");
		if ($("[data-gp='" + currentMenu + "-" + (gp_on - 1) + "']").length > 0) {
			gp_on -= 1;
		}
		gamepadSelect(currentMenu + "-" + gp_on);
		if (currentMenu == "serverbrowser") {
			$('#browser').scrollTo('.server.gp-on');
		}
		if (currentMenu.indexOf("songs-") > -1) {
			$('#'+currentMenu).scrollTo('.selection.gp-on');
		}
		$('#click')[0].currentTime = 0;
		$('#click')[0].play();
	});
	Mousetrap.bind('down', function() {
		console.log("ARROW_DOWN");
		if ($("[data-gp='" + currentMenu + "-" + (gp_on + 1) + "']").length > 0) {
			gp_on += 1;
		}
		gamepadSelect(currentMenu + "-" + gp_on);
		if (currentMenu == "serverbrowser") {
			$('#browser').scrollTo('.server.gp-on');
		}
		if (currentMenu.indexOf("songs-") > -1) {
			$('#'+currentMenu).scrollTo('.selection.gp-on');
		}
		$('#click')[0].currentTime = 0;
		$('#click')[0].play();
	});
	Mousetrap.bind('left', function() {
		gamepadLeft();
	});
	Mousetrap.bind('right', function() {
		gamepadRight();
	});
	$('#friend-add').click(function() {
		$('#slide')[0].currentTime = 0;
		$('#slide')[0].play();
		addFriend();
	});
	$('*[data-gp]').mouseenter(function() {
		if($(this).attr('data-setting')) {
			return false;
		}
		var a = $(this).attr('data-gp').split("-"),
			b = parseInt(a[a.length-1]);
		gp_on = b;
		gamepadSelect(currentMenu + "-" + gp_on);
	});
	$('*[data-gp]').mouseout(function() {
		gp_on = 0;
		gamepadSelect(currentMenu + "-" + gp_on);
	});
	$('#friend-remove').click(function() {
		$('#slide')[0].currentTime = 0;
		$('#slide')[0].play();
		removeFriend();
	});
	console.log(window.location.origin);
	if (window.location.origin.toLowerCase().indexOf("no1dead.github.io") >= 0) {
		changeMenu("main2-main");
		changeMenu("main-serverbrowser");
	} else if (window.location.origin.toLowerCase() == "file://") {
		online = navigator.onLine;
		console.log(online);
	}
	var CSSfile = getURLParameter('css');
	if (CSSfile) {
		$('#style').attr('href', 'css/' + CSSfile + '.css');
		menuConvert(CSSfile)
	}
	gamepadBind();
	Mousetrap.bind('f11', function() {
		setTimeout(function() {
			dewRcon.send('Game.SetMenuEnabled 0');
		}, anit);
	});
	initialize();
	$('#notification')[0].currentTime = 0;
	$('#notification')[0].play();
	//getMasterServers();
	//getTotalPlayers();
	totalPlayersLoop();
	$('#music')[0].addEventListener('ended', function() {
		if (settings.shufflemusic.current === 1) {
			changeSong2(nextSong);
		} else {
			changeSong2(thisSong);
		}
	});
	$('#browser-full').click(function() {
		if (sortFull) {
			sortFull = false;
			$(this).text('Showing Full');
		} else {
			sortFull = true;
			$(this).text('Hiding Full');
		}
		$('#refresh').trigger('click');
	});
	$('#friends-online').click(function() {
		$('#friendslist').css('right','0px');
		$('#friends-online').fadeOut(anit);
		$('#slide')[0].currentTime = 0;
		$('#slide')[0].play();
	});
	$('#friends-close').click(function() {
		$('#friendslist').css('right','-250px');
		$('#friends-online').fadeIn(anit);
		$('#slide')[0].currentTime = 0;
		$('#slide')[0].play();
	});
	$('#browser-locked').click(function() {
		if (sortLocked) {
			sortLocked = false;
			$(this).text('Showing Locked');
		} else {
			sortLocked = true;
			$(this).text('Hiding Locked');
		}
		$('#refresh').trigger('click');
	});
	$('#refresh').click(function() {
		loadServers();
		filterServers();
	});
	$('#direct-connect').click(function() {
		directConnect();
	});
	$('#clear').click(function() {
		clearFilters();
	});
	$('#network-toggle').click(function() {
		toggleNetwork();
	});
	$('#version').click(function() {
		clearAllCookies();
	});
	var e = ((window.innerHeight - $('#menu').height()) / 2) - 40;
	$('#connectgamepad')[0].volume = settings.musicvolume.current * 0.01;
	$('#music')[0].volume = settings.musicvolume.current * 0.01;
	$('#click')[0].volume = settings.sfxvolume.current * 0.01;
	$('#notification')[0].volume = settings.sfxvolume.current * 0.01;
	$('#start').click(function() {
		var mode = $('#start').children('.label').text().toString().split(" ");
		if (mode[1] === "FORGE" || (mode[0] === "START" && mode[1] === "GAME"))
			startgame("127.0.0.1:11775", mode);
		else
			startgame(currentServer.address, mode);
	});
	Mousetrap.bind('enter up up down down left right left right b a enter', function() {
		settings.background.current = 9001;
		settings.background.update();
	});
	$('.selection').hover(function() {
		$('#click')[0].currentTime = 0;
		$('#click')[0].play();
	});
	$('.map-select .selection').click(function() {
		changeMap1($(this).attr('data-game'));
	});
	$('.options-select .selection').click(function() {
		changeSettingsMenu($(this).attr('data-setting'));
	});
	$('.map-select2 .selection').click(function() {
		changeMap2($(this).attr('data-map'), true);
	});
	$('.map-select2 .selection').hover(function() {
		changeMap2($(this).attr('data-map'));
	});
	$('.type-select .selection').click(function() {
		changeType1($(this).attr('data-maintype'));
	});
	$('.type-select2 .selection').click(function() {
		changeType2($(this).attr('data-type'), true);
	});
	$('.type-select2 .selection').hover(function() {
		changeType2($(this).attr('data-type'));
	});
	$('.right').click(function() {
		var c = $(this).parent('.selection').attr('data-option');
		changeSetting(c, 1);
	});
	$('.left').click(function() {
		var c = $(this).parent('.selection').attr('data-option');
		changeSetting(c, 0);
	});
	$('.input input').focusout(function() {
		var c = $(this).parent('.input').parent('.selection').attr('data-option'),
			val = $(this).val();
		changeSetting(c, val);
	});
	$("[data-action='menu']").click(function() {
		changeMenu($(this).attr('data-menu'));
	});
	$('#back').click(function() {
		changeMenu($(this).attr('data-action'), 'back');
		if (usingGamepad) {
			gp_on = p_gp_on;
			gamepadSelect(currentMenu + "-" + p_gp_on);
		}
	});
	if (getURLParameter('browser')) {
		changeMenu("main2-main");
		changeMenu("main-serverbrowser");
		backButton = $('#back').detach();
	}
});
var backButton;
function loadServers() {
	if (browsing === 1) {
		pings = [];
		$('#refresh img').addClass('rotating');
		setTimeout(function() {
			$('#refresh img').removeClass('rotating');
		}, 4000);
		$('#browser').empty();
		getServers(true);
		$('.server').hover(function() {
			$('#click')[0].currentTime = 0;
			$('#click')[0].play();
		});
		$('.server').click(function() {
			changeMenu("serverbrowser-custom", $(this).attr('data-server'));
			selectedserver = $(this).attr('data-server');
		});
		filterServers();
	}
}

function lobbyLoop(ip) {
	var success = false;
	$.getJSON("http://" + ip, function(serverInfo) {
		success = true;
		console.log('loop');
		players = serverInfo.players;
		var teamGame = false;
		var colour = "#000000";
		if (typeof serverInfo.passworded == 'undefined') {
			for (var i = 0; i < players.length; i++) {
				if (typeof players[i] != 'undefined') {
					if (parseInt(players[i].team) > 1)
						teamGame = false;
					else
						teamGame = true;
				}
			}
		}

		if (serverInfo.variantType == "none")
				serverInfo.variantType = "Slayer";
		if (serverInfo.variant == "")
				serverInfo.variant = "Slayer";
		$('#gametype-display').text(serverInfo.variant.toUpperCase());
		$('#gametype-icon').css('background', "url('img/gametypes/" + (serverInfo.variantType === "ctf" || serverInfo.variantType === "koth") ? serverInfo.variantType : serverInfo.variantType.toString().capitalizeFirstLetter + ".png') no-repeat 0 0/cover");

		if (typeof serverInfo.passworded == 'undefined') {
			players.sort(function(a, b) {
				return a.team - b.team
			});
		}
		$('#lobby').empty();
		$('#lobby').append("<tr class='top' hex-colour='#000000' data-color='" + hexToRgb("#000000", 0.5) + "' style='background:" + hexToRgb("#000000", 0.5) + ";'><td class='info' colspan='2'>Current Lobby <span id='joined'>0</span>/<span id='maxplayers'>0</span></td></tr>");
		$('#maxplayers').text(serverInfo.maxPlayers);
		$('#joined').text(serverInfo.numPlayers);

		changeMap2(getMapName(serverInfo.mapFile));
		$('#subtitle').text(serverInfo.name + " : " + ip);

		if (typeof serverInfo.passworded == 'undefined') {
			for (var i = 0; i < players.length; i++) {
				if (typeof players[i] != 'undefined' && players[i].name != "") {
					if (teamGame)
						colour = (parseInt(players[i].team) === 0) ? "#c02020" : "#214EC0";
					$('#lobby').append("<tr id='player" + i + "' team='" + players[i].team + "' hex-colour= '" + colour + "' data-color='" + hexToRgb(colour, 0.5) + "' style='background:" + hexToRgb(colour, 0.5) + ";'><td class='name'>" + players[i].name + "</td><td class='rank'><img src='img/ranks/38.png'</td></tr>");
					$('#player' + i).css("display", "none");
					$('#player' + i).fadeIn(anit);
				}
			}
			$('#lobby tr').hover(function() {
				$('#click')[0].currentTime = 0;
				$('#click')[0].play();
			});
			$("#lobby tr").mouseover(function() {
				var n = $(this).attr('id'),
					col = $(this).attr('hex-colour'),
					bright = brighter(col);
				$(this).css("background-color", hexToRgb(bright, 0.75));
			}).mouseout(function() {
				var n = $(this).attr('id'),
					col = $(this).attr('hex-colour');
				$(this).css("background-color", hexToRgb(col, 0.5));
			});
			$('#lobby tr').click(function() {
				var e = $(this).children('.name').text(),
					n = $(this).attr('id'),
					nn = "user",
					col = $(this).attr('hex-colour'),
					bright = brighter(col);
				changeMenu("custom-player", e);
				$('#lobby tr').each(function() {
					var color = $(this).attr('data-color');
					$(this).css('background', color);
				});
				$(this).css("background-color", hexToRgb(bright, 0.75));
			});
		}
		if (loopPlayers)
			setTimeout(function() { lobbyLoop(ip); }, 3000);
	});

	setTimeout(function() {
		if (!success) {
			// Handle error accordingly
			console.log("Failed to contact server, retrying.");
			if (loopPlayers)
				setTimeout(function() { lobbyLoop(ip); }, 3000);
		}
	}, 5000);
}

function getTotalPlayers() {
	$.getJSON("http://192.99.124.166:8080/count", function(data) {
		$('#players-online').text(data.result);
	});
}

function directConnect() {
	var ip = prompt("Enter IP Address: ");
	//var pass = prompt("Enter Password: ");
	//connect function here
	jumpToServer(ip);
	//dewRcon.send('connect ' + ip + ' ' + pass);
}

function getCurrentVersion() {
	$.getJSON("http://eriq.co/eldewrito/update", function(data) {
		//currentVersion = data.version.toString();
		//$('#version').text('eldewrito ' + currentVersion);
	});
}

function totalPlayersLoop() {
	$.getJSON("http://192.99.124.166:8080/all", function(data) {
		serverz = data;
		for (var i = 0; i < serverz.servers.length; i++) {
			var startTime = Date.now(),
				endTime,
				ping;
				(function(i) {
					$.ajax({
						type: "GET",
						url: "http://" + serverz.servers[i].address + "/",
						async: true,
						success: function() {
							endTime = Date.now();
							ping = Math.round((endTime - startTime) / 1.60); //Aproximate ping, may change from 1.75 later
							serverz.servers[i].ping = ping;
							console.log(ping);
							//console.log(serverz.servers[i]);
						}
					});
				})(i);
		}
		$('#players-online').text(serverz.count);
		loadFriends();
	});
	/*$.getJSON("http://192.99.124.166:8080/count", function(data) {
		$('#players-online').text(data.result);
	});
	$.getJSON("http://192.99.124.166:8080", function(data) {
		serverz = data;
	});*/
	setTimeout(totalPlayersLoop, 10000);
}

function playersJoin(number, max, time, ip) {
	$.getJSON("http://" + ip, function(serverInfo) {
		debugLog(ip);
		players = serverInfo.players;
		var teamGame = false;
		var colour = "#000000";
		if (typeof serverInfo.passworded == 'undefined') {
			for (var i = 0; i < players.length; i++) {
				if (typeof players[i] != 'undefined') {
					if (parseInt(players[i].team) > 1)
						teamGame = false;
					else
						teamGame = true;
				}
			}
		}
		if (typeof serverInfo.passworded == 'undefined') {
			players.sort(function(a, b) {
				return a.team - b.team
			});
		}
		$('#lobby').empty();
		$('#lobby').append("<tr class='top' hex-colour='#000000' data-color='" + hexToRgb("#000000", 0.5) + "' style='background:" + hexToRgb("#000000", 0.5) + ";'><td class='info' colspan='2'>Current Lobby <span id='joined'>0</span>/<span id='maxplayers'>0</span></td></tr>");
		$('#maxplayers').text(serverInfo.maxPlayers);
		$('#joined').text(serverInfo.numPlayers);
		if (typeof serverInfo.passworded != 'undefined')
			return;
		for (var i = 0; i < players.length; i++) {
			if (typeof players[i] != 'undefined' && players[i].name != "") {
				if (teamGame)
					colour = (parseInt(players[i].team) === 0) ? "#c02020" : "#214EC0";
				$('#lobby').append("<tr id='player" + i + "' team='" + players[i].team + "' hex-colour= '" + colour + "' data-color='" + hexToRgb(colour, 0.5) + "' style='background:" + hexToRgb(colour, 0.5) + ";'><td class='name'>" + players[i].name + "</td><td class='rank'><img src='img/ranks/38.png'</td></tr>");
				$('#player' + i).css("display", "none");
				$('#player' + i).fadeIn(anit);
			}
		}
		$('#lobby tr').hover(function() {
			$('#click')[0].currentTime = 0;
			$('#click')[0].play();
		});
		$("#lobby tr").mouseover(function() {
			var n = $(this).attr('id'),
				col = $(this).attr('hex-colour'),
				bright = brighter(col);
			$(this).css("background-color", hexToRgb(bright, 0.75));
		}).mouseout(function() {
			var n = $(this).attr('id'),
				col = $(this).attr('hex-colour');
			$(this).css("background-color", hexToRgb(col, 0.5));
		});
		$('#lobby tr').click(function() {
			var e = $(this).children('.name').text(),
				n = $(this).attr('id'),
				nn = "user",
				col = $(this).attr('hex-colour'),
				bright = brighter(col);
			changeMenu("custom-player", e);
			$('#lobby tr').each(function() {
				var color = $(this).attr('data-color');
				$(this).css('background', color);
			});
			$(this).css("background-color", hexToRgb(bright, 0.75));
		});
	});
}

function changeMenu(menu, details) {
	var f, changes = menu.split("-"),
		f = changes[0],
		t = changes[1];
	console.log("From " + f + " to " + t);
	if (menu == "main-custom") {
		if (settings.background.current == Halo3Index) {
			$('#bg1').fadeOut(anit);
			$('#bg1')[0].pause();
			$('#bg-multiplayer').fadeIn(anit);
			$('#bg-multiplayer')[0].play();
		}
		if (settings.background.current === 0) {
			$('#bg1').fadeOut(anit);
			$('#bg1')[0].pause();
			$('#bg-custom_games').fadeIn(anit);
			$('#bg-custom_games')[0].play();
			$('#bg-cover').css('background', 'rgba(0,0,0,0)');
		}
		host = 1;
		forge = 0;
		$('#title').text('CUSTOM GAME');
		$('#subtitle').text('');
		$('#network-toggle').attr('data-gp', 'customgame-x').hide();
		$('#type-selection').attr('data-gp', 'customgame-1').show();
		currentType = "Slayer";
		if (currentType == "Ctf")
			currentType = "ctf";
		$('#gametype-icon').css({
			"background-image": "url('img/gametypes/" + currentType + ".png')"
		});
		$('#customgame').attr('data-from', 'main');
		$('#dewrito').css({
			"opacity": 0,
			"top": "920px"
		});
		$('#back').fadeIn(anit);
		$('#back').attr('data-action', 'custom-main');
		$('#customgame').css({
			"top": "0px"
		});
		$('#main3').css({
			"top": "-720px"
		});
		$('#lobby').empty();
		$('#lobby').append("<tr class='top'><td class='info' colspan='2'>Current Lobby <span id='joined'>1</span>/<span id='maxplayers'>16</span></td></tr>");
		$('#start').children('.label').text("START GAME");
		playersJoin(1, 2, 20, "127.0.0.1:11775");
		currentMenu = "customgame";
	}
	if (menu == "main-forge") {
		if (settings.background.current == Halo3Index) {
			$('#bg1').fadeOut(anit);
			$('#bg1')[0].pause();
			$('#bg-forge').fadeIn(anit);
			$('#bg-forge')[0].play();
		}
		if (settings.background.current === 0) {
			$('#bg1').fadeOut(anit);
			$('#bg1')[0].pause();
			$('#bg-forge').fadeIn(anit);
			$('#bg-forge')[0].play();
			$('#bg-cover').css('background', 'rgba(0,0,0,0)');
		}
		host = 1;
		forge = 1;
		$('#title').text('FORGE');
		$('#subtitle').text('');
		$('#network-toggle').attr('data-gp', 'customgame-1').show();
		$('#type-selection').attr('data-gp', 'customgame-x').hide();
		currentType = "Forge";
		$('#gametype-icon').css({
			"background-image": "url('img/gametypes/" + currentType + ".png')"
		});
		$('#customgame').attr('data-from', 'main');
		$('#dewrito').css({
			"opacity": 0,
			"top": "920px"
		});
		$('#back').fadeIn(anit);
		$('#back').attr('data-action', 'custom-main');
		$('#customgame').css({
			"top": "0px"
		});
		$('#main3').css({
			"top": "-720px"
		});
		$('#lobby').empty();
		$('#lobby').append("<tr class='top'><td class='info' colspan='2'>Current Lobby <span id='joined'>1</span>/<span id='maxplayers'>16</span></td></tr>");
		$('#start').children('.label').text("START FORGE");
		currentMenu = "customgame";
	}
	if (menu == "custom-main") {
		if (settings.background.current == Halo3Index) {
			$('#bg1').fadeIn(anit);
			$('#bg1')[0].play();
			$('#bg-forge').fadeOut(anit);
			$('#bg-forge')[0].pause();
			$('#bg-multiplayer').fadeOut(anit);
			$('#bg-multiplayer')[0].pause();
		}
		if (settings.background.current === 0) {
			$('#bg1').fadeIn(anit);
			$('#bg1')[0].play();
			$('#bg-forge').fadeOut(anit);
			$('#bg-forge')[0].pause();
			$('#bg-custom_games').fadeOut(anit);
			$('#bg-custom_games')[0].pause();
			$('#bg-cover').css('background', 'rgba(0,0,0,0.25)');
		}
		$('#dewrito').css({
			"opacity": 0.95,
			"top": "240px",
			"-webkit-transition-timing-function": "400ms",
			"-webkit-transition-delay": "0ms"
		});
		$('#customgame').css({
			"top": "-720px"
		});
		$('#main').css({
			"top": "0px"
		});
		$('#back').attr('data-action', 'main-main2');
		currentMenu = "main";
	}
	if (menu == "main-quickjoin") {
		var lowestPing = 5000;
		for (var i = 0; i < serverz.servers.length; i++) {
			if (typeof serverz.servers[i] != 'undefined') {
				if (serverz.servers[i].ping < lowestPing && (parseInt(serverz.servers[i].numPlayers) < parseInt(serverz.servers[i].maxPlayers)) && !serverz.servers[i].passworded) {
					lowestPing = parseInt(serverz.servers[i].ping);
					currentServer = serverz.servers[i];
				}
			}
			if (i == serverz.servers.length - 1) {
				jumpToServer(currentServer.address);
				setTimeout(function() {
					startgame(currentServer.address, 'JOIN GAME'.split(' '));
				}, 500);
			}
		}
	}
	if (menu == "serverbrowser-custom" && details) {
		if (getURLParameter('browser'))
			backButton.appendTo('body');
		host = 0;
		browsing = 0;
		$('#lobby').empty();
		$('#lobby').append("<tr class='top'><td class='info' colspan='2'>Current Lobby <span id='joined'>1</span>/<span id='maxplayers'>0</span></td></tr>");
		var d = servers[details];
		if (d.players.current != d.players.max) {
			changeMap2(getMapName(d.mapFile));
			$('#subtitle').text(d.name + " : " + d.address);
			if (d.variant === "") {
				d.variant = "Slayer";
			}
			$('#gametype-display').text(d.variant.toUpperCase());
			if (d.variantType === "none")
				d.variantType = "Slayer";
			$('#gametype-icon').css('background', "url('img/gametypes/" + (d.variantType === "ctf" || d.variantType === "koth") ? d.variantType : d.variantType.toString().capitalizeFirstLetter + ".png') no-repeat 0 0/cover");
			$('#serverbrowser').css({
				"top": "720px"
			});
			$('#customgame').css({
				"top": "0px"
			});
			$('#back').attr('data-action', 'custom-serverbrowser');
			$('#customgame').attr('data-from', 'serverbrowser');
			playersJoin(d.players.current, d.players.max, 20, d.address);
			currentServer = d;
			lobbyLoop(servers[selectedserver].address);
			loopPlayers = true;

		}
		$('#start').children('.label').text("JOIN GAME");
		$('#title').text('CUSTOM GAME');
		$('#network-toggle').hide();
		$('#type-selection').show();
		currentMenu = "customgame";
	}
	if (menu == "custom-serverbrowser") {
		browsing = 1;
		if (getURLParameter('browser'))
			backButton = $('#back').detach();
		if (settings.background.current == Halo3Index) {
			$('#bg1').fadeOut(anit);
			$('#bg1')[0].pause();
			$('#bg-multiplayer').fadeIn(anit);
			$('#bg-multiplayer')[0].play();
		}
		if (settings.background.current === 0) {
			$('#bg1').fadeOut(anit);
			$('#bg1')[0].pause();
			$('#bg-matchmaking').fadeIn(anit);
			$('#bg-matchmaking')[0].play();
		}
		$('#customgame').css({
			"top": "-720px"
		});
		$('#serverbrowser').css({
			"top": "0px"
		});
		$('#back').attr('data-action', 'serverbrowser-main');
		$('#browser').empty();
		setTimeout(loadServers, 1000);
		loopPlayers = false;
		currentMenu = "serverbrowser";
	}
	if (menu == "main-serverbrowser") {
		browsing = 1;
		if (settings.background.current == Halo3Index) {
			$('#bg1').fadeOut(anit);
			$('#bg1')[0].pause();
			$('#bg-multiplayer').fadeIn(anit);
			$('#bg-multiplayer')[0].play();
		}
		if (settings.background.current === 0) {
			$('#bg1').fadeOut(anit);
			$('#bg1')[0].pause();
			$('#bg-matchmaking').fadeIn(anit);
			$('#bg-matchmaking')[0].play();
		}
		$('#dewrito').css({
			"opacity": 0,
			"top": "920px"
		});
		$('#back').fadeIn(anit);
		$('#back').attr('data-action', 'serverbrowser-main');
		$('#serverbrowser').css({
			"top": "0px"
		});
		$('#main').css({
			"top": "720px"
		});
		$('#browser').empty();
		setTimeout(loadServers, 1000);
		loopPlayers = false;
		currentMenu = "serverbrowser";
	}
	if (menu == "serverbrowser-main") {
		browsing = 0;
		if (settings.background.current == Halo3Index) {
			$('#bg1').fadeIn(anit);
			$('#bg1')[0].play();
			$('#bg-multiplayer').fadeOut(anit);
			$('#bg-multiplayer')[0].pause();
		}
		if (settings.background.current === 0) {
			$('#bg1').fadeIn(anit);
			$('#bg1')[0].play();
			$('#bg-matchmaking').fadeOut(anit);
			$('#bg-matchmaking')[0].pause();
		}
		$('#dewrito').css({
			"opacity": 0.95,
			"top": "240px",
			"-webkit-transition-timing-function": "400ms",
			"-webkit-transition-delay": "0ms"
		});
		$('#serverbrowser').css({
			"top": "-720px"
		});
		$('#main').css({
			"top": "0px"
		});
		$('#back').attr('data-action', 'main-main2');
		currentMenu = "main";
	}
	if (menu == "main2-main") {
		$('#back').fadeIn(anit);
		$('#back').attr('data-action', 'main-main2');
		$('#main').css({
			"top": "0px"
		});
		$('#main2').css({
			"top": "720px"
		});
		currentMenu = "main";
	}
	if (menu == "main-main3") {
		$('#back').fadeIn(anit);
		$('#back').attr('data-action', 'main3-main');
		$('#main3').css({
			"top": "0px"
		});
		$('#main').css({
			"top": "720px"
		});
		currentMenu = "main3";
	}
	if (menu == "main3-main") {
		$('#back').fadeIn(anit);
		$('#back').attr('data-action', 'main-main2');
		$('#main3').css({
			"top": "-720px"
		});
		$('#main').css({
			"top": "0px"
		});
		currentMenu = "main3";
	}
	if (menu == "main2-credits") {
		if (settings.background.current === 0) {
			$('#bg1').fadeOut(anit);
			$('#bg1')[0].pause();
			$('#bg-firefight').fadeIn(anit);
			$('#bg-firefight')[0].play();
		}
		$('#back').fadeIn(anit);
		$('#back').attr('data-action', 'credits-main2');
		$('#credits').css({
			"top": "0px"
		});
		$('#main2').css({
			"top": "720px"
		});
		$('#dewrito').css({
			"top": "-30px",
			"left": "265px",
			"-webkit-transition-timing-function": "200ms",
			"-webkit-transition-delay": "0ms"
		});
		$('#dewrito').css({
			'background': "url('img/Halo 3 CE.png') no-repeat 0 0/cover"
		});
		currentMenu = "credits";
	}
	if (menu == "credits-main2") {
		if (settings.background.current === 0) {
			$('#bg1').fadeIn(anit);
			$('#bg1')[0].play();
			$('#bg-firefight').fadeOut(anit);
			$('#bg-firefight')[0].pause();
		}
		$('#back').fadeOut(anit);
		$('#credits').css({
			"top": "-720px"
		});
		$('#main2').css({
			"top": "0px"
		});
		$('#dewrito').css({
			"top": "240px",
			"left": "-10px",
			"-webkit-transition-timing-function": "200ms",
			"-webkit-transition-delay": "0ms"
		});
		$('#bg-cover').css({
			"background": "rgba(0,0,0,0.25)"
		});
		var c = settings.logo.current;
		$('#dewrito').css({
			'background': "url('img/" + settings.logo.labels[c] + ".png') no-repeat 0 0/cover"
		});
		currentMenu = "main2";
	}
	if (menu == "main-main2") {
		$('#back').fadeOut(anit);
		$('#main').css({
			"top": "-720px"
		});
		$('#main2').css({
			"top": "0px"
		});
		currentMenu = "main2";
	}
	if (menu == "custom-options") {
		if (host === 1) {
			$('#customgame-options').show();
			$('#back').attr('data-action', 'options-custom');
			$('#customgame').fadeOut(anit);
			$('#options').fadeIn(anit);
			$('#dewrito').css('top', '400px');
			$('#dewrito').css({
				"opacity": 0.9,
				"top": "400px",
				"-webkit-transition-timing-function": "200ms",
				"-webkit-transition-delay": "200ms"
			});
			currentMenu = "customgame-options";
		}
	}
	if (menu == "options-haloonline") {
		$('#back').attr('data-action', 'haloonline-options');
		$('#dewrito-options').hide();
		$('#haloonline').fadeIn(anit);
		currentMenu = "haloonline";
	}
	if (menu == "haloonline-options") {
		$('#back').attr('data-action', 'options-main');
		$('#haloonline').hide();
		$('#dewrito-options').fadeIn(anit);
		currentMenu = "dewrito-options";
	}
	if (menu == "options-music") {
		$('#back').attr('data-action', 'music-options');
		$('#dewrito-options').hide();
		$('#choosemusic').fadeIn(anit);
		currentMenu = "music";
	}
	if (menu == "music-options") {
		$('#back').attr('data-action', 'options-main');
		$('#choosemusic').hide();
		$('#dewrito-options').fadeIn(anit);
		currentMenu = "dewrito-options";
	}
	if (menu == "serverbrowser-type") {
		$('#choosetype').show();
		$('#back').attr('data-action', 'options-serverbrowser');
		$('#serverbrowser').fadeOut(anit);
		$('#options').fadeIn(anit);
		currentMenu = "choosetype";
	}
	if (menu == "serverbrowser-map") {
		$('#choosemap').show();
		$('#back').attr('data-action', 'options-serverbrowser');
		$('#serverbrowser').fadeOut(anit);
		$('#options').fadeIn(anit);
		currentMenu = "choosemap";
	}
	if (menu == "options-serverbrowser") {
		$('.options-section').hide();
		$('#back').attr('data-action', 'serverbrowser-main');
		$('#serverbrowser').fadeIn(anit);
		$('#options').fadeOut(anit);
		currentMenu = "serverbrowser";
	}
	if (menu == "custom-map") {
		if (host === 1) {
			$('#choosemap').show();
			$('#back').attr('data-action', 'options-custom');
			$('#customgame').fadeOut(anit);
			$('#options').fadeIn(anit);
			$('#dewrito').css('top', '400px');
			$('#dewrito').css({
				"opacity": 0.9,
				"top": "400px",
				"-webkit-transition-timing-function": "200ms",
				"-webkit-transition-delay": "200ms"
			});
			currentMenu = "choosemap";
		}
	}
	if (menu == "custom-type") {
		if (host === 1 && forge === 0) {
			$('#choosetype').show();
			$('#back').attr('data-action', 'options-custom');
			$('#customgame').fadeOut(anit);
			$('#options').fadeIn(anit);
			$('#dewrito').css('top', '400px');
			$('#dewrito').css({
				"opacity": 0.9,
				"top": "400px",
				"-webkit-transition-timing-function": "200ms",
				"-webkit-transition-delay": "200ms"
			});
			currentMenu = "choosetype";
		}
	}
	if (menu == "options-custom") {
		$('.options-section').hide();
		f = $('#customgame').attr('data-from');
		$('#back').attr('data-action', 'custom-' + f);
		$('#customgame').fadeIn(anit);
		$('#options').fadeOut(anit);
		$('#dewrito').css({
			"opacity": 0,
			"top": "920px",
			"-webkit-transition-timing-function": "200ms",
			"-webkit-transition-delay": "0ms"
		});
		currentMenu = "customgame";
	}
	if (menu == "main-options") {
		$('#dewrito-options').show();
		$('#back').fadeIn(anit);
		$('#back').attr('data-action', 'options-main');
		$('#main2').fadeOut(anit);
		$('#options').fadeIn(anit);
		$('#dewrito').css({
			"top": "400px"
		});
		currentMenu = "dewrito-options";
	}
	if (menu == "options-main") {
		$('.options-section').hide();
		$('#back').fadeOut(anit);
		$('#main2').fadeIn(anit);
		$('#options').fadeOut(anit);
		$('#dewrito').css({
			"top": "240px",
			"-webkit-transition-delay": "0ms",
			"transition-delay": "0ms",
			"-moz-transition-delay": "0ms"
		});
		currentMenu = "main2";
	}
	if (menu == "custom-player") {
		$('#customgame').css({
			"left": "-800px"
		});
		$('#playerinfo').css({
			"right": "100px"
		});
		$('#back').attr('data-action', 'player-custom');
		$('#playermodel').css('background-image', "url('img/players/" + details + ".png')");
		playerInfo(details);
		currentMenu = "playerinfo";
	}
	if (menu == "player-custom") {
		$('#customgame').css({
			"left": "0px"
		});
		$('#playerinfo').css({
			"right": "-700px"
		});
		f = $('#customgame').attr('data-from');
		$('#back').attr('data-action', 'custom-' + f);
		currentMenu = "customgame";
	}
	if (menu == "setting-settings") {
		changeSettingsBack();
	}
	$('#slide')[0].currentTime = 0;
	$('#slide')[0].play();
	if (usingGamepad && details != 'back') {
		p_gp_on = gp_on;
		gp_on = 1;
		gamepadSelect(currentMenu + "-" + gp_on);
	}
	debugLog(currentMenu);
}

var KDdata = [{
		value: 1,
		color: "#c02020",
		highlight: "#ed5c5c",
		label: "Deaths"
    }, {
		value: 1,
		color: "#214EC0",
		highlight: "#5575b7",
		label: "Kills"
    }],
	ctx = $("#player-kd-chart")[0].getContext("2d"),
	KDchart = new Chart(ctx).Doughnut(KDdata, {
		segmentShowStroke: false,
		percentageInnerCutout: 75,
		animationEasing: "easeInQuad"
	}),
	last_back = "",
	last_menu = "";

function playerInfo(name) {
	if (name != "user") {
		$.getJSON("http://" + servers[selectedserver].address, function(info) {
			for (var i = 0; i < info.players.length; i++) {
				if (info.players[i].name == name) {
					KDchart.segments[0].value = info.players[i].deaths > 0 ? info.players[i].deaths : 1;
					KDchart.segments[1].value = info.players[i].kills > 0 ? info.players[i].kills : 1;
					KDchart.update();
					var kdr = info.players[i].kills / info.players[i].deaths;

					if (!isFinite(kdr))
						kdr = info.players[i].kills;
					if (isNaN(kdr))
						kdr = 0;
					$('#player-kd-display').text(kdr.toFixed(2));
					$('#player-name').text(name);
					$('#player-level-display').text("Level 39");
					$('#player-rank-display').css('background', "url('img/ranks/39.png') no-repeat center center/72px 72px");
					$('#player-armor').css('background', "url('img/players/user.png') no-repeat 0 -50px/320px 704px");
					if (info.nameplate) {
						$('#player-title').css('background-image', "");
					} else {
						$('#player-title').css('background-image', "");
					}
				}
			}
		});
	} else {
		KDchart.segments[0].value = 1;
		KDchart.segments[1].value = 1;
		KDchart.update();
		$('#player-kd-display').text("0.00");
		$('#player-name').text(user.name);
		$('#player-level-display').text("Level " + user.rank);
		$('#player-rank-display').css('background', "url('img/ranks/" + user.rank + ".png') no-repeat center center/72px 72px");
		$('#player-armor').css('background', "url('img/players/user.png') no-repeat 0 -50px/320px 704px");
		$('#player-title').css('background-image', "");
	}
}

function startgame(ip, mode) {
	if (!dewRconConnected) {
		$.snackbar({
			content: 'You must be connected to the game to join or start a server.'
		});
		$('#notification')[0].currentTime = 0;
		$('#notification')[0].play();
		return;
	}
	/*if (currentServer.eldewritoVersion != settings.gameversion.current) {
		$.snackbar({
			content: 'You must have the same version as the server in order to join.'
		});
		$('#notification')[0].currentTime = 0;
		$('#notification')[0].play();
		return;
	}*/ // Orion please fix this when you get the chance
	loopPlayers = false;
	var password;
	if (mode[0] === "JOIN")
		password = currentServer.password == true ? prompt(currentServer.name + " has a password, enter the password to join", "") : "";
	$('#beep')[0].play();
	setTimeout(function() {
		$('#beep')[0].play();
	}, 1000);
	setTimeout(function() {
		$('#beep')[0].play();
	}, 2000);
	setTimeout(function() {
		$('#beeep')[0].play();
	}, 3000);
	$('#music')[0].pause();
	$('#black').fadeIn(3000);
	delay(function() {
		if (mode[0] === "JOIN") {
			//$('#hoImage').css('background-image','url(./img/' + settings.logo.labels[settings.logo.current] + '.png)');
			dewRcon.send('connect ' + ip + ' ' + password);
			if (currentServer.status != "InLobby") {
				console.log(currentServer);
				$('#loadingMapName').text(currentServer.map.toString().toUpperCase());
				$('#loadingMapImage').css('background-image', 'url(./img/loading/maps/' + getMapName(currentServer.mapFile.toString()).toLowerCase() + '.png)');
				$('#loadingGametypeImage').css('background-image', 'url(./img/gametypes/' + currentServer.variantType.toString().capitalizeFirstLetter() + '.png)');
				$('#mapOverlay').css('background-image', 'url(./img/loading/maps/' + currentServer.map.toString().toLowerCase() + '-overlay.png)');
				$('#loading').show();
				backButton = $('#back').detach();
			} else {
				dewRcon.send('Game.SetMenuEnabled 0');
			}
		} else if (mode[1] === "FORGE") {
			$('#loadingMapName').text(currentServer.map.toString().toUpperCase());
			$('#loadingMapImage').css('background-image', 'url(./img/loading/maps/' + currentServer.map.toString().toLowerCase() + '.png)');
			$('#loadingGametypeImage').css('background-image', 'url(./img/gametypes/' + currentServer.variantType.toString().capitalizeFirstLetter() + '.png)');
			$('#mapOverlay').css('background-image', 'url(./img/loading/maps/' + currentServer.map.toString().toLowerCase() + '-overlay.png)');
			$('#loading').show();
			$('#back').hide();
			dewRcon.send('game.forceload ' + getMapFile($('#currentmap').text().toString().toLowerCase()) + ' 5')
		} else if (mode[0] === "START" && mode[1] === "GAME") {
			dewRcon.send('start');
		}
	}, 3700);
}

var delay = (function() {
	var timer = 0;
	return function(callback, ms) {
		clearTimeout(timer);
		timer = setTimeout(callback, ms);
	};
})();

function filterServers() {
	$('.server').each(function() {
		$(this).hide();
		var content = $(this).text(),
			mapFilter = new RegExp(sortMap, "i"),
			typeFilter = new RegExp(sortType, "i"),
			isMap = content.match(mapFilter),
			isType = content.match(typeFilter),
			isFull,
			isLocked;
		if (sortFull) {
			var full = $(this).children('.players').text(),
				numbers = full.split("/");
			if (parseInt(numbers[0]) >= parseInt(numbers[1])) {
				isFull = true;
			} else {
				isFull = false;
			}
			console.log($(this).attr('id') + ": " + full);
		} else {
			isFull = false;
		}
		if (sortLocked) {
			if ($(this).hasClass('passworded')) {
				isLocked = true;
			} else {
				isLocked = false;
			}
		} else {
			isLocked = false;
		}
		if (isMap && isType && !isFull && !isLocked) {
			$(this).show();
		}
	});
}

function clearFilters() {
	sortMap = "";
	sortType = "";
	$('#browser-map').text("Choose Map");
	$('#browser-gametype').text("Choose Gametype");
	$('#clear').fadeOut(anit);
	loadServers();
	filterServers();
}

function changeSettingsMenu(setting) {
	x_axis_function = "settings";
	$('.options-select .selection').removeClass('selected');
	$("[data-setting='" + setting + "']").addClass('selected');
	$('#settings-' + currentSetting).hide().css({
		"left": "310px",
		"opacity": 0
	});
	$('#settings-' + setting).css('display', 'block');
	$('#settings-' + setting).animate({
		"left": "460px",
		"opacity": 1
	}, anit / 8);
	if ($('#back').attr('data-action') != "setting-settings") {
		last_back = $('#back').attr('data-action');
	}
	last_menu = currentMenu;
	currentSetting = setting;
	currentMenu = "settings-" + setting;
	if (usingGamepad) {
		p_gp_on = gp_on;
		gp_on = 1;
		gamepadSelect(currentMenu + "-" + gp_on);
	}
	$('#back').attr('data-action', 'setting-settings');
	debugLog(currentMenu);
	$('#slide')[0].currentTime = 0;
	$('#slide')[0].play();
}

function changeSettingsBack() {
	x_axis_function = "";
	$('.options-select .selection').removeClass('selected');
	$('#settings-' + currentSetting).hide().css({
		"left": "310px",
		"opacity": 0
	});
	currentSetting = "";
	currentMenu = last_menu;
	if (usingGamepad) {
		gp_on = 1;
		gamepadSelect(last_menu + "-" + gp_on);
	}
	$('#back').attr('data-action', last_back);
	debugLog(currentMenu);
	$('#slide')[0].currentTime = 0;
	$('#slide')[0].play();
}

function changeMap1(game) {
	$('.map-select .selection').removeClass('selected');
	$("[data-game='" + game + "']").addClass('selected');
	$('.map-select').css({
		"left": "100px"
	});
	$('#maps-' + currentGame).hide().css({
		"left": "310px",
		"opacity": 0
	});
	$('#maps-' + game).css('display', 'block');
	$('#maps-' + game).animate({
		"left": "360px",
		"opacity": 1
	}, anit / 8);
	currentGame = game;
	$('#slide')[0].currentTime = 0;
	$('#slide')[0].play();
}

function getGame(game) {
	switch (game) {
		case "haloce":
			return "Halo Combat Evolved";
		case "hcea":
			return "Halo Anniversary";
		case "halo2":
			return "Halo 2";
		case "h2a":
			return "Halo 2 Anniversary";
		case "halo3":
			return "Halo 3";
		case "odst":
			return "Halo 3 ODST";
		case "reach":
			return "Halo Reach";
		case "online":
			return "Halo Online";
		case "halo5":
			return "Halo 5";
	}
}

function getMapFile(name) {
	if (typeof name != 'undefined') {
		switch (name.toString().toLowerCase()) {
			case "guardian":
				return "guardian";
			case "valhalla":
				return "riverworld";
			case "diamondback":
				return "s3d_avalanche";
			case "edge":
				return "s3d_edge";
			case "reactor":
				return "s3d_reactor";
			case "icebox":
				return "s3d_turf";
		}
		return "";
	}
}

function changeMap2(map, click) {
	$('#map-thumb').css({
		"background-image": "url('img/maps/" + map.toString().toUpperCase() + ".png')"
	});
	$('#map-thumb-options').css({
		"background-image": "url('img/maps/" + map.toString().toUpperCase() + ".png')"
	});
	$('#currentmap').text(map);
	$('#map-name-options').text(map);
	$('#map-info-options').text(maps[currentGame][map]);
	$('.map-select2 .selection').removeClass('selected');
	$("[data-map='" + map + "']").addClass('selected');
	if ($('#start').children('.label').text() != "JOIN GAME" && dewRconConnected)
		dewRcon.send('map ' + getMapFile($('#currentmap').text()));
	if (browsing === 1 && click === true) {
		$('#browser-map').text(map.toTitleCase());
		changeMenu("options-serverbrowser");
		sortMap = map;
		$('#clear').show();
		filterServers();
	} else if (click === true) {
		changeMenu("options-custom");
	}
}

function getMapId(map) {
	switch (map.toString().toLowerCase()) {
		case "diamondback":
			return 0;
		case "edge":
			return 1;
		case "icebox":
			return 3;
		case "reactor":
			return 4;
		case "valhalla":
			return 5;
	}
}

function changeType1(maintype) {
	$('.type-select .selection').removeClass('selected');
	$("[data-maintype='" + maintype + "']").addClass('selected');
	$('.type-select').css({
		"left": "100px"
	});
	$('#types-' + currentType.replace(/\s/g, "")).hide().css({
		"left": "310px",
		"opacity": 0
	});
	$('#types-' + maintype.replace(/\s/g, "")).css('display', 'block');
	$('#types-' + maintype.replace(/\s/g, "")).animate({
		"left": "360px",
		"opacity": 1
	}, anit / 8);
	currentType = maintype;
	$('#slide')[0].currentTime = 0;
	$('#slide')[0].play();
}

function changeSong1(game) {
	console.log(game);
	if (!online)
		return;
	$('.music-select .selection').removeClass('selected');
	$("[data-game='" + game + "']").addClass('selected');
	$('.music-select').css({
		"left": "100px"
	});
	$('#songs-' + currentAlbum.replace(/\s/g, "")).hide().css({
		"left": "310px",
		"opacity": 0
	});
	$('#songs-' + game.replace(/\s/g, "")).css('display', 'block');
	$('#songs-' + game.replace(/\s/g, "")).animate({
		"left": "360px",
		"opacity": 1
	}, anit / 8);
	$('#music-album-cover').css({
		"background-image": "url('img/album/" + game + ".jpg')"
	});
	currentAlbum = game;
	if ($('#back').attr('data-action') != "setting-settings") {
		last_back = $('#back').attr('data-action');
	}
	last_menu = currentMenu;
	currentMenu = "songs-" + currentAlbum;
	if (usingGamepad) {
		p_gp_on = gp_on;
		gp_on = 1;
		gamepadSelect(currentMenu + "-" + gp_on);
	}
	$('#back').attr('data-action', 'setting-settings');
	$('#slide')[0].currentTime = 0;
	$('#slide')[0].play();
}

function changeSong2(song) {
	if (!online) {
		return;
	}
	songIndex = songs[currentAlbum].indexOf(song);
	thisSong = songs[currentAlbum][songIndex];
	nextSong = songs[currentAlbum][songIndex + 1];
	if (songIndex + 1 >= songs[currentAlbum].length) {
		nextSong = songs[currentAlbum][0];
	}
	$('.music-select2 .selection').removeClass('selected');
	$("[data-song='" + song + "']").addClass('selected');
	$('#music').attr('src', 'http://eriq.co/eldewrito/music/' + currentAlbum + "/" + song + '.ogg');
	localStorage.setItem('song', song);
	localStorage.setItem('album', currentAlbum);
	$.snackbar({
		content: 'Now playing ' + song + ' from ' + getGame(currentAlbum) + '.'
	});
	$('#notification')[0].currentTime = 0;
	$('#notification')[0].play();
}

function changeType2(type, click) {
	if (currentType.contains(" ")) {
		var reg = currentType.match(/\b(\w)/g);
		var acronym = reg.join('');
		$('#gametype-icon').css({
			"background-image": "url('img/gametypes/" + acronym.toString().toLowerCase() + ".png')"
		});
		$('#type-icon-options').css({
			"background-image": "url('img/gametypes/" + acronym.toString().toLowerCase() + ".png')"
		});
	} else {
		$('#gametype-icon').css({
			"background-image": "url('img/gametypes/" + (currentType === "ctf" || currentType === "koth") ? currentType : currentType.toString().capitalizeFirstLetter + ".png')"
		});
		$('#type-icon-options').css({
			"background-image": "url('img/gametypes/" + (currentType === "ctf" || currentType === "koth") ? currentType : currentType.toString().capitalizeFirstLetter + ".png')"
		});
	}
	debugLog(type);
	if (dewRconConnected) {
		dewRcon.send('gametype ' + type.toString().toLowerCase().replace(" ", "_"));
	}
	if (type == "")
		type = "Slayer";
	$('#gametype-display').text(type.toUpperCase());
	$('#type-name-options').text(type.toUpperCase());
	$('#type-info-options').text(gametypes[currentType][type]);
	$('.type-select2 .selection').removeClass('selected');
	$("[data-type='" + type + "']").addClass('selected');
	if (browsing === 1 && click === true) {
		$('#browser-gametype').text(type.toTitleCase());
		changeMenu("options-serverbrowser");
		sortType = type;
		$('#clear').show();
		filterServers();
	} else if (click === true) {
		changeMenu("options-custom");
	}
}

function popup(message) {
	$('#popup').text(message);
	$('#popup').fadeIn(anit);
	setTimeout(function() {
		$('#popup').fadeOut(anit);
	}, 8000);
}
