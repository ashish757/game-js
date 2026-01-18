const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Assets ---
const imgHero = document.getElementById('img-hero');
const imgDino = document.getElementById('img-dino');
const imgBg = document.getElementById('img-bg');
const imgBeam = document.getElementById('img-beam');

// --- Game State ---
let gameRunning = true;
let gameResult = "";

// --- Input Handling ---
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') keys.Space = true;
    if (e.code === 'ArrowUp') keys.ArrowUp = true;
    if (e.code === 'ArrowDown') keys.ArrowDown = true;
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;

    // Restart
    if (!gameRunning && e.code === 'Space') {
        resetGame();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        keys.Space = false;
        player.canShoot = true; // reset trigger
    }
    if (e.code === 'ArrowUp') keys.ArrowUp = false;
    if (e.code === 'ArrowDown') keys.ArrowDown = false;
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
});

// --- Entities ---
class Entity {
    constructor(x, y, width, height, speed, hp, img) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.hp = hp;
        this.maxHp = hp;
        this.img = img;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
    }

    draw() {
        ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
}

class Player extends Entity {
    constructor() {
        super(100, 312, 48, 48, 3, 100, imgHero); // Floor logic alignment (reduced speed from 5 to 3)
        this.jumpPower = -8; // Increased jump height
        this.gravity = 0.2; // Low gravity
        this.canShoot = true;
        this.shootCooldown = 0; // Add cooldown timer
        this.initialY = 312;
        this.shootingAnimation = 0; // Animation timer for shooting pose
    }

    update() {
        // Horizontal Move
        if (keys.ArrowLeft) this.vx = -this.speed;
        else if (keys.ArrowRight) this.vx = this.speed;
        else this.vx = 0;

        // Jump
        if (keys.ArrowUp && this.grounded) {
            this.vy = this.jumpPower;
            this.grounded = false;
        }

        // Apply Physics
        this.modelPhysics();

        // Screen Bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        // Ceiling Cap (Stop at height)
        const ceiling = this.initialY - 150;
        if (this.y < ceiling) {
            this.y = ceiling;
            this.vy = 0;
        }

        // Shooting with cooldown
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }
        
        // Decrease shooting animation timer
        if (this.shootingAnimation > 0) {
            this.shootingAnimation--;
        }
        
        if (keys.Space && this.canShoot && this.shootCooldown === 0) {
            projectiles.push(new Projectile(this.x + this.width, this.y + 16, 10, true));
            this.canShoot = false;
            this.shootCooldown = 30; // 30 frames cooldown (~0.5 seconds at 60fps)
            this.shootingAnimation = 5; // Show shooting pose for 5 frames
        }
    }

    draw() {
        ctx.save();
        
        // Add shooting recoil effect - slight backward tilt
        if (this.shootingAnimation > 0) {
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.rotate(-0.1); // Slight tilt back
            ctx.translate(-(this.x + this.width/2), -(this.y + this.height/2));
            
            // Draw muzzle flash
            ctx.fillStyle = '#ffff00';
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(this.x + this.width, this.y + 20, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        
        ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    modelPhysics() {
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        // Ground Collision (Floor 360)
        if (this.y + this.height >= 360) {
            this.y = 360 - this.height;
            this.vy = 0;
            this.grounded = true;
        }
    }
}

class Enemy extends Entity {
    constructor() {
        super(600, 296, 64, 64, 0.8, 200, imgDino); // Speed 0.8 for slower vertical movement
        this.shootTimer = 0;
        this.moveDirection = 1; // 1 for down, -1 for up
        this.minY = 250; // Upper boundary
        this.maxY = 320; // Lower boundary
    }

    update(target) {
        // Vertical movement logic
        this.y += this.speed * this.moveDirection;
        
        // Reverse direction at boundaries
        if (this.y <= this.minY) {
            this.moveDirection = 1; // Move down
            this.y = this.minY;
        } else if (this.y >= this.maxY) {
            this.moveDirection = -1; // Move up
            this.y = this.maxY;
        }

        // Shoot logic (Much slower)
        this.shootTimer++;
        if (this.shootTimer > 240) { // Even slower fire rate (approx 4s)
            projectiles.push(new Projectile(this.x, this.y + 24, -8, false));
            this.shootTimer = 0;
        }
    }
}

class Projectile {
    constructor(x, y, vx, isPlayer) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 10;
        this.vx = vx;
        this.isPlayer = isPlayer;
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.vx;
        if (this.x < -50 || this.x > canvas.width + 50) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.save();
        if (!this.isPlayer) {
            ctx.filter = 'hue-rotate(180deg)';
        }
        ctx.drawImage(imgBeam, this.x, this.y, this.width, this.height);
        ctx.restore();
    }
}

// --- Init ---
let player = new Player();
let dino = new Enemy();
let projectiles = [];

// Debug Logger
window.gameLogs = [];
function log(msg) {
    if (window.gameLogs.length < 50) window.gameLogs.push(msg);
    console.log(msg);
}

function resetGame() {
    player = new Player();
    dino = new Enemy();
    dino.shootTimer = -60;
    projectiles = [];
    gameRunning = true;
    gameResult = "";
    document.getElementById('game-over-screen').classList.add('hidden');
    updateUI();
    log("Game Reset. Player HP: " + player.hp);
}

function checkCollisions() {
    if (!gameRunning) return;

    projectiles.forEach((p, index) => {
        if (p.markedForDeletion) return;

        // vs Dino
        if (p.isPlayer && rectIntersect(p, dino)) {
            dino.hp -= 10;
            p.markedForDeletion = true;
            log("Hit Dino! HP: " + dino.hp);
        }
        // vs Player
        if (!p.isPlayer && rectIntersect(p, player)) {
            player.hp -= 25; // Stronger dino beam (was 10)
            p.markedForDeletion = true;
            log("Hit Player! HP: " + player.hp + " by projectile at " + p.x + "," + p.y);
        }
    });

    if (player.hp <= 0) {
        log("Player Died. Final HP: " + player.hp);
        endGame("DEFEAT");
    }
    if (dino.hp <= 0) {
        log("Dino Defeated");
        endGame("VICTORY");
    }
}

function rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.width ||
        r2.x + r2.width < r1.x ||
        r2.y > r1.y + r1.height ||
        r2.y + r2.height < r1.y);
}

function updateUI() {
    const playerPct = Math.max(0, (player.hp / player.maxHp) * 100);
    const dinoPct = Math.max(0, (dino.hp / dino.maxHp) * 100);

    document.getElementById('player-hp-bar').style.width = playerPct + '%';
    document.getElementById('boss-hp-bar').style.width = dinoPct + '%';
}

function endGame(result) {
    gameRunning = false;
    gameResult = result;
    const screen = document.getElementById('game-over-screen');
    const title = document.getElementById('game-result-title');

    title.textContent = result;
    title.style.color = result === "VICTORY" ? "#2ecc71" : "#e74c3c";
    screen.classList.remove('hidden');
}

// --- Loop ---
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgBg, 0, 0, canvas.width, canvas.height);

    if (gameRunning) {
        player.update();
        dino.update(player);
        projectiles.forEach(p => p.update());
        projectiles = projectiles.filter(p => !p.markedForDeletion);
        checkCollisions();
        updateUI();
    }

    player.draw();
    dino.draw();
    projectiles.forEach(p => p.draw());

    requestAnimationFrame(animate);
}

window.onload = () => {
    animate();
};
