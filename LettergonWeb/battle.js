var g = document.getElementById("g");
var ga = document.getElementById("ga");
var im = document.getElementById("im");
var pl = document.getElementById("pl");
var lb = document.getElementById("lb");
var m = document.getElementById("m");
var rn = document.getElementById("rn");
var pn = document.getElementById("pn");
var jg = document.getElementById("jg");
var ig = document.getElementById("ig");
var rl = document.getElementById("rl");

var foundWords = [];
var knownWords = {};
var minWordLength;
var playersInfo = {};
var myWordsFound = 0;
var currentRoomName;
var myPlayerName;
var gridColumns = 4;
var ws;

function clearState() {
    letters = [];
    foundWords = [];
    knownWords = {};
    minWordLength = undefined;
    playersInfo = {};
    myWordsFound = 0;
    var newPlayersBody = document.createElement("tbody");
    lb.parentNode.replaceChild(newPlayersBody, lb);
    lb = newPlayersBody;

    var newBody = document.createElement("tbody");
    g.parentNode.replaceChild(newBody, g);
    g = newBody;

    d.innerText = r.innerText = m.innerText = "";

    reset();
}

function initPlayers(players) {
    playersInfo = {};
    var newPlayersBody = document.createElement("tbody");
    for (var i = 0; i < players.length; i++) {
        addPlayer(newPlayersBody, players[i]);
    }

    lb.parentNode.replaceChild(newPlayersBody, lb);
    lb = newPlayersBody;
}

function configureGame(gameState) {
    var puzzle = gameState.puzzle;
    var found = gameState.found;
    letters = [];
    letters.push(puzzle.Letters[puzzle.KeyLetterIndex]);
    for (var i = 0; i < puzzle.Letters.length; i++) {
        if (i === puzzle.KeyLetterIndex) continue;
        letters.push(puzzle.Letters[i]);
    }

    minWordLength = puzzle.MinWordLength;

    foundWords = [];
    knownWords = {};
    myWordsFound = 0;
    var newBody = document.createElement("tbody");
    var cellCount = 0;
    var newRow;

    wordsRemaining = totalWords = found.length;

    for (var i = 0; i < found.length; i++) {
        if (cellCount++ === 0) {
            newRow = newBody.insertRow();
        }
        else if (cellCount === gridColumns) {
            cellCount = 0;
        }

        var cell = newRow.insertCell();

        var foundInfo = found[i];
        var finder = undefined;
        var wordInfo = { cell: cell };
        foundWords[i] = wordInfo;
        if (foundInfo.hasOwnProperty("w")) {
            var word = foundInfo.w;
            knownWords[word] = wordInfo;
            cell.innerText = word.length === letters.length ? word.toUpperCase() : word;
            finder = foundInfo.p;

            if (finder === "") {
                cell.className = "not-found";
                continue;
            }

            wordsRemaining--;
            var playerInfo = playersInfo.hasOwnProperty(finder) ? playersInfo[finder] : addPlayer(lb, finder);
            incrementPlayerScore(playerInfo);

            if (finder === myPlayerName) {
                myWordsFound++;
                cell.className = "mine";
            }
        }

        wordInfo.finder = finder;
    }

    g.parentNode.replaceChild(newBody, g);
    g = newBody;

    reset();
    updateMyWordCount();
    sortPlayers();
    w.placeholder = "min. " + minWordLength + " letters";
    im.className = "hidden";
    ga.className = "";
    if (gameState.hasOwnProperty("end")) {
        startTime = gameState.start;
        updateTimer(gameState.end);
    } else {
        startTimer(gameState.start);
    }

    w.focus();
}

function addPlayer(tableBody, playerName) {
    var playerRow = tableBody.insertRow();
    var playerNameCell = playerRow.insertCell();
    var playerScoreCell = playerRow.insertCell();
    if (playerName === myPlayerName) {
        playerRow.className = "me";
    }
    playerNameCell.innerText = playerName;
    playerScoreCell.innerText = "0";
    var playerInfo = { score: 0, row: playerRow, scoreCell: playerScoreCell };
    return playersInfo[playerName] = playerInfo;
}

function incrementPlayerScore(playerInfo) {
    playerInfo.scoreCell.innerText = ++playerInfo.score;
}

function playerJoin(playerName) {
    addPlayer(lb, playerName);
}

function sortPlayers() {
    var playerNames = Object.keys(playersInfo);
    playerNames.sort(function (x, y) {
        var xScore = playersInfo[x].score;
        var yScore = playersInfo[y].score;
        if (xScore < yScore) return 1;
        if (xScore > yScore) return -1;
        if (x < y) return -1;
        if (x > y) return 1;
        return 0;
    });

    for (var i = 0; i < lb.childNodes.length; i++) {
        var row = lb.childNodes[i];
        var expectedRow = playersInfo[playerNames[i]].row;
        if (row === expectedRow) continue;
        lb.removeChild(expectedRow);
        lb.insertBefore(expectedRow, row);
    }
}

function updateMyWordCount() {
    m.innerText = "(Your score: " + myWordsFound + ")";
}

function checkWord(word) {
    word = word.toLowerCase();
    if (ws !== undefined && word.length >= minWordLength && !knownWords.hasOwnProperty(word)) {
        var message = { type: "check", word: word };
        ws.send(JSON.stringify(message));
    }
    reset();
}

