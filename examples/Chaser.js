var SDL = require('../sdl');

SDL.init(SDL.INIT.VIDEO | SDL.INIT.JOYSTICK);
process.on('exit', function () { SDL.quit(); });

var screen = SDL.setVideoMode(0, 0, 0, SDL.SURFACE.FULLSCREEN);

var numPlayers = SDL.numJoysticks();

if (!numPlayers) throw new Error("At least one joystick is required to play");

var colors = {
  butter: [0xfce94f, 0xedd400, 0xc4a000],
  chameleon: [0x8ae234, 0x73d216, 0x4e9a06],
  chocolate: [0xe9b96e, 0xc17d11, 0x8f5902],
  orange: [0xfcaf3e, 0xf57900, 0xce5c00],
  plum: [0xad7fa8, 0x75507b, 0x5c3566],
  scarlet: [0xef2929, 0xcc0000, 0xa40000],
  sky: [0x729fcf, 0x3465a4, 0x204a87]
}

function shuffle(array) {
  for (var i = 0, l = array.length; i < l; i++) {
    var j = Math.floor(Math.random() * l);
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

var colorNames = Object.keys(colors);
shuffle(colorNames);

function Player(joystickIndex) {
  SDL.joystickOpen(joystickIndex);
  players[joystickIndex] = this;
  this.name = SDL.joystickName(joystickIndex);
  var colorName = this.colorName = colorNames[joystickIndex % colorNames.length];
  var angle = 2 * Math.PI / numPlayers * joystickIndex;
  this.x = Math.floor(Math.sin(angle) * 50 * (numPlayers - 1)) + screen.w / 2;
  this.y = Math.floor(Math.cos(angle) * 50 * (numPlayers - 1)) + screen.h / 2;
  this.jx = 0; this.jy = 0;
  this.speed = 0.3;
  console.log("New %s player using %s", colorName[0].toUpperCase() + colorName.substr(1), this.name);
}
Player.prototype.tick = function (delta) {
  this.x += this.jx * delta * this.speed;
  this.y += this.jy * delta * this.speed;
  if (this.x < 10) this.x = 10;
  if (this.y < 10) this.y = 10;
  if (this.x > screen.w - 10) this.x = screen.w - 10;
  if (this.y > screen.h - 10) this.y = screen.h - 10;
  
  var px = Math.floor(this.x);
  var py = Math.floor(this.y);
  SDL.fillRect(screen, [px - 10, py - 10, 20, 20], colors[this.colorName][0]);
  SDL.fillRect(screen, [px - 8, py - 8, 16, 16], colors[this.colorName][2]);
  SDL.fillRect(screen, [px - 4, py - 4, 8, 8], colors[this.colorName][1]);
};

var rotate = 0;
function Spark(player) {
  rotate = (rotate + 7) % 360;
  this.colorName = player.colorName;
  this.color = colors[player.colorName][Math.floor(Math.random()*3)];
  this.x = player.x;
  this.y = player.y;
  this.r = rotate / 180 * Math.PI;
  this.d = 10;
  sparks.push(this);
}
Spark.prototype.tick =  function (delta) {
  this.d += delta * 0.1 + this.d / 10;
  for (var a = 0; a < Math.PI * 2; a += Math.PI / 3) {
    var px = Math.floor(this.x + this.d * Math.sin(a + this.r));
    var py = Math.floor(this.y + this.d * Math.cos(a + this.r));
    SDL.fillRect(screen, [px - 5, py - 5, 10, 10], this.color);
  }
};
Spark.prototype.expire = function () {
  if (this.d > 200) {
    sparks.splice(sparks.indexOf(this), 1);
  }
};

var sparks = [];
var players = [];
for (var i = 0; i < numPlayers; i++) {
  new Player(i);
}

SDL.events.on('tick', function (delta) {
  // Check for collisions
  var collision = false;
  for (var i = 0; i < numPlayers - 1; i++) {
    for (var j = i + 1; j < numPlayers; j++) {
      var dx = players[i].x - players[j].x;
      var dy = players[i].y - players[j].y;
      if (dx < 20 && dx > -20 && dy < 20 && dy > -20) {
        new Spark(players[i]);
        new Spark(players[j]);
      }
    }
  }
  SDL.fillRect(screen, null, 0);
  // Run physics and controls
  for (var i = 0; i < numPlayers; i++) {
    players[i].tick(delta);
  }
  // Run physics and controls
  for (var i = 0, l = sparks.length; i < l; i++) {
    sparks[i].tick(delta);
  }
  sparks.forEach(function (spark) { spark.expire(); });  
  
  
  SDL.flip(screen);
});

SDL.events.on("QUIT", function (evt) { process.exit(0); }); // Window close
SDL.events.on("KEYDOWN", function (evt) {
  if (evt.sym === 99 && evt.mod === 64) process.exit(0); // Control+C
  if (evt.sym === 27 && evt.mod === 0) process.exit(0);  // ESC
});
SDL.events.on("MOUSEMOTION", function (evt) {
  if (evt.state) {
    new Spark({
      x: evt.x,
      y: evt.y,
      colorName: colorNames[(evt.which + numPlayers) % colorNames.length]
    });
  }
});
SDL.events.on("JOYAXISMOTION", function (evt) {
  var player = players[evt.which];
  if (evt.axis === 0) player.jx = evt.value / 32768;
  if (evt.axis === 1) player.jy = evt.value / 32768;
});


