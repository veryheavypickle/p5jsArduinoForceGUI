let serial;
let portList;
let colourScheme = [];
let currentColourScheme;
let barHeight;
let Trainer;
let RGBList = [];  //a list of colours, rgb.

function setup() {
  createCanvas(windowWidth, windowHeight);
  setDefaults();
  Trainer = new Application(new TrainerApp(), 0);
  resetSerial();
}

function serverConnected() {
  print("Connected to Server");
}

function gotList(thelist) {
  portList = thelist;
}

// Connected to our serial device
function gotOpen() {
  print("Serial Port is Open");
  Trainer.openedSerial();
}

function gotClose() {
  print("Serial Port is Closed");
  Trainer.closedSerial();
}

// Ut oh, here is an error, let's log it
function gotError(theerror) {
  print(theerror);
}

// There is data available to work with from the serial port
function gotData() {
  let d = serial.readLine();
  if (d.length > 0) {
    Trainer.dataSerial(d);
  }
}

// We got raw from the serial port
function gotRawData(thedata) {
  print("gotRawData" + thedata);
}

function resetSerial() {
  // Instantiate our SerialPort object
  serial = new p5.SerialPort();
  serial.list();
  serial.on('connected', serverConnected);
  serial.on('list', gotList);
  serial.on('data', gotData);
  serial.on('error', gotError);
  serial.on('open', gotOpen);
  serial.on('close', gotClose);
}

function connect(n) {
  serial.open(n);
  return true;
}

function setDefaults() {
  //0: Highlight Colour, 1: Background Colour, 2: UI Colour, 3: Shape Colour, 4: Text/Point Colour
  append(colourScheme, ["#2a9d8f", "#e9c46a", "#f4a261", "#e76f51", "#000000"]);
  append(colourScheme, ["#ffb4a2", "#e5989b", "#b5838d", "#6d6875", "#000000"]);
  append(colourScheme, ["#d6306a", "#272c3a", "#343c49", "#424d61", "#c7dbf3"]);
  currentColourScheme = 2;
  barHeight = 20; //in pixels - this is literally used by everything
  RGBList.push(color(252, 96, 92));    //red
  RGBList.push("#2a9d8f");  //green
}

function draw() {
  Trainer.display();
}

function areCoordsInside(x, y, posX, posY, widthX, widthY) {
  if (x > posX && x < posX + widthX && y > posY && y < posY + widthY) {
    return true;
  } else {
    return false;
  }
}

function changeColourScheme() {
  //this increments the colourscheme by 1.
  let i = currentColourScheme;
  i++;
  if (i > colourScheme.length - 1) {
    i = 0;
  }
  currentColourScheme = i;
}

function updateButtonNames(i, n) {
  Trainer.updateButtonNames(i, n);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  Trainer.windowHasBeenResized();
}

function mousePressed() {
  Trainer.mouseHasBeenPressed(mouseX, mouseY);
}

function mouseMoved() {
  Trainer.mouseHasBeenMoved(mouseX, mouseY);
}

function mouseDragged() {
  Trainer.mouseHasBeenDragged(mouseX, mouseY);
}

function mouseReleased() {
  Trainer.mouseHasBeenReleased(mouseX, mouseY);
}

class TrainerApp {
  constructor() {
    this.buttonNames = ["Change Colour Scheme", "Full Screen", "Connect to Arduino", "Start Training", "Virtual Arduino"];
    this.windows = [];
    this.arduWindow = [];
    this.status = false;  //status of connection
    this.fontSize = 12;
    this.windowHasBeenResized();
    this.setArduStatus(false);
    this.updatePunchHeight(0);
    this.stopRandomClock();
    this.initiatePlayerTimer(); //records time that user takes to react  
    this.times = [];    // records all player times
    this.bestPunch = 0;
    this.force = 0;
    this.calibrateFSR();
  }

