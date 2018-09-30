//when html page is loaded
$(document).ready(function(){
  //*** VARIABLES ***//
  var socket = io();
  var pintStatus = 'startUp';
  var beerPintSetting;

  //*** CLICK FUNCTIONS ***//
  //when pour pint button is clicked
  $( "#pourPint" ).click(function() {
    // console.log(pintStatus);
    //if the beer pump isn't currently pouring to clean out the pipes
    if(pintStatus != 'cleaningPipes'){
      //emit socket to back end saying that the pint is pouring
	    socket.emit('interfaceController', 'pintPouring');
      //emit socket to open valve
	    socket.emit('pumpSwitcher', 1);
      // console.log("pint pouring");
      //change interface to tell user pint is pouring
      $("#pourPint p").html("Pint Pouring");
      $("#stopPint p").html("Stop Pint");
      //hide certain functions on the admin interface to prevent certain sockets from firing when they shouldn't be
      $("#adminHider").css({"opacity":"0"});
      $("form").css({"opacity":"0"});
    }
  });
  //when stop pint button is clicked
  $( "#stopPint" ).click(function() {
    // console.log(pintStatus);
    //emit socket to close the valve
    socket.emit('pumpSwitcher', 0);
    //if the beer was pouring when stop button was clicked
    if(pintStatus == 'pintPouring'){
      //display the pause menu
	    $("#pourPint p").html("Resume Pint");
	    $("#stopPint p").html("Cancel Pint");
      //emit socket to back end saying that the beer flow is in a paused state
	    socket.emit('interfaceController', 'pintPaused');
	  }
    //if the pump has just started up, was paused or is currently cleaning the pipes
    if(pintStatus == 'pintPaused' || pintStatus == 'startUp' || pintStatus == 'cleaningPipes') {
      //reset the interface screen
    	resetScreen();
      //emit two sockets to the back end saying that the pint has been cancelled
    	socket.emit('interfaceController', 'cancelPint');
    	socket.emit('pumpSwitcher', 'cancelPint');
    }
  });
  //when the clean out button has been clicked
  $( "#cleanOut" ).click(function() {
  		// console.log("clean pipes");
      //emit two sockets to tell the back end that the pipes are currently cleaning and to open the valve
    	socket.emit('interfaceController', 'cleaningPipes');
  		socket.emit('pumpSwitcher', 1);
  });
  //when the make payment button has been clicked
  $( "#makePayment" ).click(function() {
      // console.log("make payment");
      //emit a socket to tell the back end to pulse the payment leds
      socket.emit('interfaceController', 'makePayment');
  });
  //when the place beer below button has been clicked
  $( "#placeBeerBelow" ).click(function() {
      // console.log("place beer below");
      //emit a socket to tell the back end to pulse the beer mat leds
      socket.emit('interfaceController', 'placeBeerBelow');
  });
  //when the beer mat light on button has been pressed
  $( "#beerMatFullLight" ).click(function() {
      // console.log("light up beer mat");
      //emit a socket to tell the back end to light up the beer mat leds
      socket.emit('interfaceController', 'beerLightUp');
  });
  //when the iZettle lights button has been clicked
  $( "#iZettleFullLight" ).click(function() {
      // console.log("light up iZettle");
      //emit a socket to tell the back end to light up the beer mat leds
      socket.emit('interfaceController', 'iZettleLightUp');
  });
  //when turn all lights on button has been clicked
  $( "#allLightsOn" ).click(function() {
      // console.log("light up beer mat");
      //emit a socket to tell the back end to light up all the leds
      socket.emit('interfaceController', 'allLightUp');
  });
  //when the turn all off button has been clicked
  $( "#terminateAll" ).click(function() {
      // console.log("place beer below");
      //emit two sockets to tell the back end to reset all leds and turn off the valve
      socket.emit('interfaceController', 'reset');
      socket.emit('pumpSwitcher', 'cancelPint');
      //reset user interface
      resetScreen();
  });

  //*** SOCKET RECEIVE FUNCTIONS ***//
  //when an "interfaceController" socket has been received
  socket.on('interfaceController', function(msg){
    //update the status of what the beer pump is currently doing
   	pintStatus = msg;
    //if the beer pump has poured a pint or cancelled a pint, reset the interface
   	if(pintStatus == 'pintPoured' || pintStatus == 'cancelPint') resetScreen();
    //else if the beer pump is currently cleaning its pipes then change the interface
   	else if(pintStatus == 'cleaningPipes') cleaningPipesInterface();
  });
  //when sockets to indicate how many mls have been poured are recieve
  socket.on('beerReader', function(beerHeight){
    //display it on the admin page
    $("#beerHeight").html(beerHeight + "ml");
  });
  //when sockets to indicate how many mls should be poured are recieved
  socket.on('beerSettings', function(beerValue){
    //display it on the admin page
    $( "input:first" ).val(beerValue);
    //display a message telling the user that the new value has been submitted
    $( "#result" ).text( "Submitted!" ).show().fadeOut( 5000 );
  });

  //*** FORM SUBMITION ***//
  //when the form submit button has been pressed
  $( "form" ).submit(function( event ) {
    //put that form value into a global variable
    beerPintSetting = $( "input:first" ).val();
    //if the form value is below 800 and above 0, emit the value to the back end
    if(beerPintSetting < 800 && beerPintSetting > 0) socket.emit('beerSettings', beerPintSetting);
    //if the value is invalid then display an error message and dont submit
    else failedSubmition();
    //don't treat the submit button as a link for the webpage to open
    return false;
  });

  //*** INTERFACE FUNCTIONS ***//
  //reset the screen interface
  function resetScreen(){
    // console.log("screen reset");
  	$("#pourPint p").html("Pour Pint");
    $("#stopPint p").html("Stop Pint");
    $("#adminHider").css({"opacity":"1"});
    $("#beerHeight").html("0ml");
    $("form").css({"opacity":"1"});
  }
  //cleaning pipes interface
  function cleaningPipesInterface(){
    $("#pourPint p").html("pipe cleaning");
    $("#stopPint p").html("in progress..");
  }
  //failed submition error message
  function failedSubmition(){
    $( "#result" ).text( "Value must be between 0 - 800" ).show().fadeOut( 8000 );
    $( "input:first" ).val(beerValue);
  }

  //*** APP CONTROLS ***//
	//refresh front end app
	$('.btn_app_refresh').click(function(){
		socket.emit('beerAdmin', 'refresh');
		return false;
	});
	//rest pumps
	$('.btn_app_reset_pump').click(function(){
		socket.emit('interfaceController', 'cancelPint');
    	socket.emit('pumpSwitcher', 'cancelPint');
		socket.emit('beerAdmin', 'reset_pump');
		return false;
	});
});
