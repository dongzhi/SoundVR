(function($) {

$(document).ready(function() {


// initializing the constructor
// 1 connection = 1room
// todo: limit the access to admin
var connection = new RTCMultiConnection();

// some booleans to override defaults
connection.preventSSLAutoAllowed = false;
connection.autoReDialOnFailure = true;
connection.setDefaultEventsForMediaElement = false;

var connection = new RTCMultiConnection();
connection.session = {
    audio: true,
    video: false,
};
connection.userid = 'admin';
connection.channel = 'hawaii';
connection.sessionid = 'room1';

// setting type of media connection
connection.isInitiator = true;
//connection.dontCaptureUserMedia = true;
connection.maxParticipantsAllowed = 256;


// DOM objects
var localVideo = document.getElementById('localVideo');
var miniVideo = document.getElementById('miniVideo');
var remoteVideo = document.getElementById('remoteVideo');
var card = document.getElementById('card');
var containerDiv;


var RTCPeerConnection = null;
var getUserMedia = null;
var attachMediaStream = null;
var reattachMediaStream = null;
var webrtcDetectedBrowser = null;
var webrtcDetectedVersion = null;

if (navigator.mozGetUserMedia) {
  console.log("This appears to be Firefox");
} else if (navigator.webkitGetUserMedia) {
  console.log("This appears to be Chrome");
  webrtcDetectedBrowser = "chrome";
  webrtcDetectedVersion =
        parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2]);


  // The RTCPeerConnection object.
  RTCPeerConnection = webkitRTCPeerConnection;


  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);


  // Attach a media stream to an element.
  attachMediaStream = function (element, stream) {
        if (typeof element.srcObject !== 'undefined') {
            element.srcObject = stream;
        } else if (typeof element.mozSrcObject !== 'undefined') {
            element.mozSrcObject = stream;
        } else if (typeof element.src !== 'undefined') {
            element.src = URL.createObjectURL(stream);
        } else {
            console.log('Error attaching stream to element.');
        }
  };

  reattachMediaStream = function (to, from) {
        to.src = from.src;
  };


  // The representation of tracks in a stream is changed in M26.
    // Unify them for earlier Chrome versions in the coexisting period.
    if (!webkitMediaStream.prototype.getVideoTracks) {
        webkitMediaStream.prototype.getVideoTracks = function () {
            return this.videoTracks;
        };
        webkitMediaStream.prototype.getAudioTracks = function () {
            return this.audioTracks;
        };
    }

    // New syntax of getXXXStreams method in M26.
    if (!webkitRTCPeerConnection.prototype.getLocalStreams) {
        webkitRTCPeerConnection.prototype.getLocalStreams = function () {
            return this.localStreams;
        };
        webkitRTCPeerConnection.prototype.getRemoteStreams = function () {
            return this.remoteStreams;
        };
    }
} else {
    console.log("Browser does not appear to be WebRTC-capable");
}



connection.onstream = function (e) {
    // if (e.type == 'local') {
    //     var newAudio = e.mediaElement;
    //     $('#audios').append(newAudio);
    //     newAudio.muted = true;
    // }

    if (e.type == 'remote') {
      //numberOfRemoteAudios++;
      var newAudio = e.mediaElement;
      $('#audios').append(newAudio);
      newAudio.muted = false;
    };
};

// Todo: create rooms
/*
var sessions = { };

connection.onNewSession = function(session) {
    if (sessions[session.sessionid]) return;
    sessions[session.sessionid] = session;

    var tr = document.createElement('tr');
    tr.innerHTML = '<td><strong>' + session.extra['session-name'] + '</strong> is running a conference!</td>' +
                        '<td><button class="join">Join</button></td>';
    roomsList.insertBefore(tr, roomsList.firstChild);

    var joinRoomButton = tr.querySelector('.join');
    joinRoomButton.setAttribute('data-sessionid', session.sessionid);
    joinRoomButton.onclick = function() {
    this.disabled = true;

    var sessionid = this.getAttribute('data-sessionid');
    session = sessions[sessionid];

    if (!session) throw 'No such session exists.';
            connection.join(session);
    };
};
*/

// if user left
connection.onleave = function (e) {
    // var video = document.getElementById(e.userid);
    //
    // if (numberOfRemoteAudios == 1) {
    //     transitionToWaiting();
    // } else if (video && video.parentNode && video.parentNode.parentNode) {
    //     numberOfRemoteAudios--;
    //     video.parentNode.parentNode.removeChild(video.parentNode);
    // }
};

//init();


// Copy and use below code in any RTCMultiConnection based demo
// You can even use it with DataChannel.js
// You can even use it with other experiments; simply replace
// "openSignalingChannel" with:
// var config = { openSocket: openSignalingChannel };

// via: https://github.com/muaz-khan/WebRTC-Experiment/tree/master/socketio-over-nodejs#how-to-use
var SIGNALING_SERVER = 'http://127.0.0.1:8888/';
var mainSocket = io.connect(SIGNALING_SERVER);

connection.openSignalingChannel = function(config) {
   config.channel = config.channel || this.channel;
   console.log(config.channel);
   var sender = Math.round(Math.random() * 999999999) + 999999999;

   mainSocket.emit('new-channel', {
      channel: config.channel,
      sender : sender
   });

   var socket = io.connect(SIGNALING_SERVER + config.channel);
   socket.channel = config.channel;

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



// via https://github.com/muaz-khan/WebRTC-Experiment/tree/master/socketio-over-nodejs#presence-detection
mainSocket.on('presence', function (isChannelPresent) {
    console.log('is channel present', isChannelPresent);

    if (!isChannelPresent)
        connection.open(connection.channel); // open new room
    else
        connection.join(connection.channel); // join existing room
});

mainSocket.emit('presence', connection.channel);


mainSocket.on('connect', function (){
        mainSocket.on('users', function (data) {
          $('#users').html('<div><strong>Online Users:</strong><br/>'+ data.users +'</div>');
        });

        mainSocket.on('channels', function (data) {
          $('#channels').html('<div><strong>Channels:</strong><br/>'+ data.channels +'</div>');
        });

        mainSocket.on('disconnect', function (data) {
          $('#users').html('');
          $('#channels').html('');
        });
})

});


  /*

  // Temporary patch until all browsers support unprefixed context.
  if (window.hasOwnProperty('AudioContext') && !window.hasOwnProperty('webkitAudioContext'))
      window.webkitAudioContext = AudioContext;
  var context;
  var buffer;
  var convolver;
  var panner;
  var source;
  var dryGainNode;
  var wetGainNode;

  var lowFilter;

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

  function highlightElement(object) {
      if (hilightedElement) hilightedElement.style.backgroundColor = "white";
      hilightedElement = object;

      object.style.backgroundColor = "green";
  }

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

  function setSourceBuffer(buffer) {
      source.buffer = buffer;
  }


   function init() {
       addSliders();

       var canvas = document.getElementById('canvasID');
       var canvas2 = document.getElementById('canvasElevationID');

       var ctx = canvas.getContext('2d');
       var ctx2 = canvas2.getContext('2d');

       gTopProjection = new Projection('canvasID', 0);
       gFrontProjection = new Projection('canvasElevationID', 1);

       // draw center
       var width = canvas.width;
       var height = canvas.height;

       ctx.fillStyle = "rgb(0,200,0)";
       ctx.beginPath();
       ctx.arc(width/2, height/2 , 10, 0,Math.PI*2,true)
       ctx.fill();

       ctx2.fillStyle = "rgb(0,200,0)";
       ctx2.beginPath();
       ctx2.arc(width/2, height/2 , 10, 0,Math.PI*2,true)
       ctx2.fill();

       canvas.addEventListener("mousedown", handleMouseDown, true);
       canvas.addEventListener("mousemove", handleAzimuthMouseMove, true);
       canvas.addEventListener("mouseup", handleMouseUp, true);

       canvas2.addEventListener("mousedown", handleMouseDown, true);
       canvas2.addEventListener("mousemove", handleElevationMouseMove, true);
       canvas2.addEventListener("mouseup", handleMouseUp, true);

       // Initialize audio
       context = new webkitAudioContext();


       if (!navigator.getUserMedia)
          navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
       if (!navigator.getUserMedia)
          return(alert("Error: getUserMedia not supported!"));

        navigator.getUserMedia({audio: true}, gotStream, function(e) {
            alert('Error getting audio');
            console.log(e);
        });
   }

  var gIsMouseDown = false;

  function gotStream(stream){
    var input = context.createMediaStreamSource(stream);
     source = convertToMono(input);
     //source = context.createBufferSource();

     dryGainNode = context.createGain();
     wetGainNode = context.createGain();
     panner = context.createPanner();

     lowFilter = context.createBiquadFilter();
     lowFilter.frequency.value = 22050.0;
     lowFilter.Q.value = 5.0;

     convolver = context.createConvolver();

     // Connect audio processing graph
     source.connect(lowFilter);
     lowFilter.connect(panner);

     // Connect dry mix
     panner.connect(dryGainNode);
     dryGainNode.connect(context.destination);

     // Connect wet mix
     panner.connect(convolver);
     convolver.connect(wetGainNode);
     wetGainNode.connect(context.destination);
     wetGainNode.gain.value = kInitialReverbLevel;

     bufferList = new Array(fileCount);
     for (var i = 0; i < fileCount; ++i) {
         bufferList[i] = 0;
     }

     setReverbImpulseResponse('sound/spatialized3.wav');

     source.playbackRate.value = 1.0;

     panner.setPosition(0, 0, -4.0);
     source.loop = true;

     // Load up initial sound
     setAudioSource(0);

     var cn = {x: 0.0, y: -0.5};
     gTopProjection.drawDotNormalized(cn);

     cn.y = 0.0;
     gFrontProjection.drawDotNormalized(cn);

     var currentTime = context.currentTime;
     source.start(currentTime + 0.020);
  }

  function convertToMono( input ) {
    var splitter = context.createChannelSplitter(2);
    var merger = context.createChannelMerger(2);

    input.connect( splitter );
    splitter.connect( merger, 0, 0 );
    splitter.connect( merger, 0, 1 );
    return merger;
}

  // type: 0: top-view  1: front-view
  function Projection(canvasID, type) {
      this.canvasID = canvasID;
      this.canvas = document.getElementById(canvasID);
      this.type = type;
      this.lastX = 0;
      this.lastY = 0;
  }

  // With normalized graphics coordinate system (-1 -> 1)
  Projection.prototype.drawDotNormalized = function(cn) {
      var c = {
          x: 0.5 * (cn.x + 1.0) * this.canvas.width,
          y: 0.5 * (cn.y + 1.0) * this.canvas.height
      }

      this.drawDot(c);
  }

  Projection.prototype.handleMouseMove = function(event, suppressY) {
      if (gIsMouseDown) {
          var eventInfo = {event: event, element:this.canvas};
          var c = getRelativeCoordinates(eventInfo);
          if (suppressY) {
              c.y = this.lastY;
          }
          this.drawDot(c);
      }
  }

  Projection.prototype.eraseLastDot = function() {
      var ctx = this.canvas.getContext('2d');

      // Erase last location
      ctx.fillStyle = "rgb(255,255,255)";
      ctx.beginPath();
      ctx.arc(this.lastX, this.lastY, 12, 0, Math.PI * 2, true)
      ctx.fill();
  }

  Projection.prototype.drawDot = function(c) {
      var canvas = this.canvas;
      var type = this.type;

      var ctx = canvas.getContext('2d');

      // Erase last location
      this.eraseLastDot();

      // Draw new location
      ctx.fillStyle = "rgb(200,0,0)";
      ctx.beginPath();
      ctx.arc(c.x, c.y, 10,0, Math.PI * 2, true);
      ctx.fill();

      // Draw center
      var width = canvas.width;
      var height = canvas.height;
      divWidth = width;
      divHeight = height;

      ctx.fillStyle = "rgb(0,200,0)";
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 , 10, 0, Math.PI * 2, true);
      ctx.fill();

      ctx.strokeRect(0,0, width, height);

      this.lastX = c.x;
      this.lastY = c.y;

      var a = c.x / divWidth;
      var b = c.y / divHeight;

      x = 8.0 * (2.0*a - 1.0);

      if (type == 0) {
          z = 8.0 * (2.0*b - 1.0);
      } else {
          y = -11.0 * (2.0*b - 1.0);
      }

      panner.setPosition(x, y, z);

      lastX = x;
      lastZ = z;
  }

  function handleMouseDown(event) {
      gIsMouseDown = true;
  }

  function handleMouseUp(event) {
      gIsMouseDown = false;
  }

  function handleAzimuthMouseMove(event) {
      gTopProjection.handleMouseMove(event, false);
      gFrontProjection.handleMouseMove(event, true);
  }

  function handleElevationMouseMove(event) {
      gFrontProjection.handleMouseMove(event, false);
      gTopProjection.handleMouseMove(event, true);
  }

  */

})(jQuery);


