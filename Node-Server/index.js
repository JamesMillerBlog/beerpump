//*** STATIC VARIABLES ***//
//1. Server init
var app = require('express')(),
	http = require('http').Server(app),
	io = require('socket.io')(http),
	previousCommand,
	previousTwoCommand,
	interfaceControl = 'startUp';
//2. Arduino init
var five = require("johnny-five"),
	//declare two boards: A = beer pump/izettle lights, B = beer mat lights
	boards = new five.Boards(["A", "B"]),
	//array to store arduino pin data
	j5 = {},
	pixel = require("../lib/pixel.js");
//3. Arduino valve + sensor variables
var oldSensorState = 0,
	sensorInterval,
	lightInterval,
	pintInterval,
	intervalMilliSecondCount = 10,
	loopInterval = 10,
	pulseCount=0,
	flowRate = 0,
	flowMillilitres = 0,
	totalMillilitres = 0,
	startTime,
	oldTime = 0,
	repeater,
	barBlue = 204,
   	barGreen = 148,
   	barRed = 80,
    speed = 6,
    blueIncreaser = 1 * speed,
    greenIncreaser = (barGreen/barBlue)*speed,
    redIncreaser = (barRed/barBlue)*speed,
    currentBlue = 0,
	rawGreen = 0,
	rawRed = 0,
	currentRed = 0,
	currentGreen = 0,
	colorReached = false,
	resume = false,
	resetTimer = false,
	devMode = true,
	valveChecker = false,
	totalOldMillilitres = 0;

//*** ADJUSTABLE VARIABLES ***//
var calibrationFactor = 6, //change this to adjust the sensitivity of the flow sensor
	pint = 550, //change this to 550(ml) for final installation
	pipeCleaner = 100;

//*** SET UP HTML/CSS/JS FILES WITH THE SERVER ***//
var serveFileLocations = [
	//admin
	'/admin', '/admin/css/styles.css', '/admin/js/script.js',
	//app
	'/', '/app/js/socket.io.js', '/app/js/scripts.socket.js', '/app/js/scripts.js', '/app/css/styles.css', '/app/audio/beep.mp3',
	//images
	'/app/images/page1a.jpg', '/app/images/page1b.jpg', '/app/images/page1c.jpg', '/app/images/page1d.jpg', '/app/images/page1e.jpg', '/app/images/page1f.jpg', '/app/images/page1g.jpg',
	'/app/images/page2.jpg', '/app/images/page3.jpg', '/app/images/page4.jpg', '/app/images/page5.jpg', '/app/images/page6.jpg', '/app/images/page7.jpg', '/app/images/page8.jpg', '/app/images/page9.jpg', '/app/images/page10.jpg', '/app/images/page11.jpg', '/app/images/page12.jpg', '/app/images/page_error.jpg',
	'/app/images/loading.gif', '/app/images/loading2.gif'
];
var serveFiles = [
	//admin
	'/admin/index.html', '/admin/css/styles.css', '/admin/js/script.js',
	//app
	'/app/', '/app/js/socket.io.js', '/app/js/scripts.socket.js', '/app/js/scripts.js', '/app/css/styles.css', '/app/audio/beep.mp3',
	//images
	'/app/images/page1a.jpg', '/app/images/page1b.jpg', '/app/images/page1c.jpg', '/app/images/page1d.jpg', '/app/images/page1e.jpg', '/app/images/page1f.jpg', '/app/images/page1g.jpg',
	'/app/images/page2.jpg', '/app/images/page3.jpg', '/app/images/page4.jpg', '/app/images/page5.jpg', '/app/images/page6.jpg', '/app/images/page7.jpg', '/app/images/page8.jpg', '/app/images/page9.jpg', '/app/images/page10.jpg', '/app/images/page11.jpg', '/app/images/page12.jpg', '/app/images/page_error.jpg',
	'/app/images/loading.gif', '/app/images/loading2.gif'
];
//loop to call the file server function
for(var x = 0;x<serveFileLocations.length;x++) fileServer(x);
//serves all files from both of the above arrays
function fileServer(x){
	app.get(serveFileLocations[x], function(req, res){
	  res.sendFile(__dirname + serveFiles[x]);
	});
}
//app.use(express.static('app'));
//app.use("/app", express.static('app'));

