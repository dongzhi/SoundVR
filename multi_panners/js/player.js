(function($){

  //World
  var cWidth = 350, cHeight = 350;
  var paper, listener;
  // 3D sounds
  // Temporary patch until all browsers support unprefixed context.
  if (window.hasOwnProperty('AudioContext') && !window.hasOwnProperty('webkitAudioContext'))
      window.webkitAudioContext = AudioContext;

  var context;
  var buffer;
  var convolver;
  var panners = {};
  //var source;
  var dryGainNode;
  var wetGainNode;
  //var lowFilter;

  var x = 0;
  var y = 0;
  var z = 0;
  var hilightedElement = 0;
  var bufferList;
  var bufferLoader;

  var kInitialReverbLevel = 0.6;

  var pannerX = [],pannerY = [];

  $( document ).ready(function() {

      $('.wrapper').css({
          'width': $(window).width(),
          'height': $(window).height(),
      });

      init();

    });


  $( window ).resize(function() {
      $('.wrapper').css({
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


       console.log('Starting...');


       paper = Raphael("world", cWidth, cHeight);
       paper.clear();
       paper.rect(0, 0, cWidth, cHeight, 4).attr({fill: "#f1f1f1", stroke: "none"});

       //add listener
       listener = paper.circle(cWidth/2, cHeight/2, 10).attr({fill:"#333", stroke: "none"});

       // Initialize audio
       context = new AudioContext();

       dryGainNode = context.createGain();
       wetGainNode = context.createGain();

       convolver = context.createConvolver();

       dryGainNode.connect(context.destination);

       convolver.connect(wetGainNode);
       wetGainNode.connect(context.destination);
       wetGainNode.gain.value = kInitialReverbLevel;

       setReverbImpulseResponse('http://dongzhi.github.io/SoundVR/multi_panners/sound/impulse-responses/spatialized5.wav');

       context.listener.setPosition(0, 0, 0);

        console.log("Okay");
       bufferLoader = new BufferLoader(
         context,
         [
            'http://dongzhi.github.io/SoundVR/multi_panners/sound/storm.mp3',
            'http://dongzhi.github.io/SoundVR/multi_panners/sound/water-stream.mp3',
            'http://dongzhi.github.io/SoundVR/multi_panners/sound/garden.mp3',
            'http://dongzhi.github.io/SoundVR/multi_panners/sound/fire.mp3',
         ],
         finishedLoading
       );

       bufferLoader.load();
   }

  var dragger = function () {
        this.ox = this.type == "rect" ? this.attr("x") : this.attr("cx");
        this.oy = this.type == "rect" ? this.attr("y") : this.attr("cy");

        this.animate({"fill-opacity": .5}, 500);
  };

  var move = function (dx, dy) {
            var att = this.type == "rect" ? {x: this.ox + dx, y: this.oy + dy} : {cx: this.ox + dx, cy: this.oy + dy};
            this.attr(att);

            pannerX[this.node.id] = this.ox + dx;
            pannerY[this.node.id] = this.oy + dy;

            var a = (this.ox + dx) / cWidth;
            var b = (this.oy + dy) / cHeight;

            var _x = 8.0 * (2.0*a - 1.0);
            var _y = -11.0 * (2.0*b - 1.0);

            //console.log(this.node.id + ' is moving: ' + _x +'/'+ _y);
            panners[this.node.id].setPosition(_x, _y, 0);

            //paper.safari();
  };

  var up = function () {
            this.animate({"fill-opacity": 1}, 500);
  };

  function removePanner(id){
      //remove connections
      //to do: what about _source and _ lowFilter?
      var _panner = panners[id];
      _panner.disconnect(0);

      //remove from panners object
      //delete panners[streamid];

      //remove from UI
      $('#'+id).remove();

  }

  function addPanner(id, buffer){

      var _source = context.createBufferSource();
      _source.buffer = buffer;

      var _lowFilter = context.createBiquadFilter();
      _lowFilter.frequency.value = 22050.0;
      _lowFilter.Q.value = 5.0;
      //_lowFilter.gain.value = 1;

      var _panner = context.createPanner();
      if (panners[id]) return;
      panners[id] = _panner;

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

      pannerX.push(_x);
      pannerY.push(_y);

      var newDot = paper.circle(_x,_y,10).attr({fill:"#FF9900",stroke:"none"});
      newDot.node.id = id;
      newDot.drag(move, dragger, up);

      var a = _x / cWidth;
      var b = _y / cHeight;

      _x = 8.0 * (2.0*a - 1.0);
      _y = -11.0 * (2.0*b - 1.0);

      _panner.setPosition(_x, _y, 0);
      _source.start(0);
      _source.loop = true;

  }

  function randomInt(num){
    return Math.floor((Math.random() * num) + 1);
  }

  function finishedLoading(bList){
      for(var i = 0;i<bList.length;i++){
          addPanner(i,bList[i]);
          console.log('finishedLoading...');
      }

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


  $(document).keydown(function(e){
    if (e.keyCode == 37) {
       //console.log( "left pressed" );
       moveDot(1,0);
       return false;
    }else if(e.keyCode == 38){
       //console.log( "up pressed" );
       moveDot(0,1);
       return false;
    }else if(e.keyCode == 39){
       //console.log( "right pressed" );
       moveDot(-1,0);
       return false;
    }else if(e.keyCode == 40){
       //console.log( "down pressed" );
       moveDot(0,-1);
       return false;
    }else if(e.keyCode == 65){
       console.log( "TurnLeft" );
       turnDot(-1);
       return false;
    }else if(e.keyCode == 68){
       console.log( "TurnRight" );
       turnDot(1);
       return false;
    }
  });

  function turnDot(deg){
        paper.forEach(function (el)
        {
            if (el.node.id == "0" || el.node.id == "1" || el.node.id == "2" || el.node.id == "3"){
                // var att = el.type == "rect" ? {x: el.ox + dx, y: el.oy + dy} : {cx: el.ox + dx, cy: el.oy + dy};
                // el.attr(att);

                var _ox = pannerX[el.node.id] - cWidth/2;
                var _oy = pannerY[el.node.id] - cHeight/2;
                var _oz = Math.sqrt(_ox*_ox+_oy*_oy);


                var theta_deg = Math.atan2(_oy,_ox)/Math.PI*180;
                theta_deg += deg;


                //el.rotate(deg,cWidth/2,cHeight/2);
                var dx = _oz*Math.cos(theta_deg/180*Math.PI) - _ox;
                var dy = _oz*Math.sin(theta_deg/180*Math.PI) - _oy;

                el.translate(dx,dy);

                pannerX[el.node.id] = pannerX[el.node.id]+dx;
                pannerY[el.node.id] = pannerY[el.node.id]+dy;
                //
                var a = pannerX[el.node.id] / cWidth;
                var b = pannerY[el.node.id] / cHeight;
                //
                var _x = 8.0 * (2.0*a - 1.0);
                var _y = -11.0 * (2.0*b - 1.0);

                //
                //console.log(el.node.id + ' is moving: ' + _x +'/'+ _y);
                panners[el.node.id].setPosition(_x, _y, 0);
                // // return el - do what you want
            }
        });
  }

  function moveDot(dx,dy){
       //console.log("moving");
      //for(var i =0;i<fileList.length;i++){
        paper.forEach(function (el)
        {
            if (el.node.id == "0" || el.node.id == "1" || el.node.id == "2" || el.node.id == "3"){
                // var att = el.type == "rect" ? {x: el.ox + dx, y: el.oy + dy} : {cx: el.ox + dx, cy: el.oy + dy};
                // el.attr(att);

                el.translate(dx,dy);

                pannerX[el.node.id] = pannerX[el.node.id]+ dx;
                pannerY[el.node.id] = pannerY[el.node.id]+ dy;

                var a = pannerX[el.node.id] / cWidth;
                var b = pannerY[el.node.id] / cHeight;

                var _x = 8.0 * (2.0*a - 1.0);
                var _y = -11.0 * (2.0*b - 1.0);

                //
                //console.log(el.node.id + ' is moving: ' + _x +'/'+ _y);
                panners[el.node.id].setPosition(_x, _y, 0);
                // // return el - do what you want
            }
        });
      //}
  }


})(jQuery);
