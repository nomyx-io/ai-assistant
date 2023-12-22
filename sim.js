var canvas = document.querySelector('canvas');
var context = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Vector {
    constructor(x = 0, y = 0) { if (isNaN(x) || isNaN(y)) { throw new Error('Vector constructor arguments must be numbers.'); } this._x = x; this._y = y; }
    get x() { return this._x; }
    get y() { return this._y; }
    set x(value) { if (isNaN(value)) { throw new Error('newValue is NaN'); } this._x = value; }
    set y(value) { if (isNaN(value)) { throw new Error('newValue is NaN'); } this._y = value; }
    add(v) { if (isNaN(v.x) || isNaN(v.y)) throw new Error('isNaN'); return new Vector(this.x + v.x, this.y + v.y); }
    sub(v) { if (isNaN(v.x) || isNaN(v.y)) throw new Error('isNaN'); return new Vector(this.x - v.x, this.y - v.y); }
    mul(s) { if (isNaN(s)) throw new Error('isNaN'); return new Vector(this.x * s, this.y * s); }
    div(s) { if (isNaN(s)) throw new Error('isNaN'); return new Vector(this.x / s, this.y / s); }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    norm() { return this.div(this.mag()); }
    distance(v) { if (isNaN(v.x) || isNaN(v.y)) throw new Error('isNaN'); return this.sub(v).mag(); }
    length() { return this.sub(new Vector(0, 0)).mag(); }
    distanceTo(v) { if (isNaN(v.x) || isNaN(v.y)) throw new Error('isNaN'); return this.distance(v); }
    dot(v) { if (isNaN(v.x) || isNaN(v.y)) throw new Error('isNaN'); return this.x * v.x + this.y * v.y; }
    cross(v) { if (isNaN(v.x) || isNaN(v.y)) throw new Error('isNaN'); return this.x * v.y - this.y * v.x; }
    rotate(a) { let c = Math.cos(a); let s = Math.sin(a); return new Vector(c * this.x - s * this.y, s * this.x + c * this.y); }
    set(v) { if (isNaN(v.x) || isNaN(v.y)) throw new Error('isNaN'); this.x = v.x; this.y = v.y; return this; }
    angle() { return Math.atan2(this.y, this.x); }
    acosh() { return Math.log(this.x + Math.sqrt(this.x * this.x - 1)); }
    scale(v) { if (isNaN(v.x) || isNaN(v.y)) throw new Error('isNaN'); return new Vector(this.x * v.x, this.y * v.y); }
    hyperbolicProjection(boundsRadius) {
        const p = this
        const r = Math.sqrt(p.x * p.x + p.y * p.y);
        const theta = Math.atan2(p.y, p.x);
        const scale = r / (1 + r / boundsRadius);
        return new Vector(scale * Math.cos(theta), scale * Math.sin(theta));
    }
    validate() { if (!isNaN(this.x) || !isNaN(this.y)) throw new Error('value isNaN!') }
    copy() { return new Vector(this.x, this.y); }
    toString() { return "(" + this.x + "," + this.y + ")"; }
    static polar(r, a) { return new Vector(r * Math.cos(a), r * Math.sin(a)); }
    static random() { return new Vector(Math.random(), Math.random()); }
    static fromAngle(a) { return new Vector(Math.cos(a), Math.sin(a)); }
}


class Entropy {
    constructor(value = 0) {
        this.value = value;
        this.delta = 0;
    }

    adjustEntropy(delta) {
        this.value += delta;
        this.delta = delta;
    }

    potentialAdjustment(delta) {
        return this.value + delta;
    }

    exchange(other, amount) {
        if (this.value - amount > 0 && other.value + amount > 0) {
            this.adjustEntropy(-amount);
            other.adjustEntropy(amount);
        }
    }
}

class Component {
    constructor(position = new Vector(), entropicDegree = new Entropy()) {
        this.position = position;
        this.entropicDegree = entropicDegree;
    }

    absorbEntropy(entropy) {
        this.entropicDegree.adjustEntropy(entropy);
    }

    emitEntropy(entropy) {
        this.entropicDegree.adjustEntropy(-entropy);
    }

    setPosition(vector) {
        this.position = vector;
    }

    setEntropicDegree(entropy) {
        this.entropicDegree = entropy;
    }
}

class Sensor extends Component {
    constructor(position = new Vector(), entropicDegree = new Entropy()) {
        super(position, entropicDegree);
    }

    absorbEntropy(amount) {
        this.entropicDegree.adjustEntropy(amount);
    }

