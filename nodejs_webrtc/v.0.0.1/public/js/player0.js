(function($){

  var connection = new RTCMultiConnection();
  connection.session = {
      audio: true,
      video: false,
  };
  connection.userid = null;
  connection.channel = 'Hawaii';


  $( document ).ready(function() {
      //init screen size
      $('.main').hide();

      $('.login').css({
          'width': $(window).width(),
          'height': $(window).height(),
      });

      $('.main').css({
          'width': $(window).width(),
          'height': $(window).height(),
      });


      // onstream event; fired both for local and remote videos
      var numberOfRemoteAudios = 0;
      connection.onstream = function (e) {
          // if (e.type == 'local') {
          //     var newAudio = e.mediaElement;
          //     $('#audios').append(newAudio);
          //     newAudio.muted = true;
          // }
          console.log('Streaming...');
          if (e.type == 'remote') {
            numberOfRemoteAudios++;
            var newAudio = e.mediaElement;
            $('#audios').append(newAudio);
            newAudio.muted = false;
          };
      };

      //socket.io connect to the server

      $('.loginbox button').on('click',function(e){
          e.preventDefault();
          var _username = $('#username').val();
           //console.log("Name:" + _username);
          if(_username){


            //let join the room
            var SIGNALING_SERVER = 'http://127.0.0.1:8888/';
            var mainSocket = io.connect(SIGNALING_SERVER);

            mainSocket.emit('addUser', _username);

            connection.openSignalingChannel = function(config) {
               //config.channel = config.channel || this.channel;
               config.channel = "Hawaii"
               var sender = _username;


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

                if (!isChannelPresent){
                    connection.open(connection.channel); // open new room
                    console.log('Open new room');
                }else{
                    connection.join(connection.channel); // join existing room
                    console.log('Join Existing Room'+connection.channel);
                }
            });

            mainSocket.emit('presence', connection.channel);



            $('.login').hide();
            $('.main').show();
            $('.welcome').html('Now, close your eyes <strong>'+ _username + '</strong> ...');

          }else{
            $('#username').css({
              'background':'#fcde93',
            });
          }
      })





      /*
      var socket = io.connect('http://anonymous.local:8888');
      socket.on('connect', function (){

          socket.on('disconnect', function (data) {
            $('#username').val('');
            $('.login').show();
          });



      })

      */


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


})(jQuery);
