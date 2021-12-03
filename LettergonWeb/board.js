var c = document.getElementById("c");
var w = document.getElementById("w");
var r = document.getElementById("r");
var d = document.getElementById("d");

var ctx = c.getContext("2d");

var canvasDisplayWidth = 300;
var canvasDisplayHeight = 300;

var totalWords = 0;
var wordsRemaining = 0;
var letters = [];
var lastLetterIndex = -1;
var lettersUsed = [];
var startTime;
var timer;
var solutionShown = false;

function startTimer(customStartTime) {
    startTime = customStartTime === undefined ? new Date().getTime() : customStartTime;
    if (timer === undefined) timer = setInterval(updateTimer, 250);
    updateTimer();
}

function stopTimer(endTime) {
    if (timer === undefined) return;
    clearInterval(timer);
    timer = undefined;
    updateTimer(endTime);
}

function updateTimer(currentTime) {
    var duration = Math.floor(((currentTime === undefined ? new Date().getTime() : currentTime) - startTime) / 1000);
    var seconds = duration % 60;
    var timerValue = seconds < 10 ? "0" + seconds.toString() : seconds.toString();
    duration = Math.floor(duration / 60);
    var minutes = duration % 60;
    timerValue = (minutes < 10 ? "0" + minutes.toString() : minutes.toString()) + ":" + timerValue;
    var hours = Math.floor(duration / 60);
    if (hours > 0) {
        timerValue = hours.toString() + ":" + timerValue;
    }

    d.innerText = timerValue;
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
    ctx.clearRect(0, 0, canvasDisplayWidth, canvasDisplayHeight);
    if (letters.length == 0) return;
    var cx = canvasDisplayWidth / 2;
    var cy = canvasDisplayHeight / 2;

    var rad = Math.min(canvasDisplayWidth, canvasDisplayHeight) / 2;
    var outerRad = rad * 0.95;
    var innerRad = rad * 0.4;
    var textRad = rad * 0.65;
    var textOffsetY = 15;
    var t = 2 * Math.PI / (letters.length - 1);

    ctx.fillStyle = "#333";
    ctx.strokeStyle = "#ccc";

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

    ctx.fillStyle = "#fff";
    ctx.font = "bold 30pt Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif";
    ctx.textAlign = "center";
    for (var i = 0; i < letters.length - 1; i++) {
        ctx.fillStyle = lettersUsed[i + 1] ? lastLetterIndex === i + 1 ? "#888" : "#555" : "#ccc";
        var x = cx + textRad * Math.sin(i * t + t / 2);
        var y = cy - textRad * Math.cos(i * t + t / 2) + textOffsetY;
        ctx.fillText(letters[i + 1].toUpperCase(), x, y);
    }

    ctx.fillStyle = lettersUsed[0] ? lastLetterIndex === 0 ? "#888" : "#555" : "#ccc";
    ctx.fillText(letters[0].toUpperCase(), cx, cy + textOffsetY);

    updateRemaining();
}

function updateRemaining() {
    r.innerText = wordsRemaining + " out of " + totalWords + " remaining";
}

function handleClick(e) {
    e.preventDefault();
    var r = c.getBoundingClientRect();
    var x = e.clientX - r.left;
    var y = e.clientY - r.top;

    var cx = canvasDisplayWidth / 2;
    var cy = canvasDisplayHeight / 2;

    var rad = Math.min(canvasDisplayWidth, canvasDisplayHeight) / 2;
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
        lastLetterIndex = i;
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

var pixelRatio = window.devicePixelRatio || 1;
c.width = 300 * pixelRatio;
c.height = 300 * pixelRatio;
ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

c.onclick = handleClick;
w.onkeypress = handleKeyPress;
w.oninput = handleInput;