    emitEntropy(amount) {
        this.entropicDegree.adjustEntropy(-amount);
    }

    // Sensor-specific methods...
}


class Actuator extends Component {
    constructor(position = new Vector(), entropicDegree = new Entropy()) {
        super(position, entropicDegree);
    }

    // Actuator specific methods
    absorbEntropy(amount) {
        // Override base method
        // May introduce different behavior for Actuator
        super.absorbEntropy(amount);
    }

    emitEntropy(amount) {
        // Override base method
        // May introduce different behavior for Actuator
        super.emitEntropy(amount);
    }

    // Other Actuator-specific methods can be added here

}

class Tripole {
    constructor(name, environment) {
        this.name = name;
        this.environment = environment;
        this.sensor = new Sensor();
        this.actuator = new Actuator();
        this.environment.add(this);
    }

    // Overwrite the update method
    update() {
        this.move();
    }

    // Update the move method
    move() {
        let lowEntropyDirection = this.senseLowEntropy();
        let highEntropyDirection = this.senseHighEntropy();
        // Here, we're just subtracting highEntropyDirection and adding lowEntropyDirection.
        // It assumes all entropies act as vectors. We might want to find a better function.
        if(!isNaN(lowEntropyDirection)) this.sensor.position = this.sensor.position.sub(highEntropyDirection);
        if(!isNaN(highEntropyDirection)) this.sensor.position = this.sensor.position.add(lowEntropyDirection);
    }

    senseLowEntropy () {
        // Arbitrary value. Change as needed.
        var senseRadius = 100;
        var lowestEntropy = this.environment.senseEntropy(this.sensor.position, senseRadius);
        return lowestEntropy;
    };
    
    senseHighEntropy () {
        // Arbitrary value. Change as needed.
        var senseRadius = 100;
        var highestEntropy = this.environment.senseEntropy(this.actuator.position, senseRadius);
        return highestEntropy;
    };

    moveTowardLowEntropy(direction) {
        // Moving sensor towards low entropy
        this.sensor.position = this.sensor.position.add(direction);
      }
    
    moveAwayFromHighEntropy(direction) {
        // Moving actuator away from high entropy
        this.actuator.position = this.actuator.position.sub(direction);
      }
    
}

class InteractionHandler {
    constructor() {

    }

    interact = function(tripole1, tripole2) {
        let lowEntropyDirection = tripole1.senseLowEntropy() - tripole2.senseLowEntropy();
        let highEntropyDirection = tripole1.senseHighEntropy() - tripole2.senseHighEntropy();
        if(lowEntropyDirection < 0) {
            tripole1.moveTowardLowEntropy(lowEntropyDirection);
            tripole2.moveTowardLowEntropy(-lowEntropyDirection);
        }
        else if(highEntropyDirection > 0) {
            tripole1.moveAwayFromHighEntropy(highEntropyDirection);
            tripole2.moveAwayFromHighEntropy(-highEntropyDirection);
        }
    }
}

class Environment {
    constructor() {
        this.tripoleList = [];
        this.interactionHandler = new InteractionHandler();
    }
    add(tripole) { this.tripoleList.push(tripole); }
    remove(tripole) { const index = this.tripoleList.indexOf(tripole); if (index > -1) { this.tripoleList.splice(index, 1); } }
    update() { for (let tripole of this.tripoleList) { tripole.update(); } }

    // New method to sense entropy around a Vector
    senseEntropy(position, radius) {
        let totalEntropy = 0;
        for (let tripole of this.tripoleList) {
            if (position.distance(tripole.sensor.position) <= radius) {
                totalEntropy += tripole.sensor.entropicDegree.degree;
            }
        }
        return totalEntropy;
    }
}

class Renderer {
    constructor(context) {
        this.context = context;
    }

    render(tripole) {
        this.context.beginPath();
        this.context.arc(tripole.sensor.position.x, tripole.sensor.position.y, 5, 0, 2 * Math.PI, false);

        let intensity = Math.min(Math.floor(tripole.sensor.entropicDegree.value), 255);
        this.context.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`;

        this.context.fill();
    }
}

// Create an environment and renderer
let environment = new Environment();
let renderer = new Renderer(context);

// Populate the world with random tripoles
for (let i = 0; i < 100; i++) {
    new Tripole(`Tripole ${i}`, environment);
}

// Animation loop
function animate() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    environment.update();  // This will call the update method for each tripole

    for (let tripole of environment.tripoleList) {
        renderer.render(tripole);
    }

    requestAnimationFrame(animate);
}

// Start the animation loop
animate();


