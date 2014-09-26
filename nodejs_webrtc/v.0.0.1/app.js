/**************************
Author: Dongzhi Xia
Version: 0.1.1
Last Update: 09.23.2014
**************************/
var express = require('express');
var app = express();
var server = require('http').createServer(app);


app.set('port', process.env.PORT || 8888);
app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
});

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

app.get("/admin", function(req, res) {
    res.sendFile(__dirname + '/public/admin.html');
});


//Socket.io code
var io = require('socket.io').listen(server,{
    log: true,
    origins: '*:*'
});

io.set('transports', [
    //'websocket',
    'xhr-polling',
    'jsonp-polling'
]);


var channels = {};
var users = [];

io.sockets.on('connection', function (socket) {

    //users
    //updateUsers();
    //updateChannels();
    socket.user = null;

    socket.on('addUser', function (username) {
      socket.user = addUser(username);
      socket.emit("welcome", socket.user);
    });


    socket.on('disconnect', function () {
      if(socket.user){
        removeUser(socket.user);
      }
    });

    //channels/rooms
    var initiatorChannel = '';
    if (!io.isConnected) {
        io.isConnected = true;
    }

    socket.on('new-channel', function (data) {
        if (!channels[data.channel]) {
            initiatorChannel = data.channel;
        }

        channels[data.channel] = data.channel;
        updateChannels();
        onNewNamespace(data.channel, data.sender);
    });

    socket.on('presence', function (channel) {
        var isChannelPresent = !! channels[channel];
        socket.emit('presence', isChannelPresent);
    });

    socket.on('disconnect', function (channel) {
        if (initiatorChannel) {
            delete channels[initiatorChannel];
            updateChannels();
        }
    });
});


io.sockets.on('error', function(err) {
    console.log('error: ' + err);
    process.exit(1);
});


//Run server
server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});


// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
    console.log('App Close');
    process.exit(0);
});


var addUser = function(username) {
  var user = {
    name: username
    //password: 0
  }
  users.push(user);
  updateUsers();
  return user;
}

var removeUser = function(user) {
  for(var i=0; i<users.length; i++) {
    if(user.name === users[i].name) {
      users.splice(i, 1);
      updateUsers();
      return;
    }
  }
}

var updateUsers = function() {
  var str = '';
  //loop array
  for(var i=0; i<users.length; i++) {
    var user = users[i];
    str += user.name +"<br/>";
  }
  io.sockets.emit("users", { users: str });
}


var updateChannels = function() {
  var str = '';
  //loop object
  for(var key in channels){
    if (channels.hasOwnProperty(key)) {
    str += channels[key] +"<br/>";
    }
  }
  io.sockets.emit("channels", { channels: str });
}

var onNewNamespace = function(channel, sender) {
    io.of('/' + channel).on('connection', function (socket) {
        var username;
        if (io.isConnected) {
            io.isConnected = false;
            socket.emit('connect', true);
        }

        socket.on('message', function (data) {
            if (data.sender == sender) {
                if(!username) username = data.data.sender;

                socket.broadcast.emit('message', data.data);
            }
        });

        socket.on('disconnect', function() {
            if(username) {
                socket.broadcast.emit('user-left', username);
                username = null;
            }
        });
    });
}