//*** SOCKETS ***//
//When a user connects to the local host
io.on('connection', function(socket){
	console.log('a user connected');
	//socket to control the pump
	socket.on('pumpSwitcher', function(pumpVal){
		console.log('message: ' + pumpVal);
		//if the previous command isn't the same as the current one, activate pump function
		if(previousCommand != pumpVal) {
			pintActuator(pumpVal);
			previousCommand = pumpVal;
		}
		//previous command is updated to latest command, this stop multiples of the same message being sent
	});
	//When the interface is telling the server if it is paused/pouring/stopped
	socket.on('interfaceController', function(msg){
		//Store the current interface position + stop multiple of the same command
		if(interfaceControl != msg){
			//activates a feature to create smoother led colour transition when resuming a pint pour
			if(previousTwoCommand == "pintPaused" && interfaceControl == "pintPouring") resume = true;
			//if not resuming a pour then set to false
			else resume = false;
			//get message from socket and put in a global variable
			interfaceControl = msg;
			//activate leds
			activateLeds(msg);
			// console.log("interfaceControl = " + interfaceControl);
		}
		// console.log("previous command was = " + previousTwoCommand);
		// logic to store the last socket message to work out if the pint is resuming a pour from a paused state
		if(interfaceControl != previousTwoCommand) previousTwoCommand = interfaceControl;
	});
	//socket from the front end to receive how many ml of beer will pour from the nozzle
	socket.on('beerSettings', function(settings){
		//update adustable pint variable
		pint = settings;
		//emit the new beer setting to the front end (confirming that it has been received ok)
		io.emit('beerSettings', pint);
		// console.log("new pint value is = " + pint);
	});
	//socket from the front end for app settigns
	socket.on('beerAdmin', function(response){
		//emit the new beer setting to the front end (confirming that it has been received ok)
		io.emit('beerAdmin', response);
	});
	//log when a user has disconected
	socket.on('disconnect', function(){
    	console.log('user disconnected');
  	});
});
//express server running on local host 3000 (will be local host 4000 using gulp)
http.listen(3000, function(){
  console.log('listening on *:3000');
});

//*** SET UP ARDUINO TO LISTEN TO SERVER ***//
//when the board is ready
boards.on("ready", function() {
	//counter to make sure both arduinos are initialised before starting the application
	var readyCounter = 0;
	//for each board
	this.each(function(board){
	  //if the board firmware code is "arduinoA" (located in Arduino-code/arduinoA)
	  if(board.io.firmware.name == "arduinoA.ino"){
	  	  board.id === "A"
		  //set up valve pin
		  j5.valve = new five.Pin({ pin: 4, board: board });
      	  j5.sensorPin = new five.Pin({ pin: 2, board: board });
		  //set up liquid flow sensor on a continuous loop to check the value from the sensor pin
		  j5.sensorPin.read(function(error, value) {
		  	  //when the sensor goes from high to low state, increment pulse counter
		  	  if(oldSensorState>value) pulseCounter();
		  	  //update old sensor state to the latest state
		  	  oldSensorState = value;
		  });
		  //set up rgb led strip
		  j5.aStrip = new pixel.Strip({ board: this, controller: "FIRMATA", strips: [{pin: 7, length: 30}, ]});
		  //when the strip is ready
		  j5.aStrip.on("ready", function() {
		  	//increment the ready counter
		  	readyCounter++;
		  	//pass ready counter through startUp
		  	startUp(readyCounter);
	  	  });
	  	// console.log("board id = " + board.id);
	  }
	  //else if the board firmware code is "arduinoB" (located in Arduino-code/arduinoB)
	  else if(board.io.firmware.name == "arduinoB.ino"){
	  	  //set up rgb led strip
		  j5.bStrip = new pixel.Strip({ board: this, controller: "FIRMATA", strips: [{pin: 7, length: 30}, ]});
		  //when the strip is ready
		  j5.bStrip.on("ready", function() {
		  	//increment the ready counter
		  	readyCounter++;
		  	//pass ready counter through startUp function
		  	startUp(readyCounter);
	  	  });
	  	  // console.log("board id = " + board.id);
	  }
	});
});

//*** START RUNNING APPLICATION ***//
function startUp(readyToStart){
	//if both arduino's have been loaded
  	if(readyToStart == 2) {
  		//light up the leds to signal the application is running
  		devMode = false;
	  	lightInterval = setInterval(function(){ lightLoop("startUp") },20);
	  	// console.log("Strip ready, let's go");
  	}
}


