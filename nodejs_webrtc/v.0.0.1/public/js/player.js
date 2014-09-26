(function($){

  //World
  var cWidth = 400, cHeight = 400;
  var paper, listener;
  // 3D sounds
  // Temporary patch until all browsers support unprefixed context.
  if (window.hasOwnProperty('AudioContext') && !window.hasOwnProperty('webkitAudioContext'))
      window.webkitAudioContext = AudioContext;

  window.URL = window.URL || window.webkitURL;

  //var context ;
  var buffer;
  var convolver;
  var panners = {};
  //var source;
  var dryGainNode;
  var wetGainNode;
  //var lowFilter;
  var gTopProjection = 0;
  var gFrontProjection = 0;

  var x = 0;
  var y = 0;
  var z = 0;
  var hilightedElement = 0;
  var bufferList;

  var fileCount = 8;
  var fileList = [
      //"sound/hyper-reality/white-noise.wav",
      "sound/human-voice.mp4",
  ];

  var kInitialReverbLevel = 0.6;

  $( document ).ready(function() {
      //Init screen size
      $('.main').hide();

      $('.login').css({
          'width': $(window).width(),
          'height': $(window).height(),
      });

      $('.main').css({
          'width': $(window).width(),
          'height': $(window).height(),
      });

      $('.loginbox').hide();
      $('.progress').html("Connecting to the server...");



      init();

      var connection = new RTCMultiConnection();
      connection.session = {
          audio: true,
      };
      //connection.userid = null;
      connection.channel = 'hawaii';
      connection.sessionid = 'room';
      connection.preventSSLAutoAllowed = false;
      connection.autoReDialOnFailure = true;

      //connection.dontCaptureUserMedia = true;


      // onstream event; fired both for local and remote videos
      //var numberOfRemoteAudios = 0;
      connection.onstream = function (e) {
          if (e.type == 'local') {
              //var newAudio = e.mediaElement;
              //$('#iaudios').append(newAudio);
              //newAudio.muted = true;
              //gotStream(e.stream);
              addPanner(e.streamid, e.stream,1);
          }
          if (e.type == 'remote') {
            // browser bug P1: createMediaStreamSource cannot process remote stream data
            //var newAudio = e.mediaElement;
            //$('#iaudios').append('<audio id="'+e.streamid+'" src="'+ e.blobURL+'" controls=""></audio>');
            //newAudio.autoplay = false;
            //console.log("Addpanner Streamid:"+e.streamid);
            //addPanner(e.streamid, e.stream,1);
            //newAudio.muted = true;

            //var audioElement = document.getElementById(e.streamid);
            //audioElement.muted = true;

            //audioElement.addEventListener("canplay", function() {
              //console.log("Oh my god");
              addPanner(e.streamid, audioElement,0);
            //});
          };
      };

      // connection.onstreamended = function(e){
      //     removePanner(e.streamid);
      // }

      //mainSocket.emit('addUser', _username);

      //socket.io connect to the server
      var sessions = { };

      connection.onNewSession = function(session) {
          console.log("onNewSession: "+session.sessionid);

          if (sessions[session.sessionid]) return;
          sessions[session.sessionid] = session;

          $('.loginbox').fadeIn(200);
          $('.progress').hide();


          $('.loginbox button').on('click',function(e){
              e.preventDefault();
              var _username = $('#username').val();
              if(_username){
                    console.log("Connecting session: "+session.sessionid);
                    connection.join(session);
                //update UI
                $('.login').hide();
                $('.main').show();
                $('.welcome').html('Now, close your eyes <strong>'+ _username + '</strong> ...');

              }else{

                $('#username').css({
                  'background':'#fcde93',
                });
              }
          })
      };

      //Set up the signaling channel
      var SIGNALING_SERVER = 'http://130.239.233.60:8888/'; //important! set it to absolute path
      connection.openSignalingChannel = function (config) {
         var channel = config.channel || this.channel;
         var sessionid = config.sessionid || this.sessionid;
         console.log("Channel: "+channel + " - Sessionid: "+sessionid);
         var sender = Math.round(Math.random() * 9999999999) + 9999999999;

         io.connect(SIGNALING_SERVER).emit('new-channel', {
            channel: channel,
            sender : sender
         });

         var socket = io.connect(SIGNALING_SERVER + channel);
         socket.channel = channel;

         socket.on('connect', function () {
            if (config.callback) config.callback(socket);
         });

         socket.send = function (message) {
              socket.emit('message', {
                  sender: sender,
                  data  : message
              });
          };

         socket.on('message', config.onmessage);
      };

      connection.connect();

  });



  $( window ).resize(function() {
      $('.login').css({
          'width': $(window).width(),
          'height': $(window).height(),
      });

      $('.main').css({
          'width': $(window).width(),
          'height': $(window).height(),
      });
  });




/************************
Virtual Sound Fuctions
************************/

  function setReverbImpulseResponse(url) {
      // Load impulse response asynchronously
      var request = new XMLHttpRequest();
      request.open("GET", url, true);
      request.responseType = "arraybuffer";

      request.onload = function() {
          context.decodeAudioData(
              request.response,
              function(buffer) {
                  convolver.buffer = buffer;
              },

              function(buffer) {
                  console.log("Error decoding impulse response!");
              }
          );
      }

      request.send();
  }

  function mixToMono(buffer) {
      if (buffer.numberOfChannels == 2) {
          var pL = buffer.getChannelData(0);
          var pR = buffer.getChannelData(1);
          var length = buffer.length;

          for (var i = 0; i < length; ++i) {
              var mono = 0.5 * (pL[i] + pR[i]);
              pL[i] = mono;
              pR[i] = mono;
          }
      }
  }

  // *need modify
  function setAudioSource(i) {
      var buffer = bufferList[i];

      // See if we have cached buffer
      if (buffer) {
          source.buffer = buffer;
      } else {
          // Load asynchronously
          var url = fileList[i];

          var request = new XMLHttpRequest();
          request.open("GET", url, true);
          request.responseType = "arraybuffer";

          request.onload = function() {
              context.decodeAudioData(
                  request.response,
                  function(buffer) {
                      mixToMono(buffer);
                      source.buffer = buffer;
                      bufferList[i] = buffer;  // cache it
                  },

                  function(buffer) {
                      console.log("Error decoding audio source data!");
                  }
              );
          }

          request.send();
      }
  }


  // *need modify
  function pitchHandler(event, ui) {
      var cents = ui.value;
      var info = document.getElementById("pitch-value");
      info.innerHTML = "pitch = " + cents + " cents";

      var rate = Math.pow(2.0, cents / 1200.0);
      source.playbackRate.value = rate;
  }

  function reverbHandler(event, ui) {
      var value = ui.value;
      var info = document.getElementById("ambience-value");
      info.innerHTML = "ambience = " + value;

      wetGainNode.gain.value = value;
  }

  function influenceHandler(event, ui) {
      var value = ui.value;
      var info = document.getElementById("influence-value");
      info.innerHTML = "reverb main gain influence = " + value;
  }

  function mainGainHandler(event, ui) {
      var value = ui.value;
      var info = document.getElementById("mainGain-value");
      info.innerHTML = "main gain = " + value;

      dryGainNode.gain.value = value;
  }

  function cutoffHandler(event, ui) {
      var value = ui.value;
      var noctaves = Math.log(22050.0 / 40.0) / Math.LN2;
      var v2 = Math.pow(2.0, noctaves * (value - 1.0));

      var sampleRate = 44100.0;
      var nyquist = sampleRate * 0.5;
      var frequency = v2 * nyquist;
      var info = document.getElementById("cutoff-value");

      info.innerHTML = "cutoff = " + frequency + " hz";

      lowFilter.frequency.value = frequency;
  }

  function addSliders() {
      addSlider("pitch");
      addSlider("ambience");
      addSlider("mainGain");
      addSlider("cutoff");
      configureSlider("pitch", 0.0, -2400.0, 2400.0, pitchHandler);
      configureSlider("ambience", kInitialReverbLevel, 0.0, 1.0, reverbHandler);
      configureSlider("mainGain", 1.0, 0.0, 1.0, mainGainHandler);
      configureSlider("cutoff", 0.99, 0.0, 1.0, cutoffHandler);
  }

  // *need modify
  // function setSourceBuffer(buffer) {
  //     source.buffer = buffer;
  // }


  function init() {
      // addSliders();


       paper = Raphael("world", cWidth, cHeight);
       paper.clear();
       paper.rect(0, 0, cWidth, cHeight, 4).attr({fill: "#fff", stroke: "none"});

       //add listener
       listener = paper.circle(cWidth/2, cHeight/2, 10).attr({fill:"#333"});

       // Initialize audio
       context = new AudioContext();

       initConnections();
   }

  var dragger = function () {
        this.ox = this.type == "rect" ? this.attr("x") : this.attr("cx");
        this.oy = this.type == "rect" ? this.attr("y") : this.attr("cy");

        this.animate({"fill-opacity": .5}, 500);
  };

  var move = function (dx, dy) {
            var att = this.type == "rect" ? {x: this.ox + dx, y: this.oy + dy} : {cx: this.ox + dx, cy: this.oy + dy};
            this.attr(att);

            var a = (this.ox + dx) / cWidth;
            var b = (this.oy + dy) / cHeight;

            var _x = 8.0 * (2.0*a - 1.0);
            var _y = -11.0 * (2.0*b - 1.0);

            console.log(this.node.id + ' is moving: ' + _x +'/'+ _y);
            panners[this.node.id].setPosition(_x, _y, 0);

            //paper.safari();
  };

  var up = function () {
            this.animate({"fill-opacity": 1}, 500);
  };

  function removePanner(streamid){
      //remove connections
      //to do: what about _source and _ lowFilter?
      var _panner = panners[streamid];
      _panner.disconnect(0);

      //remove from panners object
      delete panners[streamid];

      //remove from UI
      $('#'+streamid).remove();

  }

  function addPanner(streamid, stream,local){
      console.log("Adding new panner into secene." + streamid);
      var _input;

      if(local){
          _input = context.createMediaStreamSource(stream);
      }else{
          _input = context.createMediaElementSource(stream);
      }

      var _source = convertToMono(_input);

      var _lowFilter = context.createBiquadFilter();
      _lowFilter.frequency.value = 22050.0;
      _lowFilter.Q.value = 5.0;
      //_lowFilter.gain.value = 1;

      var _panner = context.createPanner();
      if (panners[streamid]) return;
      panners[streamid] = _panner;


      //make new connections
      // Connect audio processing graph
      _source.connect(_lowFilter);
      _lowFilter.connect(_panner);
      //_source.connect(_panner);

      _panner.connect(dryGainNode);
      _panner.connect(convolver);
      //_panner.connect(context.destination);

      //init positions
      var _x = randomInt(cWidth);
      var _y = randomInt(cHeight);


      var newDot = paper.circle(_x,_y,10).attr({fill:"#FF9900",stroke:"none"});
      newDot.node.id = streamid;
      newDot.drag(move, dragger, up);

      var a = _x / cWidth;
      var b = _y / cHeight;

      _x = 8.0 * (2.0*a - 1.0);
      _y = -11.0 * (2.0*b - 1.0);

      _panner.setPosition(_x, _y, 0);

  }
  function randomInt(num){
    return Math.floor((Math.random() * num) + 1);
  }

  function initConnections(){
     //console.log("Converting to 3D...");
     //var input = context.createMediaStreamSource(stream);
     //source = convertToMono(input);
     //var context = new AudioContext()

    //  var volume = context.createGain();
    //  volume.connect(context.destination);
    //  volume.gain.value = 0;

     dryGainNode = context.createGain();
     wetGainNode = context.createGain();
     //panner = context.createPanner();

     //lowFilter = context.createBiquadFilter();
     //lowFilter.frequency.value = 22050.0;
     //lowFilter.Q.value = 5.0;

     convolver = context.createConvolver();

     // Connect audio processing graph
     //source.connect(lowFilter);
     //lowFilter.connect(panner);

     // Connect dry mix
     //panner.connect(dryGainNode);
     dryGainNode.connect(context.destination);

     // Connect wet mix
     //panner.connect(convolver);
     convolver.connect(wetGainNode);
     wetGainNode.connect(context.destination);
     wetGainNode.gain.value = kInitialReverbLevel;

    //  bufferList = new Array(fileCount);
    //  for (var i = 0; i < fileCount; ++i) {
    //      bufferList[i] = 0;
    //  }

     setReverbImpulseResponse('./sound/impulse-responses/spatialized1.wav');

     //source.playbackRate.value = 1.0;

     //source.loop = true;

     // Load up initial sound
     //setAudioSource(0);
     context.listener.setPosition(0, 0, 0);

  }

  function convertToMono( input ) {
    console.log("Monoing...");
    var splitter = context.createChannelSplitter(2);
    var merger = context.createChannelMerger(2);

    input.connect( splitter );
    splitter.connect( merger, 0, 0 );
    splitter.connect( merger, 0, 1 );
    return merger;
  }


})(jQuery);
