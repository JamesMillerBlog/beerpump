


var $socket = function(opts){
	
	
	/******************** CONFIG ********************/
	var $this = this;
	this.options = {
		url: 'http://localhost:8081', //socket path
		reconnect: true, //attempt to automatically reconnect?
		status_id: 'socket_status', //id of status indicator div
		debug_show: false, //output debug html
		debug_id: 'socket_debug',
		error_id: 'socket_error',
		room: null,
		listeners: []
	};
	
	
	/******************** DATA STORAGE ********************/
	this.s = null;
	this.active = false;
	
	
	/******************** INIT ********************/
	this.init = function(){
		console.log('%c--- socket init ---','color:#0097c9;');
		if(typeof(io)!=='undefined'){
			//CONNECT
			this.s = io.connect(this.options.url, {
				timeout: 5000
			});
			//CONNECT CALLBACK
			this.s.on('connect', function(){
				
				//beerpump
				try{
					show_page('page_1');
				}catch(e){};
				
				console.log('%c--- socket connected ---','color:#0097c9;');
				$this.active = true;
				$('#'+$this.options.error_id).hide();
				$('#'+$this.options.status_id).removeClass('green orange').addClass('green');
				$this.debug('Socket Connected');
				//join room
				if($this.options.room!=null){
					$this.s.emit('join','server');
				};
			});
			//ERROR CALLBACK
			this.s.on('error', function(){
				
				//beerpump
				try{
					show_page('page_error');
				}catch(e){};
				
				console.log('%c--- socket error ---','color:#0097c9;');
				$this.active = false;
				$('#'+$this.options.error_id).show();
				$('#'+$this.options.status_id).removeClass('green orange');//.addClass('orange');
				$this.debug('Socket Error');
				$this.reinit();
			});
			//DISCONNECT CALLBACK
			this.s.on('disconnect', function(){
				
				//beerpump
				try{
					show_page('page_error');
				}catch(e){};
				
				console.log('%c--- socket disconnected ---','color:#0097c9;');
				$this.active = false;
				$('#'+$this.options.error_id).show();
				$('#'+$this.options.status_id).removeClass('green orange');//.addClass('orange');
				$this.debug('Socket Disconnected');
				$this.reinit();
			});
			//LISTEN
			this.listen();
		}else{
			console.log('%c--- socket not available ---','color:#0097c9;');
			$('#'+this.options.error_id).show();
			$('#'+this.options.status_id).removeClass('green orange');//.addClass('orange');
			this.debug('Socket Not Available');
		};
	};
	this.reinit = function(){
		if(this.options.reconnect == true){
			setTimeout(function(){
				if($this.active==false){
					console.log('--- socket reinit ---','color:#0097c9;');
					$this.s.socket.connect();
				};
			},2000);
		};
	};
	
	
	/******************** DEBUG ********************/
	this.debug = function(text){
		if(this.options.debug_show == true){
			$('#'+this.options.debug_id).text(text);
		};
	};
	
	
	/******************** PING ********************/
	this.ping = function(){
		if(this.active == true){
			this.s.emit('ping', {});
		};
	};
	
	
	/******************** CLOSE ********************/
	this.close = function(){
		this.send('close',{});
	};
	
	
	/******************** SEND ********************/
	this.send = function(method,d){
		if(this.active == true){
			this.s.emit(method,d);
		};
	};
	
	
	/******************** LISTEN ********************/
	this.listen = function(){
		//STANDARD
		this.s.on('init', function(response) {
			console.log('%c--- received init ---','color:#0097c9;');
		});
		this.s.on('ping', function(response) {
			console.log('%c--- received ping ---','color:#0097c9;');
		});
		this.s.on('close', function(response) {
			console.log('%c--- socket closed ---','color:#0097c9;');
			this.active = false;
			this.debug('Socket Closed');
		});
		//CUSTOM
		if(typeof(this.options.listeners)==='object' || typeof(this.options.listeners)==='object'){
			for(var i in this.options.listeners){
				this.listen_add(this.options.listeners[i]);
			};
		};
	};
	this.listen_add = function(l){
		this.s.on(l.method, function(response){
			l.func(response);
		});
	};
	
	
	/******************** INIT ********************/
	if(typeof(opts)==='object'){
		$.extend(this.options,opts);
	};
	this.init();
	
	
};


