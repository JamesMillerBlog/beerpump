


/********** DOCUMENT READY **********/
$(document).ready(function(){
	//reset lights & pump
	socket.emit('interfaceController', 'reset');
    socket.emit('pumpSwitcher', 'cancelPint');
});



/********** DATA **********/
var page = 'page_1';
var pintStatus = 'startUp';
var blocked = false;
var blocked2 = false;
var t1;
var beeped = false;
var audio = new Audio();
	audio.src = '/app/audio/beep.mp3';
//var socket = io();



/********** SOCKET SETUP & LISTENERS **********/
//RICH
var s1 = new $socket({
	url: 'http://www.prrple.com:8889',
	listeners: [
		{
			method: 'kerve_response',
			func: function(response){
				console.log('--- response ---');
				console.log(response);
				if(response=='beerpumpLoading'){
					//LOADING
					show_page('page_2');
				}else if(response=='beerpumpCard'){
					//SHOW CARD READER
					show_page('page_3');
					// show the lighs on the card reader
					s2.send('interfaceController', 'makePayment');
				}else if(response=='beerpumpProcessing'){
					//PROCESSING
					show_page('page_4');
					if(!beeped){
						audio.play();
					}
					beeped = true;
				}else if(response=='beerpumpSuccess' || response=='beerpumpSignature'){
					//THANKS
					//show_page('page_5');
					show_page('page_6');
					s2.send('interfaceController', 'placeBeerBelow');
				}else if(response=='beerpumpRetry'){
					//TRY ANOTHER CARD
					show_page('page_9');
				}else if(response=='beerpumpDeclined'){
					//DECLINED
					show_page('page_10');
				}else if(response=='beerpumpFail' || response=='beerpumpInsert'){
					//ERROR
					show_page('page_11');
				}else if(response=='beerpumpReset'){
					//RESET
					show_page('page_1');
				}else if(response=='beerpumpRefresh'){
					//REFRESH BROWSER
					window.location.reload();
				};
			}
		}
	]
});
//JAMES
var s2 = new $socket({
	url: window.location.protocol+'//'+window.location.hostname+':3000',
	listeners: [
		{
			method: 'interfaceController',
			func: function(msg){
				//update the status of what the beer pump is currently doing
				pintStatus = msg;
				//handle status
				if(pintStatus == 'pintPoured'){
					if(page=='page_8'){
						console.log('received from James - pintPoured - user cancelled, show home page');
						//cancelled - go to home
						show_page('page_1');
					}else{
						console.log('received from James - pintPoured - show thanks page');
						//thank you page
						show_page('page_12');
						setTimeout(function(){
							//home page
							show_page('page_1');
						},4000);
					}
				}
				else if(pintStatus == 'cancelPint'){
					console.log('received from James - cancelPint - show home page');
					//home page
					show_page('page_1');
				}
				else if(pintStatus == 'cleaningPipes'){
					console.log('received from James - cleaningPipes - show home page');
					//home page
					show_page('page_1');
				}
			}
		},
		{
			method: 'beerReader',
			func: function(beerHeight){
				//display it on the admin page
				$("#beerheight").html(beerHeight + "ml");
			}
		},
		{
			method: 'beerAdmin',
			func: function(response){
				console.log('received from James - beerAdmin - '+response);
				if(response=='refresh'){
					//REFRESH BROWSER
					window.location.reload();
				}else if(response=='barclays_logo'){
					//SHOW LOGO
					show_page('page_bar');
				}else if(response=='reset_pump'){
					//BEER PUMP RESET
					show_page('page_1');
				}
			}
		}
		/*{
			method: 'beerSettings',
			func: function(beerValue){
				//display it on the admin page
				$( "input:first" ).val(beerValue);
				//display a message telling the user that the new value has been submitted
				$( "#result" ).text( "Submitted!" ).show().fadeOut( 5000 );
			}
		}*/
	]
});



/********** PAGE **********/
function show_page(id){
	console.log('--- page - '+id+' ---');
	$('.page').hide();
	$('#'+id).show();
	if(id=='page_1' && page!='page_1'){
		slider_reset();
	}
	page = id;
	clearTimeout(t1);
	if(id=='page_1'){
		beeped = false;
		//reset lights & pump
		socket.emit('interfaceController', 'reset');
    	socket.emit('pumpSwitcher', 'cancelPint');
	}
	if(id=='page_5'){
		t1 = setTimeout(function(){
			show_page('page_6');
			s2.send('interfaceController', 'placeBeerBelow');
		},4000);
	}
}