  display() {
    background(colourScheme[currentColourScheme][1]);
    noStroke();
    
    //indicator square
    if (this.randomClock.length > 0) {
      if (this.randomClock[0].check()) {
        this.payerTimerStarted = true;
        this.startPlayerTimer();
      }
      fill(RGBList[0]);
    } else {
      fill(RGBList[1]);
    }
    rectMode(CENTER);
    rect(this.indicatorSquarePos[0], this.indicatorSquarePos[1], this.indicatorSquareWidth, this.indicatorSquareWidth, barHeight);
    
    //bar
    rectMode(CORNER);
    fill(colourScheme[currentColourScheme][2]);
    rect(this.infoBarPos, this.infoBarPos, this.infoBarWidth, this.infoBarHeight, barHeight);
    fill(colourScheme[currentColourScheme][3]);
    rectMode(CORNER);
    rect(barHeight * 1.5, barHeight * 1.5, barHeight * 5, barHeight * 5, barHeight);

    //punch bar
    fill(colourScheme[currentColourScheme][0]);
    rect(this.punchIndicatorPos[0], this.punchIndicatorPos[1] - this.punchHeight, this.punchIndicatorWidth, this.punchHeight, this.punchIndicatorRounding);
    //online indicator
    fill(colourScheme[currentColourScheme][4]);
    textAlign(LEFT, CENTER);
    textSize(this.fontSize * 1.5);
    fill(this.statusIndicator);
    rectMode(CENTER);
    rect(this.statusPos, this.statusPos, barHeight * 3, barHeight * 3, barHeight/2);
    
    //timing indicator
    fill(colourScheme[currentColourScheme][4]);
    textAlign(RIGHT);
    text("Best time", this.infoBarPos + this.infoBarWidth - barHeight, this.infoBarHeight / 4);
    text("Best punch", this.infoBarPos + this.infoBarWidth - barHeight, this.infoBarHeight / 2);
    textAlign(LEFT);
    text("Latest time", this.infoBarPos + barHeight, this.infoBarHeight / 4);
    if (this.times.length > 0) {
      //latest
      text(this.times[this.times.length - 1] + "ms", this.infoBarPos + barHeight, this.infoBarHeight / 4 + barHeight);
      //best
      textAlign(RIGHT);
      text(min(this.times) + "ms", this.infoBarPos + this.infoBarWidth - barHeight, this.infoBarHeight / 4 + barHeight);
      text(this.bestPunch + "N", this.infoBarPos + this.infoBarWidth - barHeight, this.infoBarHeight / 2 + barHeight);
    }
    textAlign(CENTER);
    text(this.force + "N", this.infoBarWidth / 2 + 2 * barHeight, windowHeight - this.punchHeight - 4 * barHeight);
    textSize(barHeight * 2);
    text(this.force + "N", this.indicatorSquarePos[0], this.indicatorSquarePos[1]);

    //display windows
    for (let i = 0; i < this.windows.length; i++) {
      this.windows[i].display();
    }
    for (let i = 0; i < this.arduWindow.length; i++) {
      this.arduWindow[i].display();
    }
  }

  createConnectionWindow() {
    resetSerial();
    if (this.windows.length == 0) {
      this.windows.push(new Window(this.defaultWinPos[0], this.defaultWinPos[1], barHeight, "Connect"));
      this.windows[0].setupButtons(portList);
      this.windows[0].setWidthAsButtons();
    }
  }

  setArduStatus(b) {
    this.status = b;
    if (this.status) {
      this.statusIndicator = RGBList[1];
    } else {
      this.statusIndicator = RGBList[0];
    }
  }

  updatePunchHeight(F) {
    //assuming data is an int with max value of 185 N
    this.punchHeight = (F/185) * (windowHeight - barHeight * 6);
  }

  toggleTraining(id) {
    if (this.randomClock.length > 0) {  //if already is training
      updateButtonNames(id, "Start Training");
      this.stopRandomClock();
      this.initiatePlayerTimer();
    } else {  // else start training
      updateButtonNames(id, "Stop Training");
      this.startRandomClock();
    }
  }

  startPlayerTimer() {
    if (this.recordingTimer.length == 0) {
      this.recordingTimer.push(new Timer());
      this.stopRandomClock();
    }
  }

  stopPlayerTimer(t) {
    if (this.recordingTimer.length > 0) {
      this.times.push(t);
      this.startRandomClock();
    }
    this.initiatePlayerTimer();
  }