//*** VALVE ACTUATOR ***//
function pintActuator(pintSwitch){
	// open or close valve
	if(!devMode && (pintSwitch == 0 || pintSwitch == 1)) {
		if(valveChecker == false && pintSwitch == 1){
			oldTime = 0;
			pulseCount = 0;
			flowRate = 0;
			flowMillilitres = 0;
			totalMillilitres = 0;
			previousCommand = 0;
			totalOldMillilitres = 0;
			valveChecker = true;
		}
		j5.valve.write(pintSwitch);
	}
	//clear beer checking interval
  	clearInterval(pintInterval);
  	//create an interval that makes sure that the valve is performing correctly
  	if(pintSwitch == 0 || pintSwitch == 1) pintInterval = setInterval(function(){ valveLoop(pintSwitch) },1500);

	//if valve is open, activate sensor calculation loop
  	if(pintSwitch == 1 && interfaceControl == 'pintPouring') {
  		//clear previous sensor intervals incase multiples exist
  		clearInterval(sensorInterval);
  		//create interval to calculate ammount of beer being poured
  		sensorInterval = setInterval(function(){sensorLoop(pint)},1);
  		//tell the front end that beer is being poured
  		io.emit('interfaceController', 'pintPouring');
  		activateLeds("pintPouring");
  		//start timers for the loop
	  	startTime = Date.now();
	  	oldTime = 0;
  	}
  	//if the valve has been turned off when it was pouring, tell the front end to display paused options
  	else if(pintSwitch == 0 && interfaceControl == 'pintPouring') io.emit('interfaceController', 'pintPaused');
  	//if the user cancels the pint, reset the valve
  	else if(pintSwitch == 'cancelPint' || pintSwitch == 'reset') resetValve();
  	//if the admin function to clean pipes is activated
  	else if(pintSwitch == 1 && interfaceControl == 'cleaningPipes') {
  		//create interval to pour out beer left in the pipes
  		sensorInterval = setInterval(function(){sensorLoop(pipeCleaner)},1);
  		//tell the front end that the pipes are being cleaned
  		io.emit('interfaceController', 'cleaningPipes');
  		//start timers for the loop
  		startTime = Date.now();
	  	oldTime = 0;
  	}
}

function valveLoop(actuation){

	console.log("trigger me");
	console.log("total mills = " + totalMillilitres);
	console.log("total old mills = " + totalOldMillilitres);
	console.log("actuation = " + actuation);
	//if pint is supposed to be on and beer has not been pouring, re-open the valve
	if(actuation == 1) {
		if(totalMillilitres <= totalOldMillilitres) {
			console.log("pour now");
			if(!devMode) j5.valve.write(0);
			if(!devMode) setTimeout(function(){ j5.valve.write(1); }, 1000);
		}
	}else{
		console.log("stop pouring");
		if (!devMode) j5.valve.write(0);
	}
}


//*** CLOSE VALVE AND RESET FLOW METER ***//
function resetValve(){
	//turn valve off and reset all variables
	if(!devMode) j5.valve.write(0);
	clearInterval(sensorInterval);
	clearInterval(pintInterval);
	oldTime = 0;
	pulseCount = 0;
	flowRate = 0;
	flowMillilitres = 0;
	totalMillilitres = 0;
	previousCommand = 0;
	totalOldMillilitres = 0;
	valveChecker = false;
	console.log("reset called");
	//tell the front end that the pint has been poured
	io.emit('interfaceController', 'pintPoured');
	//clear the interval loop
}

//*** BEER FLOW METER ***//
function sensorLoop(beerMeasure){
	elapsedTime = Date.now() - startTime;
	//every 10 milliseconds, check how much beer has been poured
    if((elapsedTime - oldTime) > intervalMilliSecondCount){
	  	flowRate = ((intervalMilliSecondCount / (elapsedTime - oldTime)) * pulseCount) / calibrationFactor;
	  	flowMillilitres = (flowRate / 60) * 1000;
  		totalMillilitres += flowMillilitres;
	  	// console.log("Total Millilitres = " +  totalMillilitres + "ml");
	  	io.emit('beerReader', totalMillilitres.toFixed(0));
	  	//reset the pulse count and timer so that it can measure the loops next beer flow reading
    	pulseCount = 0;
    	oldTime = elapsedTime;
    }
    //once a pint has been poured, close valve and reset all variables
    if(totalMillilitres >= beerMeasure) {
    	resetValve();
    	activateLeds("reset");
    }
    if(interfaceControl == "pintPaused"){
	    if(totalOldMillilitres != totalMillilitres) {
		    totalOldMillilitres = totalMillilitres;
	    }
    }
}

//*** PULSE COUNT FROM SENSOR TO DETECT BEER FLOW ***//
function pulseCounter(){
	//increment every time the sensor completes a revolution
	pulseCount++;
}

