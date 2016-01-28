/**
 *
 *
 *
 *
 **/



var friendServer,
	friendServerConnected = false,
	snacking = 0,
	played = 0,
	pname,
	puid,
	onlinePlayers = {},
	party = [];
jQuery(function() {
	if(getURLParameter('offline') !== "1" && dewRconConnected) {
		StartConnection();
	}
});

StartConnection = function() {
    friendServer = new friendServerHelper();
    friendServer.friendsServerSocket.onopen = function() {
		dewRcon.send('player.name', function(res) {
			dewRcon.send('player.printUID', function(ret) {
				pname = res;
				puid = ret.split(' ')[2];

				friendServer.send(JSON.stringify({
					type: "connection",
					message: " has connected.",
					guid: ret.split(' ')[2],
					player: res
				}));

				party.push(res + ":" + ret.split(' ')[2]);
				loadParty();
			});
		});
        $.snackbar({content:'Connected to Friend Server!'});
		$('#notification')[0].currentTime = 0;
		$('#notification')[0].play();
        friendServerConnected = true;
    };
    friendServer.friendsServerSocket.onerror = function() {
		if(!snacking) {
			$.snackbar({content:'Connection to Friend Server failed, retrying.'});
			if(!played) {
				$('#notification')[0].currentTime = 0;
				$('#notification')[0].play();
				played = 1;
			}
			snacking = 1;
			setTimeout(function() {
				snacking = 0;
			},9000);
		}
        friendServerConnected = false;
        if(!friendServerConnected) {
    		setTimeout(StartConnection, 1000);
		}
    };
    friendServer.friendsServerSocket.onmessage = function(message) {
		try {
			var result = JSON.parse(JSON.stringify(eval('(' + message.data + ')')));
			switch (result.type) {
				case "disconnected":
					if ($.inArray(result.player + ":" + result.guid, friends) != -1 || $.inArray(result.player, friends) != -1) {
						if (Chat.isOpen("Party Chat - " + result.player)) {
							$('.chat-window[data-player="' + "Party Chat - " + result.player + '"]').append("<span class='chat-message alert'>" + result.player + " has gone offline.</span>");
							if (party[0].split(':')[0] == result.player)
								$('.chat-window[data-player="' + "Party Chat - " + result.player + '"]').append("<span class='chat-message alert'>" + party[1].split(':')[0] + " is the new party leader.</span>");
							$('.chat-window[data-player="'+result.player+'"]').scrollTop($('.chat-window[data-player="'+result.player+'"]')[0].scrollHeight);
						}
						
						if(Chat.isOpen(result.player)) {
							$('.chat-window[data-player="'+result.player+'"]').append("<span class='chat-message alert'>" + result.player + " has gone offline.</span>");
							$('.chat-window[data-player="'+result.player+'"]').scrollTop($('.chat-window[data-player="'+result.player+'"]')[0].scrollHeight);
						}
					}

					if ($.inArray(result.player + ":" + result.guid, party) != -1) {

						party = $.grep(party, function(value) {
						  return value != (result.player + ":" + result.guid);
						});

						for (var i = 0; i < party.length; i++) {
							friendServer.send(JSON.stringify({
								type: "updateparty",
								party: JSON.stringify(party),
								guid: party[i].split(':')[1]
							}));

							if (party[i].split(':')[1] == puid || party[i].split(':')[1] == result.guid)
								continue;

							friendServer.send(JSON.stringify({
								type: "notification",
								message: result.player + " has left the party.",
								guid: party[i].split(':')[1]
							}));
						}

						$.snackbar({content: result.player + ' has left your party.'});
						$('#notification')[0].currentTime = 0;
						$('#notification')[0].play();

						loadParty();
					}
				break;
				case "pm":
					/*dewRcon.send('game.info', function(resp) {
						var res = new Array();
						resp = resp.split('\n');
						for (var i = 0; i < resp.length; i++) {
							res[resp[i].split(': ')[0].replaceAll(" ", "")] = resp[i].split(': ')[1];
						}
						if (typeof res.CurrentMap == 'undefined' || res.CurrentMap == "mainmenu")
							Chat.receiveMessage(result.player, result.player + ": " + result.message);
						else
							dewRcon.send('irc.chatmessage "<' + result.player + '> "' + result.message);
					});*/
					Chat.receiveMessage(result.player, result.player + ": " + result.message);
					console.log(result.player + ": " + result.message);
				break;
				case "partyinvite":
					dewAlert({
						title: "Party Invitation",
						content: result.player + " has invited you to a party",
						info: result.senderguid,
						cancel: true,
						cancelText: "Decline",
						callback: partyInvite
					});
				break;
				case "gameinvite":
					dewAlert({
						title: "Game Invitation",
						content: result.player + " has invited you join " + result.server,
						cancel: true,
						cancelText: "Decline",
						callback: gameInvite
					});
				break;
				case "acceptparty":
					$.snackbar({content: result.player + ' has joined your party.'});
					$('#notification')[0].currentTime = 0;
					$('#notification')[0].play();

					party.push(result.player + ":" + result.pguid);

					for (var i = 0; i < party.length; i++) {
						friendServer.send(JSON.stringify({
							type: "updateparty",
							party: JSON.stringify(party),
							guid: party[i].split(':')[1]
						}));

						if (party[i].split(':')[1] == result.pguid || party[i].split(':')[1] == puid)
							continue;

						friendServer.send(JSON.stringify({
							type: "notification",
							message: result.player + " has joined the party.",
							guid: party[i].split(':')[1]
						}));
					}

					loadParty();
				break;
				case "acceptgame":

				break;
				case "connect":
					jumpToServer(result.address);
					setTimeout(function() {
						startgame(result.address, 'JOIN GAME'.split(' '), result.password);
					}, 500);
				break;
				case "notification":
					$.snackbar({content: result.message});
					$('#notification')[0].currentTime = 0;
					$('#notification')[0].play();
				break;
				case "updateparty":
					party = JSON.parse(result.party);
					loadParty();
					if(!Chat.isOpen("Party Chat - " + party[0].split(':')[0]) && party.length > 1) {
						Chat.createTab("Party Chat - " + party[0].split(':')[0]);
						Chat.showBox();
					}
				break;
				case "updateplayers":
					onlinePlayers = JSON.parse(result.players);
					console.log(onlinePlayers);
					updateFriends();
					loadFriends();
				break;
				case "partymessage":
					var lead = party[0].split(':')[0];
					if(result.player == lead) {
						Chat.receiveMessage("Party Chat - " + lead, result.player + ": " + result.message,1);
					} else {
						Chat.receiveMessage("Party Chat - " + lead, result.player + ": " + result.message);
					}
				break;
				default:
					console.log("Unhandled packet: " + result.type);
				break;
			}
		} catch (e) {
			console.log(e);
			console.log(message.data);
		}

		if (typeof friendServer.callback == 'function')
			friendServer.callback(message.data);
        friendServer.lastMessage = message.data;
				//console.log(friendServer.lastMessage);
    };
}

function partyInvite(accepted, guid) {
	console.log(guid);
	if (accepted && party.length < 2) {
		friendServer.send(JSON.stringify({
			type: 'acceptparty',
			player: pname,
			guid: guid,
			pguid: puid
		}));
	} else {
		$.snackbar({content: "You are already in a party."});
		$('#notification')[0].currentTime = 0;
		$('#notification')[0].play();
	}
	console.log(accepted);
}

function gameInvite(accepted, guid) {
	if (accepted) {
		friendServer.send({
			type: 'acceptgame',
			player: pname,
			guid: puid
		});
	}
	console.log(accepted);
}

friendServerHelper = function() {
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    this.friendsServerSocket = new WebSocket('ws://192.99.124.166:55555', 'friendServer');
    this.lastMessage = "";
    this.lastCommand = "";
    this.open = false;
	this.callback = {};
    this.send = function(command, cb) {
		this.callback = cb;
        this.friendsServerSocket.send(command);
        this.lastCommand = command;
    }
}
