var g = document.getElementById("g");
var rn = document.getElementById("rn");
var pn = document.getElementById("pn");
var jg = document.getElementById("jg");
var ig = document.getElementById("ig");
var po = document.getElementById("po");

var foundWords = {};

function configureGame(puzzle) {
    letters = [];
    letters.push(puzzle.Letters[puzzle.KeyLetterIndex]);
    for (var i = 0; i < puzzle.Letters.length; i++) {
        if (i === puzzle.KeyLetterIndex) continue;
        letters.push(puzzle.Letters[i]);
    }

    var gridColumns = letters.length > 8 ? 3 : 4;

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

    wordsRemaining = totalWords = puzzle.Words.length;
    solutionShown = false;

    g.parentNode.replaceChild(newBody, g);
    g = newBody;

    reset();
    w.placeholder = "min. " + puzzle.MinWordLength + " letters";
    startTimer();
}

function checkWord(word) {
    word = word.toLowerCase();
    if (word in foundWords) {
        var wordInfo = foundWords[word];
        if (!wordInfo.found) {
            wordInfo.found = true;
            var cell = wordInfo.cell;
            cell.innerText = word.length === lettersUsed.length ? word.toUpperCase() : word;
            cell.className = "found";
            if (--wordsRemaining === 0) {
                stopTimer();
                alert("You win!");
            }
        }
    }

    reset();
}

function showSolution() {
    if (solutionShown || wordsRemaining === 0) return;
    stopTimer();
    for (var word in foundWords) {
        var wordInfo = foundWords[word];
        if (wordInfo.found) continue;
        wordInfo.found = true;
        var cell = wordInfo.cell;
        cell.innerText = word.length === lettersUsed.length ? word.toUpperCase() : word;
        cell.className = "not-found";
    }

    solutionShown = true;
}

function newGame() {
    if (wordsRemaining > 0 && !solutionShown) {
        if (!confirm("Are you sure you want to start a new game?")) return;
    }

    stopTimer();
    var pangramLength = Math.floor(Math.random() * 5 + 5);
    var minWordLength = po.checked ? pangramLength : pangramLength < 7 ? 3 : 4;

    var request = new XMLHttpRequest();
    request.addEventListener("load", function () { configureGame(JSON.parse(this.responseText)); });
    request.open("GET", "/api/puzzle/" + pangramLength + "/" + minWordLength);
    request.send();

    w.focus();
}

var pixelRatio = window.devicePixelRatio || 1;
c.width = 300 * pixelRatio;
c.height = 300 * pixelRatio;
ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

c.onclick = handleClick;
w.onkeypress = handleKeyPress;
w.oninput = handleInput;