  startRandomClock() {
    // clock between
    let minTime = 0.5; // in seconds
    let maxTime = 5; // in seconds
    this.randomClock = [new Clock(random(minTime * 1000, maxTime * 1000))];
  }

  stopRandomClock() {
    this.randomClock = [];
  }

  initiatePlayerTimer() {
    this.recordingTimer = [];
  }

  fsrToForce(d) {
    // log(Voltage) = gradient * log(Mass) + c
    // therefore log(Mass) = (log(Voltage) - c) / gradient 
    // Mass = 10 ^ ((log(Voltage) - c) / gradient)
    // Force = Mass * 9.81
    let V = 5 * d/1023;  //Voltage
    let Mass = pow(10, (log(V) - this.c) / this.m);  //where c is y intercept and m is gradient - as calculated below

    return round(Mass * 9.81);
  }

  calibrateFSR() {
    /*
    Data environment
     
     FSR-406 with measuring resistor of 10K Ohm
     
     data - this was taken from the official FSR-406 Datasheet as my tests were too inaccurate
     plus this sensor isn't designed to be accurate anyway lol
     this sensor probably only works up to 150 N
     */
    let logV = [log(1.40), log(3.40)];  // log of voltage(V)
    let logM = [log(0.05), log(1.00)];  // log of mass (kg)

    this.m = (logV[1] - logV[0]) / (logM[1] - logM[0]);  //gradient
    this.c = logV[0] - this.m * logM[0];
  }

  createVirtualArdu() {
    if (this.arduWindow.length == 0) {
      this.arduWindow.push(new Window(this.defaultWinPos[0], this.defaultWinPos[1], barHeight, "Arduino V"));
      this.arduWindow[0].setupButtons(["Virtual Clicker Trigger Thing"]);
      this.arduWindow[0].setWidthAsButtons();
    }
  }

  handleForce(d) {
  	// function that handles the force and calls all functions that need it
  	let force = this.fsrToForce(d);
  	if (this.recordingTimer.length > 0 & force > 30) {
        let time = floor(this.recordingTimer[0].getTime());
        this.stopPlayerTimer(time);
      }
      if (force > this.bestPunch) {
    	this.bestPunch = force;
    }
    this.updatePunchHeight(force);
    this.force = force;
  }

  //Application Specific
  menuButtonPressed(id) {
    //this runs a function based on which menu button was pressed, id is of type int
    if (id == 0) {
      changeColourScheme();
    } else if (id == 1) {
      let fs = fullscreen();
      fullscreen(!fs);
    } else if (id == 2) {
      this.createConnectionWindow();
    } else if (id == 3) {
      this.toggleTraining(id);
    } else if (id == 4) {
      this.createVirtualArdu();
    }
  }

  openedSerial() {
    this.setArduStatus(true);
  }

  closedSerial() {
    this.setArduStatus(false);
  }

  dataSerial(d) {
  	this.handleForce(d);
  }

  getAppName() {
    return "Trainee";
  }

  getButtonNames() {
    return this.buttonNames;
  }


  windowHasBeenResized() {
    this.infoBarWidth = windowWidth/4;
    this.infoBarHeight = windowHeight - 4 * barHeight;
    this.infoBarPos = barHeight * 2;
    this.statusPos = barHeight * 4;
    this.punchIndicatorPos = [this.infoBarPos + barHeight, windowHeight - this.infoBarPos - barHeight];
    this.punchIndicatorWidth = this.infoBarWidth - 2 * barHeight;
    this.punchIndicatorRounding = barHeight/2;
    this.indicatorSquarePos = [windowWidth/2, windowHeight/2];
    this.indicatorSquareWidth = 8 * barHeight;
    this.defaultWinPos = [1000, 200];
  }