function requestSolution() {
    if (ws !== undefined) {
        var message = { type: "end" };
        ws.send(JSON.stringify(message));
    }
}

function showSolution(solution) {
    stopTimer(solution.end);
    var found = solution.found;

    for (var i = 0; i < found.length; i++) {
        var foundInfo = found[i];
        var word = foundInfo.w;
        var finder = foundInfo.p;
        var wordInfo = foundWords[i];
        wordInfo.finder = finder;
        knownWords[word] = wordInfo;
        var cell = wordInfo.cell;
        cell.innerText = word.length === letters.length ? word.toUpperCase() : word;
        cell.className = finder === "" ? "not-found" : finder === myPlayerName ? "mine" : "";
    }
}

function requestNewGame() {
    if (ws !== undefined) {
        var message = { type: "new" };
        ws.send(JSON.stringify(message));
    }
}

function join() {
    var roomName = rn.value.trim();
    var playerName = pn.value.trim();
    var errors = false;
    if (roomName.length === 0) {
        rn.className = "error";
        errors = true;
    } else {
        rn.className = "";
    }

    if (playerName.length === 0) {
        pn.className = "error";
        errors = true;
    } else {
        pn.className = "";
    }

    if (errors) return;

    clearState();
    jg.className = "hidden";
    ig.className = "";
    im.innerText = "Joining game...";
    im.className = "";

    var roomNameHash = "#" + encodeURIComponent(roomName);
    var location = window.location;
    rl.value = location.origin + location.pathname + roomNameHash;
    history.replaceState(null, null, roomNameHash);

    var wsprotocol = window.location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(wsprotocol + "://" + window.location.host + "/api/battle/join/" + encodeURIComponent(roomName) + "/" + encodeURIComponent(playerName));
    ws.onerror = function (e) {
        leave();
    }
    ws.onclose = function (e) {
        leave();
        switch (e.code) {
            case 4000:
                alert("A player with the same name is already in this room");
                break;
            case 4001:
                alert("Room full");
                break;
        }
    }
    ws.onopen = function (e) {
        currentRoomName = roomName;
        myPlayerName = playerName;
        pl.className = "";
        im.innerHTML = "Press 'New game' to start";
    }
    ws.onmessage = handleMessage;
}

function copyRoomLink() {
    rl.select();
    rl.setSelectionRange(0, rl.value.length);
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
}

function handleMessage(e) {
    var message = JSON.parse(e.data);
    var data = message.data;
    switch (message.type) {
        case "init":
            initPlayers(data.players);
            if (data.hasOwnProperty("state")) {
                configureGame(data.state);
            }
            break;
        case "join":
            var joiningPlayerName = data.name;
            if (playersInfo.hasOwnProperty(joiningPlayerName)) {
                playersInfo[joiningPlayerName].row.className = "";
            } else {
                addPlayer(lb, joiningPlayerName);
            }
            break;
        case "leave":
            var leavingPlayerName = data.name;
            if (!playersInfo.hasOwnProperty(leavingPlayerName)) break;
            var leavingPlayerInfo = playersInfo[leavingPlayerName];
            if (leavingPlayerInfo.score === 0) {
                leavingPlayerInfo.row.parentElement.removeChild(leavingPlayerInfo.row);
                delete playersInfo[leavingPlayerName];
            } else {
                leavingPlayerInfo.row.className = "left";
            }
            break;
        case "found":
            found(data);
            break;
        case "end":
            showSolution(data);
            break;
    }
}

function found(data) {
    var word = data.word;
    var index = data.index;
    var finder = data.finder;
    var wordInfo = foundWords[index];
    knownWords[word] = wordInfo;
    var cell = wordInfo.cell;
    cell.innerText = word.length === letters.length ? word.toUpperCase() : word;
    if (finder === myPlayerName) {
        myWordsFound++;
        cell.className = "mine";
    }
    wordInfo.finder = finder;
    --wordsRemaining;
    updateRemaining();
    updateMyWordCount();

    var playerInfo = playersInfo.hasOwnProperty(finder) ? playersInfo[finder] : addPlayer(lb, finder);
    incrementPlayerScore(playerInfo);
    sortPlayers();

    if (data.hasOwnProperty("end")) {
        stopTimer(data.end);
        alert("All words found!");
    }
}

function leave() {
    if (ws === undefined) return;
    ws.close();
    ws = undefined;
    stopTimer();
    d.innerText = "";
    currentRoomName = undefined;
    myPlayerName = undefined;
    ig.className = ga.className = pl.className = "hidden";
    jg.className = "";
    im.innerText = "Ready to join";
    im.className = "";
}

function handleHashChange() {
    var hash = window.location.hash;
    if (!hash.startsWith("#")) return;
    var roomName = hash.substring(1).trim();
    if (roomName === currentRoomName) return;
    leave();
    rn.value = roomName;
    pn.focus();
}

var pixelRatio = window.devicePixelRatio || 1;
c.width = 300 * pixelRatio;
c.height = 300 * pixelRatio;
ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

c.onclick = handleClick;
w.onkeypress = handleKeyPress;
w.oninput = handleInput;
window.onhashchange = handleHashChange;

rn.focus();
handleHashChange();