/********** SLIDER **********/
var slide = 1;
var slider_total = 7;
var slider_interval;
var slider_time_fade = 500;
var slider_time_pause = 2000;
function slider_reset(){
	clearInterval(slider_interval);
	slide = 1;
	$('.slide').stop(true,true).css('opacity',0);
	$('.slide1').css('opacity',1);
	slider_interval = setInterval(function(){
		slider_run();
	},(slider_time_pause + slider_time_fade));
}
function slider_run(){
	if(slide<slider_total){
		slide++;
		$('.slide'+slide).stop(true,true).animate({
			opacity:1
		},slider_time_fade);
	}else{
		slide = 1;
		$('.slide:not(.slide'+slider_total+')').stop(true,true).css('opacity',0);
		$('.slide1').stop(true,true).css('opacity',1);
		$('.slide'+slider_total).stop(true,true).animate({
			opacity:0
		},slider_time_fade);
	}
}
slider_reset();



/********** CLICK EVENTS **********/
$(function(){
	if(window.location.hostname!='localhost2'){
		$('#admin').show();
	}
	//SOUNDS
	$('body').on('click touchstart','#btn_sounds',function(){
		audio.play();
		$(this).hide();
		return false;
	});
	//START
	$('body').on('click touchstart','#page_1',function(){
		blocker();
		$('#btn_sounds').hide();
		s1.send('kerve','beerpumpPay');
		// start showing the light on the card reader
		return false;
	});
	//PINT - POUR
	$('body').on('click touchstart','.btn_pour',function(){
		if(!blocked){
			console.log('POUR');
			blocker(1000);
			show_page('page_7');
			pint_pour();
		}
		return false;
	});
	//PINT - STOP
	$('body').on('click touchstart','.btn_stop',function(){
		if(!blocked){
			console.log('STOP');
			blocker();
			show_page('page_8');
			pint_stop();
		}
		return false;
	});
	//PINT - CANCEL
	$('body').on('click touchstart','.btn_cancel',function(){
		if(!blocked2){
			console.log('CANCEL');
			blocker();
			//show_page('page_1');
			pint_stop();
		}
		return false;
	});
	//PINT - CONTINUE
	$('body').on('click touchstart','.btn_continue',function(){
		if(!blocked){
			console.log('CONTINUE');
			blocker(1000);
			show_page('page_7');
			pint_pour();
		}
		return false;
	});
	//RESTART
	$('body').on('click touchstart','.btn_restart',function(){
		blocker();
		show_page('page_1');
		return false;
	});
});



/********** EVENT BLOCKER **********/
function blocker(t){
	blocked = true;
	blocked2 = true;
	if(typeof(t)==='undefined'){
		t = 3000;
	}
	setTimeout(function(){
		blocked = false;
	},t);
	setTimeout(function(){
		blocked2 = false;
	},1000);
}



/********** POUR / CANCEL FUNCTIONS **********/
function pint_pour(){
	console.log('pint_pour',pintStatus);
	//if the beer pump isn't currently pouring to clean out the pipes
	if(pintStatus != 'cleaningPipes'){
		//emit socket to back end saying that the pint is pouring
		s2.send('interfaceController', 'pintPouring');
		//emit socket to open valve
		s2.send('pumpSwitcher', 1);
	}
}
function pint_stop(){
	console.log('pint_stop',pintStatus);
	//emit socket to close the valve
	s2.send('pumpSwitcher', 0);
	//if the beer was pouring when stop button was clicked
	if(pintStatus == 'pintPouring'){
		//emit socket to back end saying that the beer flow is in a paused state
		s2.send('interfaceController', 'pintPaused');
	}
	//if the pump has just started up, was paused or is currently cleaning the pipes
	if(pintStatus == 'pintPaused' || pintStatus == 'startUp' || pintStatus == 'cleaningPipes') {
		//emit two sockets to the back end saying that the pint has been cancelled
		s2.send('interfaceController', 'cancelPint');
		s2.send('pumpSwitcher', 'cancelPint');
	}
}