  mouseHasBeenPressed(x, y) {
    for (let i = 0; i < this.windows.length; i++) {
      let clickedWindow = this.windows[i].mouseHasBeenPressed(x, y);
      if (clickedWindow[0]) {
        if (clickedWindow[1] == "Close") {
          this.windows = [];
        } else {  // a button name has been returned
          this.setArduStatus(connect(portList[clickedWindow[1]]));
        }
      }
    }
    for (let i = 0; i < this.arduWindow.length; i++) {
      let clickedWindow = this.arduWindow[i].mouseHasBeenPressed(x, y);
      if (clickedWindow[0]) {
        if (clickedWindow[1] == "Close") {
          this.arduWindow = [];
        } else {  // a button name has been returned
          //create random data;
          this.dataSerial(int(random(800, 1023)));
          this.dataSerial(0);
        }
      }
    }
  }

  mouseHasBeenDragged(x, y) {
    for (let i = 0; i < this.windows.length; i++) {
      this.windows[i].mouseHasBeenDragged(x, y);
    }
    for (let i = 0; i < this.arduWindow.length; i++) {
      this.arduWindow[i].mouseHasBeenDragged(x, y);
    }
  }

  mouseHasBeenReleased(x, y) {
    for (let i = 0; i < this.windows.length; i++) {
      this.windows[i].mouseHasBeenReleased(x, y);
    }
    for (let i = 0; i < this.arduWindow.length; i++) {
      this.arduWindow[i].mouseHasBeenReleased(x, y);
    }
  }

  mouseHasBeenMoved(x, y) {
    for (let i = 0; i < this.windows.length; i++) {
      this.windows[i].mouseHasBeenMoved(x, y);
    }
    for (let i = 0; i < this.arduWindow.length; i++) {
      this.arduWindow[i].mouseHasBeenMoved(x, y);
    }
  }
}

class Clock {
  constructor(t) {
    this.time = t;
    this.resetTimer();
  }

  resetTimer() {
    this.initTime = millis();
  }

  check() {
    // returns has finished
    if (millis() - this.initTime >= this.time) {
      return true;
    } else {
      return false;
    }
  }
}

class Timer {
  constructor() {
    this.resetTimer();
  }

  resetTimer() {
    this.initTime = millis();
  }

  getTime() {
    return millis() - this.initTime;
  }
}


class Window {
  constructor(id, x, y, n) {
    this.ID = id;
    this.posX = x;
    this.posY = y;
    this.title = n;
    this.windowWidth = windowWidth/4 - barHeight*2;
    this.windowHeight = windowHeight/2 - barHeight*3;
    this.clickable = false;
    this.windowDragged = false;
    this.cornerDragged = false;
    this.setShadowOffset();
    this.buttons = [];
  }