//*** ACTIVATE LEDS ***//
function activateLeds(source){
	//if the pump hasnt been re-activated from a paused state
	if(resume == false){
		//reset all color variables + clear light animation loop
	    currentBlue = 0,
		rawGreen = 0,
		currentGreen = 0,
		rawRed = 0,
		currentRed = 0,
		colorReached = false;
		clearInterval(lightInterval);
		//detect which light animation should trigger from the socket and run that animation in a looped function.
		if(source == "makePayment") lightInterval = setInterval(function(){ lightLoop("payment") },30);
		else if (source == "placeBeerBelow") lightInterval = setInterval(function(){ lightLoop("beer") },30);
		else if (source == "iZettleLightUp") lightInterval = setInterval(function(){ lightLoop("iZettleLightUp") },30);
		else if (source == "beerLightUp") lightInterval = setInterval(function(){ lightLoop("beerLightUp") },30);
		else if (source == "allLightUp") lightInterval = setInterval(function(){ lightLoop("allLightUp") },30);
		else if (source == "cancelPint") lightInterval = setInterval(function(){ lightLoop("reset") },30);
		else if (source == "pintPouring") lightInterval = setInterval(function(){ lightLoop("pintPouring") },30);
		else if (source == "pintPaused") lightInterval = setInterval(function(){ lightLoop("beer") },30);
		else if (source == "cleaningPipes") lightInterval = setInterval(function(){ lightLoop("reset") },30);
		else if (source == "startUp") lightInterval = setInterval(function(){ lightLoop("startUp") },30);
		else if (source == "reset") lightInterval = setInterval(function(){ lightLoop("reset") },30);
	}
}
//*** LIGHT ANIMATIONS ***//
function lightLoop(trigger){
	// if the latest command isn't the same as the previous command, turn both leds off
	if(repeater!=trigger) {
		if(!devMode) {
			j5.aStrip.off();
			j5.bStrip.off();
		}
		resetTimer = true;
	}
	//update the previous command to the latest command
	repeater = trigger;
	//if the pump is not resuming from a paused state and the animation hasn't been completed,
	//animate the blue leds from 0 - 204 & green leds to 148
	if(currentBlue <= barBlue && colorReached == false && resume == false) {
		currentBlue+=blueIncreaser;
		rawRed += redIncreaser;
		currentRed = rawRed.toFixed(0);
		rawGreen += greenIncreaser;
		currentGreen = rawGreen.toFixed(0);
		//once colour has been reached switch boolean to true
		if(currentBlue >= barBlue) colorReached = true;
	//animate the colours from a lit state to off
	} else if(currentBlue >= 0 && colorReached == true && resume == false){
		currentBlue -= blueIncreaser;
		rawRed -= redIncreaser;
		rawGreen -= greenIncreaser;
		currentRed = rawRed.toFixed(0);
		currentGreen = rawGreen.toFixed(0);
		colorReached = true;
		//once the leds are off, restart the process
		if(currentBlue <= 0) colorReached = false;
	} else if (resume == true && currentBlue <= barBlue && currentGreen <= barGreen){
		// console.log("resume is happening!");
		currentBlue+=blueIncreaser;
		rawRed += redIncreaser;
		rawGreen += greenIncreaser;
		currentRed = rawRed.toFixed(0);
		currentGreen = rawGreen.toFixed(0);
		//once colour has been reached switch boolean
		if(currentBlue >= barBlue) {
			colorReached = true;
			trigger = "pintPouring";
			resume = false;
		}
	}
	//makes the payment leds pulse
  	if(trigger == "payment" && !devMode) j5.aStrip.color("rgb("+currentRed+","+currentGreen+","+currentBlue+")");
  	//makes the beer mat leds pulse
  	if(trigger == "beer" && !devMode) j5.bStrip.color("rgb("+currentRed+","+currentGreen+","+currentBlue+")");
  	//makes the beer mat leds light up
  	if(trigger == "pintPouring" && !devMode || trigger == "beerLightUp" && !devMode) j5.bStrip.color("rgb("+barRed+","+barGreen+","+barBlue+")");
  	//makes payment leds light up
  	if(trigger == "iZettleLightUp" && !devMode) j5.aStrip.color("rgb("+barRed+","+barGreen+","+barBlue+")");
  	//resets all leds
  	if(trigger == "reset" && !devMode) resetLeds();
  	//lights up all leds
  	if(trigger == "allLightUp" && !devMode) {
  		j5.aStrip.color("rgb("+barRed+","+barGreen+","+barBlue+")");
  		j5.bStrip.color("rgb("+barRed+","+barGreen+","+barBlue+")");
  	}
  	//pulses both leds on once and then resets the leds off
  	if(trigger == "startUp") {
  		j5.aStrip.color("rgb("+currentRed+","+currentGreen+","+currentBlue+")");
  		j5.bStrip.color("rgb("+currentRed+","+currentGreen+","+currentBlue+")");
		if(resetTimer == true){
			resetTimer = false;
			setTimeout(function(){ resetLeds();}, 1000);
		}
  	}
  	//display leds latest colour
  	if(!devMode) {
	    j5.aStrip.show();
	    j5.bStrip.show();
  	}
    //function to reset all led variables, turn off strips and clear the animation loop
  	function resetLeds(){
  		rawGreen = 0;
  		rawRed = 0;
		currentGreen = 0;
		currentBlue = 0;
		currentRed = 0;
		// console.log("current red = "+currentRed);
		colorReached = false;
		if(!devMode) {
	  		j5.aStrip.off();
	  		j5.bStrip.off();
		}
  		console.log("reset");
  		clearInterval(lightInterval);
  	}
  	// console.log("current red = "+currentRed);
}
