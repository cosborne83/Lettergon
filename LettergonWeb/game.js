var c = document.getElementById("c");
var w = document.getElementById("w");
var g = document.getElementById("g");
var ctx = c.getContext("2d");

var wordsRemaining = 0;
var letters = [];
var foundWords = {};
var lastLetterIndex = -1;
var lettersUsed = [];
var gridColumns = 4;

function configureGame(puzzle) {
    letters = [];
    letters.push(puzzle.Letters[puzzle.KeyLetterIndex]);
    for (var i = 0; i < puzzle.Letters.length; i++) {
        if (i === puzzle.KeyLetterIndex) continue;
        letters.push(puzzle.Letters[i]);
    }

    foundWords = {};
    var newBody = document.createElement("tbody");
    var cellCount = 0;
    var newRow;
    for (var i = 0; i < puzzle.Words.length; i++) {
        if (cellCount++ === 0) {
            newRow = newBody.insertRow();
        }
        else if (cellCount === gridColumns) {
            cellCount = 0;
        }

        var cell = newRow.insertCell();
        foundWords[puzzle.Words[i]] = { found: false, cell: cell };
    }

    wordsRemaining = puzzle.Words.length;

    g.parentNode.replaceChild(newBody, g);
    g = newBody;

    reset();
}

function reset() {
    lastLetterIndex = -1;
    lettersUsed = [];
    for (var i = 0; i < letters.length; i++) {
        lettersUsed[i] = false;
    }

    w.value = "";
    window.requestAnimationFrame(draw);
}

function draw(timestamp) {
    ctx.clearRect(0, 0, c.width, c.height);
    var cx = c.width / 2;
    var cy = c.height / 2;

    var rad = Math.min(c.width, c.height) / 2;
    var outerRad = rad * 0.95;
    var innerRad = rad * 0.4;
    var textRad = rad * 0.65;
    var textOffsetY = 15;
    var t = 2 * Math.PI / (letters.length - 1);

    ctx.fillStyle = "#fff";

    ctx.beginPath();
    ctx.arc(cx, cy, outerRad, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    for (var i = 0; i < letters.length - 1; i++) {
        var x = cx + outerRad * Math.sin(i * t);
        var y = cy - outerRad * Math.cos(i * t);
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
    }

    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, innerRad, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#000";
    ctx.font = "30pt Tahoma";
    ctx.textAlign = "center";
    for (var i = 0; i < letters.length - 1; i++) {
        ctx.fillStyle = lettersUsed[i + 1] ? "#ccc" : "#000";
        var x = cx + textRad * Math.sin(i * t + t / 2);
        var y = cy - textRad * Math.cos(i * t + t / 2) + textOffsetY;
        ctx.fillText(letters[i + 1].toUpperCase(), x, y);
    }

    ctx.fillStyle = lettersUsed[0] ? "#ccc" : "#000";
    ctx.fillText(letters[0].toUpperCase(), cx, cy + textOffsetY);
}

function handleClick(e) {
    var r = c.getBoundingClientRect();
    var x = e.clientX - r.x;
    var y = e.clientY - r.y;

    var cx = c.width / 2;
    var cy = c.height / 2;

    var rad = Math.min(c.width, c.height) / 2;
    var outerRad = rad * 0.95;
    var innerRad = rad * 0.4;

    var xr = x - cx;
    var yr = y - cy;

    var clickedLetterIndex;
    var dist = Math.sqrt(xr * xr + yr * yr);
    if (dist <= innerRad) {
        // Key
        clickedLetterIndex = 0;
    }
    else if (dist <= outerRad) {
        // Outer
        clickedLetterIndex = Math.floor((Math.atan2(-xr, yr) / Math.PI + 1) / 2 * (letters.length - 1)) % (letters.length - 1) + 1;
    }
    else {
        return;
    }

    if (!lettersUsed[clickedLetterIndex]) {
        lastLetterIndex = clickedLetterIndex;
        lettersUsed[clickedLetterIndex] = true;
        w.value += letters[clickedLetterIndex].toUpperCase();
    }
    else if (clickedLetterIndex === lastLetterIndex) {
        checkWord(w.value);
    }

    window.requestAnimationFrame(draw);
}

function handleKeyPress(e) {
    var k;
    if (e.which === 13) {
        // Enter
        checkWord(w.value);
        e.preventDefault();
        return;
    }

    if (e.which >= 0x41 && e.which <= 0x5a) {
        // Uppercase
        k = String.fromCharCode(e.which | 0x20);
    }
    else if (e.which >= 0x61 && e.which <= 0x7a) {
        // Lowercase
        k = String.fromCharCode(e.which);
    }

    for (var i = 0; i < letters.length; i++) {
        if (letters[i] !== k || lettersUsed[i]) continue;

        lettersUsed[i] = true;
        window.requestAnimationFrame(draw);
        return;
    }

    e.preventDefault();
}

function handleInput(e) {
    var value = w.value.toLowerCase();
    var countsByLetter = {};
    for (var i = 0; i < letters.length; i++) {
        var l = letters[i];
        if (l in countsByLetter) {
            countsByLetter[l]++;
        }
        else {
            countsByLetter[l] = 1;
        }
    }

    var newValue = "";
    for (var i = 0; i < value.length; i++) {
        var l = value[i];
        if (l in countsByLetter && countsByLetter[l] > 0) {
            countsByLetter[l]--;
        }
        else {
            continue;
        }

        newValue += l.toUpperCase();
    }

    var changed = false;
    for (var i = letters.length - 1; i >= 0; i--) {
        var l = letters[i];
        var newUsed = countsByLetter[l]-- <= 0;
        if (lettersUsed[i] === newUsed) continue;
        lettersUsed[i] = newUsed;
        changed = true;
    }

    if (changed) lastLetterIndex = -1;
    w.value = newValue;
    window.requestAnimationFrame(draw);
}

function checkWord(word) {
    word = word.toLowerCase();
    if (word in foundWords) {
        var wordInfo = foundWords[word];
        if (!wordInfo.found) {
            wordInfo.found = true;
            wordInfo.cell.innerText = word.length === lettersUsed.length ? word.toUpperCase() : word;
            if (--wordsRemaining === 0) {
                alert("You win!");
            }
        }
    }

    reset();
}

c.onclick = handleClick;
w.onkeypress = handleKeyPress;
w.oninput = handleInput;

fetch("/api/puzzle")
    .then(response => response.json())
    .then(data => configureGame(data));