  display() {
    //shadows
    noFill();
    for (let i = 0; i < barHeight; i++) {
      stroke(0, barHeight - i);
      rectMode(CENTER);
      rect(this.shadowOffsetX, this.shadowOffsetY, this.windowWidth + i, this.windowHeight + barHeight + i, barHeight/2);
    }
    //top bar
    let topColour = color(colourScheme[currentColourScheme][3]);
    topColour.setAlpha(200);
    fill(topColour);
    rectMode(CORNER);
    rect(this.posX, this.posY, this.windowWidth, barHeight, barHeight/2, barHeight/2, 0, 0);
    fill(RGBList[0]);
    ellipseMode(CENTER);
    ellipse(this.posX + barHeight/2, this.posY + barHeight/2, barHeight/2, barHeight/2);
    if (this.clickable) {
      fill(0);
      ellipse(this.posX + barHeight/2, this.posY + barHeight/2, barHeight/6, barHeight/6);
    }
    textAlign(CENTER, CENTER);
    textSize(3 * barHeight/4);
    fill(colourScheme[currentColourScheme][4]);
    text(this.title, this.posX + this.windowWidth/2, this.posY + barHeight/2);

    //body
    fill(colourScheme[currentColourScheme][2]);
    rect(this.posX, this.posY + barHeight, this.windowWidth, this.windowHeight, 0, 0, barHeight/2, barHeight/2);

    //display buttons
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].display();
    }
  }

  setupButtons(names) {
    let mode = CORNER;
    for (let i = 0; i < names.length; i++) {
      this.buttons.push(new Button(this.buttons.length, this.posX, this.posY, names[i], mode, 0));
    }
    this.reloadButtons(mode);
  }

  reloadButtons(mode) {
    let currentLength = 0;
    let posY = this.getPosY() + barHeight;
    let posX = this.getPosX();
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].setPosX(posX + currentLength);
      this.buttons[i].setPosY(posY);
      currentLength += this.buttons[i].getButtonWidth();
    }
  }

  dragWindowBar(x, y) {
    this.posX = x - this.dragOffset[0];
    this.posY = y - this.dragOffset[1];
    //logic
    if (this.posY < barHeight) {
      this.posY = barHeight;
    }
    this.setShadowOffset();
  }

  dragCorner(x, y) {
    this.windowWidth = x + this.dragOffset[0];
    this.windowHeight = y + this.dragOffset[1];
    //logic
    if (this.windowWidth < 10 * barHeight) {
      this.windowWidth = 10 * barHeight;
    }
    if (this.windowHeight < 10 * barHeight) {
      this.windowHeight = 10 * barHeight;
    }
    this.setShadowOffset();
  }

  setShadowOffset() {
    this.shadowOffsetX = this.windowWidth/2 + this.posX;
    this.shadowOffsetY = (barHeight + this.windowHeight) / 2 + this.posY;
  }

  canChangeWindowSize(x, y) {  //if over bottom right corner
    if (areCoordsInside(x, y, this.posX + this.windowWidth - barHeight/2, this.posY + this.windowHeight + barHeight/2, barHeight, barHeight)) {
      return true;
    } else {
      return false;
    }
  }

  mouseHasBeenMoved(x, y) {
    if (areCoordsInside(x, y, this.posX, this.posY, barHeight, barHeight)) {  //if are over the cross button
      this.clickable = true;
    } else {
      this.clickable = false;
    }
    if (this.canChangeWindowSize(x, y)) {
      cursor("nwse-resize");
    } else {
      cursor(AUTO);
    }
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].mouseHasBeenMoved(x, y);
    }
  }

  mouseHasBeenPressed(x, y) {  // returns true or false if the app window can be closed
    // Command types, "Close" and any int means a menu button was pressed
    if (this.clickable) {
      return [true, "Close"];
    } 
    for (let i = 0; i < this.buttons.length; i++) {
      let hasBeenClicked = this.buttons[i].mouseHasBeenPressed(x, y);
      if (hasBeenClicked[0]) {
        return hasBeenClicked;
      }
    }
    return [false, "None"];
  }

  mouseHasBeenDragged(x, y) {
    if (this.windowDragged) {  // if window being dragged
      this.dragWindowBar(x, y);
      this.reloadButtons();
    }
    if (areCoordsInside(x, y, this.posX, this.posY, this.windowWidth, barHeight)) {  //if over top bar
      this.dragOffset = [x - this.posX, y - this.posY];
      this.windowDragged = true;
    }
    if (this.cornerDragged) {
      this.dragCorner(x, y);
    }
    if (this.canChangeWindowSize(x, y)) {
      this.dragOffset = [this.posX + this.windowWidth - x, this.posY + this.windowHeight - y];
      this.cornerDragged = true;
    }
  }

  mouseHasBeenReleased() {
    if (this.windowDragged) {
      this.windowDragged = false;
    }
    if (this.cornerDragged) {
      this.cornerDragged = false;
    }
  }

  getTitle() {
    return this.title;
  }

  getPosX() {
    return this.posX;
  }

  getPosY() {
    return this.posY;
  }

  getWinWidth() {
    return this.windowWidth;
  }

  getWinHeight() {
    return this.windowHeight;
  }

  setWidthAsButtons() {
    let winWidth = 0;
    for (let i = 0; i < this.buttons.length; i++) {
      winWidth += this.buttons[i].getButtonWidth();
    }
    this.windowWidth = winWidth;
    this.setShadowOffset();
  }
}

class Button {
  constructor(id, x, y, n, m, r) {
    this.ID = id;
    this.posX = x;
    this.posY = y;
    this.title = n;
    this.buttonHeight = barHeight;
    this.mode = m;  //this is the align mode - CENTER, CORNER etc
    this.textSize = barHeight/2;
    this.setButtonWidthAsTitle();
    this.fillColour = colourScheme[currentColourScheme][3];
    this.rounding = r;
    this.textX = x;
    this.textY = y;  //text posX and y;
    this.setupPositions();
  }

