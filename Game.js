window.addEventListener("load", function () {

	var clamp = function (x, min, max) {
		return x < min ? min : (x > max ? max : x);
	};

	var Q = Quintus({ development: true })
		.include("Sprites, Scenes, Anim, Input, Touch, UI, Scenes, 2D")
		.setup({ width: 800, height: 480 })
		.touch();

	Q.gravityY = 750;
	Q.gravityX = 0;
	Q.debug = true;
	//Q.debugFill = true;

	Q.input.touchControls({
		controls:
		[
			['left', '<'],
			['right', '>'],
			[],
			[],
			[],
			[],
			['fire', 'a']
		]
	});

	Q.controls();

	Q.Sprite.extend("Player", {
		init: function (p) {
			this._super(p, {
				sprite: "player",
				sheet: "player",
				x: Q.el.width / 2,
				y: Q.el.height - 60,
				type: Q.SPRITE_FRIENDLY,
				speed: 10
			});

			this.add("animation");
			this.play("default");
			this.add("Gun");
		},
		step: function (dt) {
			if (Q.inputs['left'])
				this.p.x -= this.p.speed;
			if (Q.inputs['right'])
				this.p.x += this.p.speed;

			this.p.x = clamp(this.p.x, 0 + (this.p.w / 2), Q.el.width - (this.p.w / 2));
		}
	});

	Q.Sprite.extend("PlayerNew", {
		init: function (p) {
			this._super(p, {
				sprite: "playernew",
				sheet: "playernew",
				x: 100,
				y: Q.el.height - 200,
				scale: 0.75,
				type: Q.SPRITE_DEFAULT,
				speed: 10,
				jump: 200,
				score: 0,
				health: 100
			});

			//this.p.points = [[5, 5], [5, -5], [-5, 5], [-5, -5]];
			this.add("animation, 2d");
			this.play("default");
			this.on("bump.bottom", this, "stomp");
		},

		stomp: function (collision) {
			console.log("stomp hit");
			if (collision.obj.isA("CratesBad")) {
				collision.obj.destroy();
				//this.p.destroy();
				//this.p.vy -= 500; // make the player jump
			}
		},

		step: function (dt) {
			this.p.x += this.p.speed
			//this.p.vx += (500 - this.p.vx) / 4;
			if (this.p.y > (Q.el.height - 200)) {
				//this.p.y = Q.el.height - 200;
				this.p.landed = 1;
				this.p.vy = 0;
			} else {
				this.p.landed = 0;
			}

			//if(Q.inputs['up'] && this.p.landed > 0) {
			//	this.p.vy = -400;
			//} 

			if (Q.inputs['left'])
				this.p.x -= this.p.speed;
			if (Q.inputs['right'])
				this.p.x += this.p.speed;
			if (Q.inputs['up'])
				this.p.y -= this.p.speed;

			//this.p.x = clamp(this.p.x, 0 + (this.p.w / 2), Q.el.width - (this.p.w / 2));
			this.p.y = clamp(this.p.y, Q.el.height - 400, Q.el.height - 200);

			this.stage.viewport.centerOn(this.p.x + 200, 240);
		}
	});

	Q.Sprite.extend("CratesBad", {
		init: function (p) {
			var player = Q("PlayerNew").first();
			this._super(p, {
				sprite: "crates",
				sheet: "crates",
				x: player.p.x + Q.width + 50,
				scale: 1,
				frame: 1,
				y: Q.el.height - 200,
				type: Q.SPRITE_ENEMY,
				speed: 10,
				vx: -250 + 200 * Math.random()
			});
			this.p.gravity = 0;
			this.p.points = [[8, 8], [8, -8], [-8, 8], [-8, -8]];
			this.add("animation, 2d");
			//this.play("default");
			this.on("bump.left, bump.right", this, "hit");
			//this.on("hit.sprite", "hit");
			//this.on("hit", this, );
		},
		step: function (dt) {
			if (this.p.x < (-1 * this.p.width))
				this.destroy();
		},
		hit: function (collision) {
			console.log("Collision detected!");

			if (collision.obj.isA("PlayerNew")) {
				collision.obj.destroy();
				Q.clearStages();
				Q.stageScene("mainLevel");
			}
			this.p.type = 0;
			this.p.opacity = 0.5;
		}

	});


	Q.Sprite.extend("Shot", {
		init: function (p) {
			this._super(p, {
				sprite: "shot",
				sheet: "shot",
				speed: 200
			});

			this.add("animation");
			this.play("default");
		},
		step: function (dt) {
			this.p.y -= this.p.speed * dt;

			if (this.p.y > Q.el.height || this.p.y < 0) {
				this.destroy();
				console.log("Shot destroyed");
			}
		}
	});

	Q.component("Gun", {
		added: function () {
			this.entity.p.shots = [];
			this.entity.p.canFire = true;
			this.entity.on("step", "handleFiring");
		},

		extend: {
			handleFiring: function (dt) {
				var entity = this;

				for (var i = entity.p.shots.length - 1; i >= 0; i--) {
					if (entity.p.shots[i].isDestroyed) {
						entity.p.shots.splice(i, 1);
					}
				}

				if (Q.inputs['fire']) {
					entity.fire();
				}
			},

			fire: function () {
				var entity = this;

				if (!entity.p.canFire)
					return;

				var shot = Q.stage().insert(new Q.Shot({ x: entity.p.x, y: entity.p.y - 50, speed: 200, type: Q.SPRITE_DEFAULT | Q.SPRITE_FRIENDLY }));
				entity.p.shots.push(shot);
				entity.p.canFire = false;
				setTimeout(function () {
					entity.p.canFire = true;
				}, 500);

			}
		}
	});

	Q.GameObject.extend("BoxThrower", {
		init: function () {
			this.p = {
				launchDelay: 0.75,
				launchRandom: 1,
				launch: 2 // launch after these number of seconds
			}
		},

		update: function (dt) {
			this.p.launch -= dt;

			if (this.p.launch < 0) {
				this.stage.insert(new Q.CratesBad());
				this.p.launch = this.p.launchDelay + this.p.launchRandom * Math.random();
			}
		}
	});

	Q.scene('hud',function(stage) {
		var container = stage.insert(new Q.UI.Container({
			x: 50, y: 0
		}));

		var label = container.insert(new Q.UI.Text({
			x: 200, y: 20,
			label: "Score: " + stage.options.score, color: "red"
		}));

		var strength = container.insert(new Q.UI.Text({
			x: 50, y: 20,
			label: "Health: " + stage.options.health + '%', color: "red"
		}));

		//container.fit(20);
	});

	Q.scene("mainLevel", function (stage) {
		stage.insert(new Q.Repeater({ asset: "spacebackground.png", speedX: 0.5}));
		//stage.insert(new Q.Sprite({ asset: "spacebackground.png", x: Q.el.width / 2, y: Q.el.height / 2, type: Q.SPRITE_NONE }));
		stage.insert(new Q.Player());
		stage.insert(new Q.PlayerNew());
		stage.insert(new Q.CratesBad());
		stage.insert(new Q.BoxThrower());
		stage.add("viewport");
	});

	Q.load(["spacebackground.png", "spaceship2.png", "shot.png", "alien2.png", "spaceshipNew.png", "crates.png",
		"player.json", "shot.json", "alien.json", "playernew.json", "crates.json"], function () {
			Q.compileSheets("spaceship2.png", "player.json");
			Q.compileSheets("spaceshipNew.png", "playernew.json");
			Q.compileSheets("shot.png", "shot.json");
			Q.compileSheets("alien2.png", "alien.json");
			Q.compileSheets("crates.png", "crates.json");
			Q.animations("player", { default: { frames: [0, 1, 2, 3], rate: 1 / 4 } });
			Q.animations("playernew", { default: { frames: [0, 1, 2, 3], rate: 1 / 4 } });
			Q.animations("shot", { default: { frames: [0, 1, 2, 3], rate: 1 / 4 } });
			Q.stageScene("mainLevel");
			Q.stageScene('hud', 2, Q('PlayerNew').first().p);
		});

});