function getElementCoordinates(element, event) {
    var c = getAbsolutePosition(element);
    c.x = event.x - c.x;
    c.y = event.y - c.y;

    var position = c;

    // This isn't the best, should abstract better.
    if (isNaN(c.y)) {
        var eventInfo = {event:event, element:element};
        position = getRelativeCoordinates(eventInfo);
    }

    return position;
}

function getAbsolutePosition(element) {
  var r = { x: element.offsetLeft, y: element.offsetTop };
  if (element.offsetParent) {
    var tmp = getAbsolutePosition(element.offsetParent);
    r.x += tmp.x;
    r.y += tmp.y;
  }
  return r;
};


function getRelativeCoordinates(eventInfo, opt_reference) {
    var x, y;
    var event = eventInfo.event;
    var element = eventInfo.element;
    var reference = opt_reference || eventInfo.element;
    if (!window.opera && typeof event.offsetX != 'undefined') {
      // Use offset coordinates and find common offsetParent
      var pos = { x: event.offsetX, y: event.offsetY };
      // Send the coordinates upwards through the offsetParent chain.
      var e = element;
      while (e) {
        e.mouseX = pos.x;
        e.mouseY = pos.y;
        pos.x += e.offsetLeft;
        pos.y += e.offsetTop;
        e = e.offsetParent;
      }
      // Look for the coordinates starting from the reference element.
      var e = reference;
      var offset = { x: 0, y: 0 }
      while (e) {
        if (typeof e.mouseX != 'undefined') {
          x = e.mouseX - offset.x;
          y = e.mouseY - offset.y;
          break;
        }
        offset.x += e.offsetLeft;
        offset.y += e.offsetTop;
        e = e.offsetParent;
      }
      // Reset stored coordinates
      e = element;
      while (e) {
        e.mouseX = undefined;
        e.mouseY = undefined;
        e = e.offsetParent;
      }
    } else {
      // Use absolute coordinates
      var pos = getAbsolutePosition(reference);
      x = event.pageX - pos.x;
      y = event.pageY - pos.y;
    }
    // Subtract distance to middle
    return { x: x, y: y };
  };




  function addSlider(name) {
    var controls = document.getElementById("controls");

    var divName = name + "Slider";


    var sliderText = '<div style="width:500px; height:20px;"> <input id="' + divName + '" '
     + 'type="range" min="0" max="1" step="0.01" value="0" style="height: 20px; width: 450px;"> <div id="'
     + name
     + '-value" style="position:relative; left:30em; top:-18px;">'
     + name
     + '</div> </div> <br>  ';

    controls.innerHTML = controls.innerHTML + sliderText;
  }

  function configureSlider(name, value, min, max, handler) {
      // var controls = document.getElementById("controls");
      //

      var divName = name + "Slider";

      var slider = document.getElementById(divName);

      slider.min = min;
      slider.max = max;
      slider.value = value;
      slider.onchange = function() { handler(0, this); };
  }

  function addSliderOld(name) {
    var controls = document.getElementById("controls");

    var divName = name + "Slider";

    var sliderText = '<div id="'
     + divName
     + '" style="width:500px;"> <div id="'
     + name
     + '-value" style="position:relative; left:30em;">'
     + name
     + '</div> </div> <br>  ';

    controls.innerHTML = controls.innerHTML + sliderText;
  }

  function configureSliderOld(name, value, min, max, handler) {
   var controls = document.getElementById("controls");

   var divName = name + "Slider";

   // var slider = document.getElementById(divName);
   var slider = $("#" + divName);
   // var slider = document.getElementById("#" + divName);
   slider.slider({ min: min } );
   slider.slider('option', 'max', max);
   slider.slider('option', 'step', 0.001);
   slider.slider('value', value);

   slider.bind('slide', handler);
  }