  display() {
    rectMode(this.mode);
    noStroke();
    fill(this.fillColour);
    rect(this.posX, this.posY, this.buttonWidth, this.buttonHeight, this.rounding);
    fill(colourScheme[currentColourScheme][4]);
    textAlign(CENTER, CENTER);
    textSize(this.textSize);
    text(this.title, this.textX, this.textY);
  }

  setupPositions() {
    if (this.mode == CORNER) {
      this.textX = this.posX + this.buttonWidth/2;
      this.textY = this.posY + this.buttonHeight/2;
    } else {
      this.textX = this.posX;
      this.textY = this.posY;
    }
  }

  getCoordsInside(x, y) {  //this is inefficient since it is called everytime mouse is moved
    if (this.mode == CENTER) {
      if (areCoordsInside(x, y, this.posX - this.buttonWidth/2, this.posY - this.buttonHeight/2, this.buttonWidth, this.buttonHeight)) {
        return true;
      } else {
        return false;
      }
    } else {
      if (areCoordsInside(x, y, this.posX, this.posY, this.buttonWidth, this.buttonHeight)) {
        return true;
      } else {
        return false;
      }
    }
  }

  mouseHasBeenPressed(x, y) {
    if (this.getCoordsInside(x, y)) {
      return [true, this.ID];
    } else {
      return [false, this.ID];
    }
  }

  mouseHasBeenMoved(x, y) {
    if (this.getCoordsInside(x, y)) {
      this.fillColour = colourScheme[currentColourScheme][0];
    } else {
      this.fillColour = colourScheme[currentColourScheme][3];
    }
  }

  getButtonWidth() {
    return this.buttonWidth;
  }

  setButtonWidthAsTitle() {
    textSize(this.textSize);
    this.buttonWidth = textWidth(this.title) + barHeight;
  }

  setButtonWidth(w) {
    this.buttonWidth = w;
  }

  setButtonHeight(h) {
    this.buttonHeight = h;
  }

  setPosX(x) {
    this.posX = x;
    this.setupPositions();
  }

  setPosY(y) {
    this.posY = y;
    this.setupPositions();
  }

  setFontSize(f) {
    this.textSize = f;
  }

  updateTitle(n) {
    this.title = n;
  }
}

class Application {
  constructor(App, id) {
    this.id = id;
    this.app = App;
    this.setupButtons(this.app.getButtonNames());
  }

  display() {
    this.app.display();
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].display();
    }
  }

  setupButtons(names) {
    this.buttons = [];
    let currentWidth = 0;
    for (let i = 0; i < names.length; i++) {
      this.buttons.push(new Button(names.length, currentWidth, 0, names[i], CORNER, 0));
      currentWidth += this.buttons[i].getButtonWidth();
    }
  }

  updateButtonNames(i, n) {
    //i is id
    // n is new name
    let names = this.app.getButtonNames();
    names[i] = n;
    this.setupButtons(names);
  }

  getAppName() {
    return this.app.getAppName();
  }

  openedSerial() {
    this.app.openedSerial();
  }

  closedSerial() {
    this.app.closedSerial();
  }

  dataSerial(d) {
    this.app.dataSerial(d);
  }

  windowHasBeenResized() {
    this.app.windowHasBeenResized();
  }

  mouseHasBeenPressed(x, y) {
    this.app.mouseHasBeenPressed(x, y);
    for (let i = 0; i < this.buttons.length; i++) {
      if (this.buttons[i].mouseHasBeenPressed(x, y)[0]) {
        this.app.menuButtonPressed(i);
      }
    }
  }

  mouseHasBeenMoved(x, y) {
    this.app.mouseHasBeenMoved(x, y);
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].mouseHasBeenMoved(x, y);
    }
  }

  mouseHasBeenDragged(x, y) {
    this.app.mouseHasBeenDragged(x, y);
  }

  mouseHasBeenReleased(x, y) {
    this.app.mouseHasBeenReleased(x, y);
  }
}
