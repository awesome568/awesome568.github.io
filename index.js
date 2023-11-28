// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static('public'));

// Chatroom

var numUsers = 0;
var usedUsernames = new Set(); // Set to track used usernames

// Function to check if a username is available
function isUsernameAvailable(username) {
  return !usedUsernames.has(username);
}

// Event handlers for socket connections
io.on('connection', function (socket) {
  var addedUser = false;

  // Event: new message
  socket.on('new message', function (data) {
    // Broadcast 'new message' event to all clients
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // Event: add user
  socket.on('add user', function (username, callback) {
    if (addedUser) return;

    // Check if the username is available
    if (isUsernameAvailable(username)) {
      // Set the username for the socket
      socket.username = username;
      ++numUsers;
      addedUser = true;
      usedUsernames.add(username); // Add the username to the set of used usernames

      // Emit 'login' event to the current client
      socket.emit('login', {
        numUsers: numUsers
      });

      // Broadcast 'user joined' event to all clients
      socket.broadcast.emit('user joined', {
        username: socket.username,
        numUsers: numUsers
      });
    } else {
      // Inform the client that the username is already taken
      callback(false);
    }
  });

  // Event: typing
  socket.on('typing', function () {
    // Broadcast 'typing' event to all clients except the sender
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // Event: stop typing
  socket.on('stop typing', function () {
    // Broadcast 'stop typing' event to all clients except the sender
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // Event: disconnect
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;
      usedUsernames.delete(socket.username); // Remove the username from the set of used usernames

      // Broadcast 'user left' event to all clients
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
