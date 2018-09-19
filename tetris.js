/***************/
/***VARIABLES***/
/***************/

var game = [
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0],
];

var shapes = {
	I: [[ 
		1,
		1,
		1,
		1]],

	J: [[2,0,0],
	    [2,2,2]],

	L: [    [3,3,3], 
	    [0,0,3]],

	O: [[4,4],
	    [4,4]],

	S: [    [5,5,0],
         [0,5,5], ],

	T: [[6,6,6],
	    [0,6,0]],

	Z: [	[7,7,0], 
		[0,7,7] ]
};

var colors = ["F92338", "C973FF", "1C76BC", "FEE356", "53D504", "36E0FF", "F8931D"];


var randomSeed = 1;
var mutationRate = 0.1;
var mutationStep = 0.2;

var score = 0;
var speed = 500;
var changeSpeed = false;
var speeds = [500,100,10,1,0]; //speed array with possible speeds
var speedIndex = 0;

var saveState; //current state
var roundState; //current game state

var draw = true;

var actionsTaken = 0;
var actionLimit = 500;
var actionAlgorithm = {};
var inspectActionSelection = false;

var currentShape = {x: 0, y: 0, shape: undefined};
var nextShape; //next shape for the AI
var bag = []; //contains the shapes
var bagIndex = 0;

var populationSize = 50;
var genomes = [];
var currentGenome = -1;
var generation = 0;

//stores values of generations
var archive = {
	populationSize: 0,
	currentGeneration: 0,
	best: [],
	genomes: []
};

/***************/
/***FUNCTIONS***/
/***************/


function main() {
	archive.populationSize = populationSize;
	getNext(); 
	setShape();
	saveState = getState();
	roundState = getState();
	createInitialPopulation();
	//the main loop
	var loop = function(){
		if (changeSpeed) {
			clearInterval(interval);
			interval = setInterval(loop, speed);
			changeInterval = false;
		}
		if (speed === 0) {
			draw = false;
			updateGame();
		} else {
			draw = true;
		}
		updateGame();
		if (speed === 0) {
			draw = true;
			updateScore();
		}
	};
	var interval = setInterval(loop, speed);
}

/**start with this function when the page loads**/ 
document.onLoad = main();

//keyboard commands
window.onkeydown = function (event) {

	var characterPressed = String.fromCharCode(event.keyCode);
	if (characterPressed.toUpperCase() == "A") {
		speedIndex--;
		if (speedIndex < 0) {
			speedIndex = speeds.length - 1;
		}
		speed = speeds[speedIndex];
		changeSpeed = true;
	} 
	output();
	return false;
};

//The Seven Values
function createInitialPopulation() {
 	genomes = [];
 	for (var i = 0; i < populationSize; i++) { 		
	//all weight values that are updated through evolution
 		var genome = {
  			id: Math.random(),
 			//weight of rows cleared in that generation
 			deletedRows: Math.random() - 0.5,
 			//heighest column value in a generation
 			weightedHeight: Math.random() - 0.5,
 			//The sum of all the columns heights
 			cumulativeHeight: Math.random() - 0.5,
 			//the highest column minus the lowest column
 			relativeHeight: Math.random() - 0.5,
 			//sum of all empty cells with values above them
 			holes: Math.random() * 0.5,
 			//the sum differences bw the height each column
 			roughness: Math.random() - 0.5,
 		};
  		genomes.push(genome);
 	}
 	evaluateNextGenome();
 }

/**THREE STEPS OF EVOLUTIONARY ALGORITHM**/

/***STEP 1: SELECTION FUNCTION***/

function evaluateNextGenome() {
  	currentGenome++; //get next genome
	//if there is a next generation, make one by breeding
  	if (currentGenome == genomes.length) {
 		evolve();
 	}
	//else use it to get the next move 
 	loadState(roundState);
 	actionsTaken = 0;
  	takeNextAction();
 }

/***STEP 2: CROSSOVER FUNCTION***/

//sorts genomes in order of fitness values in the array
 function evolve() {
 	console.log("Generation " + generation + " evaluated.");

 	//reset
 	currentGenome = 0;
  	generation++;
  	reset();
 	roundState = getState();
 	
 	genomes.sort(function(a, b) {
 		return b.fitness - a.fitness;
 	});

 	//put the fit to breed, fittest of all, in the best array
 	archive.best.push(clone(genomes[0]));
 	console.log("Best fitness: " + genomes[0].fitness);

 	//pop the rest
 	while(genomes.length > populationSize / 2) {
 		genomes.pop();
 	}

 	var totalFitness = 0;
 	for (var i = 0; i < genomes.length; i++) {
 		totalFitness += genomes[i].fitness;
 	}

 	//RANDOM SELECTION FROM THE FITTEST
	function getRandomGenome() {
		return genomes[randomWeightedNumBetween(0, genomes.length - 1)];
	}

	var children = [];
	children.push(clone(genomes[0]));
	
	//take two random genomes, make a child and push it to 	childrens array
	while (children.length < populationSize) {
		children.push(makeChild(getRandomGenome(), getRandomGenome()));
	}
	
     //genome has the new current generation (children of the last breeding)
	genomes = [];
	genomes = genomes.concat(children);
	archive.genomes = clone(genomes);
	archive.currentGeneration = clone(generation);
	console.log(JSON.stringify(archive));
	localStorage.setItem("archive", JSON.stringify(archive));
}

/***STEP 3: MUTATION***/

function makeChild(mum, dad) {
	//randomly pick mom or dads parameter values for the child 
  	var child = {
 		id : Math.random(),
 		deletedRows: randomChoice(mum.deletedRows, dad.deletedRows),
 		weightedHeight: randomChoice(mum.weightedHeight, dad.weightedHeight),
 		cumulativeHeight: randomChoice(mum.cumulativeHeight, dad.cumulativeHeight),
 		relativeHeight: randomChoice(mum.relativeHeight, dad.relativeHeight),
 		holes: randomChoice(mum.holes, dad.holes),
 		roughness: randomChoice(mum.roughness, dad.roughness),
  		fitness: -1
 	};
 	
 	//we mutate each parameter using our mutationstep
 	if (Math.random() < mutationRate) {
 		child.deletedRows = child.deletedRows + Math.random() * mutationStep * 2 - mutationStep;
 	}
 	if (Math.random() < mutationRate) {
 		child.weightedHeight = child.weightedHeight + Math.random() * mutationStep * 2 - mutationStep;
 	}
 	if (Math.random() < mutationRate) {
 		child.cumulativeHeight = child.cumulativeHeight + Math.random() * mutationStep * 2 - mutationStep;
 	}
 	if (Math.random() < mutationRate) {
 		child.relativeHeight = child.relativeHeight + Math.random() * mutationStep * 2 - mutationStep;
 	}
 	if (Math.random() < mutationRate) {
 		child.holes = child.holes + Math.random() * mutationStep * 2 - mutationStep;
 	}
 	if (Math.random() < mutationRate) {
 		child.roughness = child.roughness + Math.random() * mutationStep * 2 - mutationStep;
 	}
 	return child;
//we now have a child
 }

/**END OF STEPS OF EVOLUTIONARY ALGORITHM**/


/***GETTERS & SETTER***/

 function getAllActions() {
 	var last = getState();
 	var possibleActions = [];
 	var possibleActionRatings = [];
 	for (var r = 0; r < 4; r++) {
 		var old = [];
 		for (var t = -5; t <= 5; t++) {
 			loadState(last);
 			for (var j = 0; j < r; j++) {rotateShape();}
 			if (t < 0) {
 				for (var l = 0; l < Math.abs(t); l++) {toLeft();}
 			} else if (t > 0) {
 				for (var r = 0; r < t; r++) {toRight();}
 			}
 			if (!contains(old, currentShape.x)) {
 				var moveDownResults = moveDown();
 				while (moveDownResults.moved) {
 					moveDownResults = moveDown();
 				}
 				//set the 7 parameters of a genome
 				var algorithm = {
 					deletedRows: moveDownResults.deletedRows,
 					weightedHeight: Math.pow(getHeight(), 1.5),
 					cumulativeHeight: getHeightOfAllColumns(),
 					relativeHeight: getRelativeHeight(),
 					holes: getHoles(),
 					roughness: getRoughness()
 				};
 				//rate each move
 				var rating = 0;
 				rating += algorithm.deletedRows * genomes[currentGenome].deletedRows;
 				rating += algorithm.weightedHeight * genomes[currentGenome].weightedHeight;
 				rating += algorithm.cumulativeHeight * genomes[currentGenome].cumulativeHeight;
 				rating += algorithm.relativeHeight * genomes[currentGenome].relativeHeight;
 				rating += algorithm.holes * genomes[currentGenome].holes;
 				rating += algorithm.roughness * genomes[currentGenome].roughness;
 				//if the move causes the game to lose, lower its rating
 				if (moveDownResults.lose) {
 					rating -= 500;
 				}
 				//push all moves with its ratings to array
 				possibleActions.push({rotations: r, translation: t, rating: rating, algorithm: algorithm});
 				old.push(currentShape.x);
 			}
 		}
 	}
 	loadState(last);
 	return possibleActions;
 }
 
 function getHighestRatedAction(actions) {
 	var maxRate = -10000000000000;
 	var maxAction = -1;
 	var ties = [];
 	for (var index = 0; index < actions.length; index++) {
 		if (actions[index].rating > maxRate) {
 			maxRate = actions[index].rating;
 			maxAction = index;
 			ties = [index];
 		} else if (actions[index].rating == maxRate) {
 			ties.push(index);
 		}
 	}
	var action = actions[ties[0]];
	action.algorithm.ties = ties.length;
	return action; //action has the highest rated action
}

//gets the next shape from the bag
function getNext() {
 	bagIndex += 1;
 	if (bag.length === 0 || bagIndex == bag.length) {getBag();}
 	if (bagIndex == bag.length - 1) {
 		var prevSeed = randomSeed;
 		nextShape = randomProperty(shapes);
 		randomSeed = prevSeed;
 	} else {
 		nextShape = shapes[bag[bagIndex + 1]];
 	}
 	currentShape.shape = shapes[bag[bagIndex]];
 	currentShape.x = Math.floor(game[0].length / 2) - Math.ceil(currentShape.shape[0].length / 2);
 	currentShape.y = 0;
 }

//gets the state of the game
function getState() {
 	var state = {
 		game: clone(game),
 		currentShape: clone(currentShape),
 		nextShape: clone(nextShape),
 		bag: clone(bag),
 		bagIndex: clone(bagIndex),
 		randomSeed: clone(randomSeed),
 		score: clone(score)
 	};
 	return state;
 }
 
 function getHeightOfAllColumns() {
 	var totalHeight = 0;
 	deleteShape();
 	var peaks = [20,20,20,20,20,20,20,20,20,20];
 	for (var row = 0; row < game.length; row++) {
 		for (var col = 0; col < game[row].length; col++) {
 			if (game[row][col] !== 0 && peaks[col] === 20) {
 				peaks[col] = row;
 			}
 		}
 	}
 	for (var i = 0; i < peaks.length; i++) {
 		totalHeight += 20 - peaks[i];
 	}
 	setShape();
 	return totalHeight;
 }

//get a bag with a newly randomly generated shape
 function getBag() {
 	bag = [];
 	var contents = "";
 	for (var i = 0; i < 7; i++) {
 		var shape = randomKey(shapes);
 		while(contents.indexOf(shape) != -1) {
 			shape = randomKey(shapes);
 		}
 		bag[i] = shape;
 		contents += shape;
 	}
 	bagIndex = 0;
 }
 
//gets the number of holes "zero" inbetween non zero values
 function getHoles() {
 	var holes = 0;
 	deleteShape();
 	var peaks = [20,20,20,20,20,20,20,20,20,20];
 	for (var row = 0; row < game.length; row++) {
 		for (var col = 0; col < game[row].length; col++) {
 			if (game[row][col] !== 0 && peaks[col] === 20) {
 				peaks[col] = row;
 			}
 		}
 	}
 	for (var x = 0; x < peaks.length; x++) {
 		for (var y = peaks[x]; y < game.length; y++) {
 			if (game[y][x] === 0) {
 				holes++;
 			}
 		}
 	}
 	setShape();
 	return holes;
 }

 //gets an array with all holes in the name by replacing it to -1
 function getHolesArray() {
 	var temp = clone(game);
 	deleteShape();
 	var peaks = [20,20,20,20,20,20,20,20,20,20];
 	for (var row = 0; row < game.length; row++) {
 		for (var col = 0; col < game[row].length; col++) {
 			if (game[row][col] !== 0 && peaks[col] === 20) {
 				peaks[col] = row;
 			}
 		}
 	}
 	for (var x = 0; x < peaks.length; x++) {
 		for (var y = peaks[x]; y < game.length; y++) {
 			if (game[y][x] === 0) {
 				temp[y][x] = -1;
 			}
 		}
 	}
 	setShape();
 	return temp;
 }

function getRoughness() {
 	deleteShape();
 	var peaks = [20,20,20,20,20,20,20,20,20,20];
 	for (var row = 0; row < game.length; row++) {
 		for (var col = 0; col < game[row].length; col++) {
 			if (game[row][col] !== 0 && peaks[col] === 20) {
 				peaks[col] = row;
 			}
 		}
 	}
 	var roughness = 0;
 	var differences = [];
 	for (var i = 0; i < peaks.length - 1; i++) {
 		roughness += Math.abs(peaks[i] - peaks[i + 1]);
 		differences[i] = Math.abs(peaks[i] - peaks[i + 1]);
 	}
 	setShape();
 	return roughness;
 }

 //gets the range of column heights
 function getRelativeHeight() {
 	deleteShape();
 	var peaks = [20,20,20,20,20,20,20,20,20,20];
 	for (var row = 0; row < game.length; row++) {
 		for (var col = 0; col < game[row].length; col++) {
 			if (game[row][col] !== 0 && peaks[col] === 20) {
 				peaks[col] = row;
 			}
 		}
 	}
 	setShape();
 	return Math.max.apply(Math, peaks) - Math.min.apply(Math, peaks);
 }

 //gets the biggest height
 function getHeight() {
 	deleteShape();
 	var peaks = [20,20,20,20,20,20,20,20,20,20];
 	for (var row = 0; row < game.length; row++) {
 		for (var col = 0; col < game[row].length; col++) {
 			if (game[row][col] !== 0 && peaks[col] === 20) {
 				peaks[col] = row;
 			}
 		}
 	}
 	setShape();
 	return 20 - Math.min.apply(Math, peaks);
 }
 
 function setShape() {
 	for (var row = 0; row < currentShape.shape.length; row++) {
 		for (var col = 0; col < currentShape.shape[row].length; col++) {
 			if (currentShape.shape[row][col] !== 0) {game[currentShape.y + row][currentShape.x + col] = currentShape.shape[row][col];}
 		}
 	}
 }
 
 /******/

 
 /***update game states***/
 
 function updateGame() {
 	if (currentGenome != -1) {
 		var results = moveDown();
 		//if we lose, update fitness and get next genome
 		if (!results.moved) {
 			if (results.lose) {
 				genomes[currentGenome].fitness = clone(score);
 				evaluateNextGenome();
 			} else {takeNextAction();}
 		}
 	} else {moveDown();}
 	output();
 	updateScore();
 }
 
 function updateScore() {
 	if (draw) {
 		var scoreDetails = document.getElementById("score");
 		var html = "<br /><br /><h2>&nbsp;</h2><h2>Score: " + score + "</h2>";
 		html += "<br /><b>Next Shape</b>";
 		for (var i = 0; i < nextShape.length; i++) {
 			var next = replaceAll((nextShape[i] + ""), "0", "&nbsp;");
 			html += "<br />&nbsp;&nbsp;&nbsp;&nbsp;" + next;
 		}
 		for (var l = 0; l < 4 - nextShape.length; l++) {
 			html += "<br />";
 		}
 		for (var c = 0; c < colors.length; c++) {
 			html = replaceAll(html, "," + (c + 1), ",<font color=\"" + colors[c] + "\">" + (c + 1) + "</font>");
 			html = replaceAll(html, (c + 1) + ",", "<font color=\"" + colors[c] + "\">" + (c + 1) + "</font>,");
 		}
 		html += "<br /><b>Current Speed: <b>" + speed;
 		html += "<br />Actions Taken: " + actionsTaken + "/" + actionLimit;
 		html += "<br />Generation: " + generation;
 		html += "<br /><pre style=\"font-size:12px\">" + JSON.stringify(genomes[currentGenome], null, 2) + "</pre>";
 		if (inspectActionSelection) {
 			html += "<br /><pre style=\"font-size:12px\">" + JSON.stringify(actionAlgorithm, null, 2) + "</pre>";
 		}
 		html = replaceAll(replaceAll(replaceAll(html, "&nbsp;,", "&nbsp;&nbsp;"), ",&nbsp;", "&nbsp;&nbsp;"), ",", "&nbsp;");
 		scoreDetails.innerHTML = html;
 	}
 }
 
 
 function reset() {
 	score = 0;
 	game = [[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	[0,0,0,0,0,0,0,0,0,0],
 	];
 	moves = 0;
 	getBag();
 	getNext();
 }
 
function output() {
 	if (draw) {
 		var output = document.getElementById("output");
 		var html = "<h1>Tetris</h1>var game = [";
 		var space = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
 		for (var i = 0; i < game.length; i++) {
 			if (i === 0) {
 				html += "[" + game[i] + "]";
 			} else {
 				html += "<br />" + space + "[" + game[i] + "]";
 			}
 		}
 		html += "];";
 		for (var c = 0; c < colors.length; c++) {
 			html = replaceAll(html, "," + (c + 1), ",<font color=\"" + colors[c] + "\">" + (c + 1) + "</font>");
 			html = replaceAll(html, (c + 1) + ",", "<font color=\"" + colors[c] + "\">" + (c + 1) + "</font>,");
 		}
 		output.innerHTML = html;
 	}
 }
/******/

/***Shape Functions***/

function takeNextAction() {
 	actionsTaken++;
 	if (actionsTaken > actionLimit) {
 		genomes[currentGenome].fitness = clone(score);
 		evaluateNextGenome();
 	} else {
 		var oldDraw = clone(draw);
 		draw = false;
 		var possibleActions = getAllActions();
 		var last = getState();
 		getNext();
 		//for each possible action get the best action and add its rating to an array
 		for (var i = 0; i < possibleActions.length; i++) {
 			var nextMove = getHighestRatedAction(getAllActions());
 			possibleActions[i].rating += nextMove.rating;
 		}
 		loadState(last);
 		var action = getHighestRatedAction(possibleActions);
 		for (var rotations = 0; rotations < action.rotations; rotations++) {rotateShape();}
 		if (action.translation < 0) {
 			for (var lefts = 0; lefts < Math.abs(action.translation); lefts++) {toLeft();}
 		} else if (action.translation > 0) {
 			for (var rights = 0; rights < action.translation; rights++) {toRight();}
 		}
 		if (inspectActionSelection) {actionAlgorithm = action.algorithm;}
 		draw = oldDraw;
 		output();
 		updateScore();
 	}
 }
 
 function moveDown() {
 	var result = {lose: false, moved: true, deletedRows: 0};
 	deleteShape();
 	currentShape.y++;
 	if (collides(game, currentShape)) {
 		currentShape.y--;
 		setShape();
 		getNext();
 		result.deletedRows = deleteRows();
 		if (collides(game, currentShape)) {
 			result.lose = true;
 		}
 		result.moved = false;
 	}
 	//apply shape, update the score and output the state
 	setShape();
 	score++;
 	updateScore();
 	output();
 	return result;
 }

 function toLeft() {
 	deleteShape();
 	currentShape.x--;
 	if (collides(game, currentShape)) {
 		currentShape.x++;
 	}
 	setShape();
 }

 function toRight() {
 	deleteShape();
 	currentShape.x++;
 	if (collides(game, currentShape)) {
 		currentShape.x--;
 	}
 	setShape();
 }

 function rotateShape() {
 	deleteShape();
 	currentShape.shape = rotate(currentShape.shape, 1);
 	if (collides(game, currentShape)) {
 		currentShape.shape = rotate(currentShape.shape, 3);
 	}
 	setShape();
 }
 
 //for how many times it should rotate
 function rotate(matrix, times) {
 	for (var t = 0; t < times; t++) {
 		matrix = transpose(matrix);
 		for (var i = 0; i < matrix.length; i++) {
 			matrix[i].reverse();
 		}
 	}
 	return matrix;
 }
 
  function transpose(array) {
 	return array[0].map(function(col, i) {
 		return array.map(function(row) {
 			return row[i];
 		});
 	});
 }
 
 function collides(scene, object) {
 	for (var row = 0; row < object.shape.length; row++) {
 		for (var col = 0; col < object.shape[row].length; col++) {
 			if (object.shape[row][col] !== 0) {
 				if (scene[object.y + row] === undefined || scene[object.y + row][object.x + col] === undefined || scene[object.y + row][object.x + col] !== 0) {
 					return true;
 				}
 			}
 		}
 	}
 	return false;
 }
/******/

/***Delete Functions***/

 function deleteRows() {
 	var deleteRowsArray = [];
 	for (var row = 0; row < game.length; row++) {
 		var containsEmptySpace = false;
 		for (var col = 0; col < game[row].length; col++) {
 			if (game[row][col] === 0) {containsEmptySpace = true;}
 		}
 		if (!containsEmptySpace) {deleteRowsArray.push(row);}
 	}
 	if (deleteRowsArray.length == 1) {score += 400;} 
 	else if (deleteRowsArray.length == 2) {score += 1000;} 
 	else if (deleteRowsArray.length == 3) {score += 3000;} 
 	else if (deleteRowsArray.length >= 4) {score += 12000;}
 	var deletedRows = clone(deleteRowsArray.length);
 	for (var toClear = deleteRowsArray.length - 1; toClear >= 0; toClear--) {game.splice(deleteRowsArray[toClear], 1);}
 	while (game.length < 20) {game.unshift([0,0,0,0,0,0,0,0,0,0]);}
 	return deletedRows;
 }

 function deleteShape() {
 	for (var row = 0; row < currentShape.shape.length; row++) {
 		for (var col = 0; col < currentShape.shape[row].length; col++) {
 			if (currentShape.shape[row][col] !== 0) {game[currentShape.y + row][currentShape.x + col] = 0;}
 		}
 	}
 }

/******/


 /***Load Game States***/
 function loadState(state) {
 	game = clone(state.game);
 	currentShape = clone(state.currentShape);
 	nextShape = clone(state.nextShape);
 	bag = clone(state.bag);
 	bagIndex = clone(state.bagIndex);
 	randomSeed = clone(state.randomSeed);
 	score = clone(state.score);
 	output();
 	updateScore();
 }

 function loadArchive(archiveString) {
 	archive = JSON.parse(archiveString);
 	genomes = clone(archive.genomes);
 	populationSize = archive.populationSize;
 	generation = archive.currentGeneration;
 	currentGenome = 0;
 	reset();
 	roundState = getState();
 	console.log("Archive loaded!");
 }

/******/

/***Random Fucntions***/
function randomKey(obj) {
 	var keys = Object.keys(obj);
 	var i = seededRandom(0, keys.length);
 	return keys[i];
 }
 
 function randomProperty(obj) {
 	return(obj[randomKey(obj)]);
 }
 
 function seededRandom(min, max) {
 	max = max || 1;
 	min = min || 0;

 	randomSeed = (randomSeed * 9301 + 49297) % 233280;
 	var rnd = randomSeed / 233280;

 	return Math.floor(min + rnd * (max - min));
 }

 function randomNumBetween(min, max) {
 	return Math.floor(Math.random() * (max - min + 1) + min);
 }

 function randomWeightedNumBetween(min, max) {
 	return Math.floor(Math.pow(Math.random(), 2) * (max - min + 1) + min);
 }

 function randomChoice(propOne, propTwo) {
 	if (Math.round(Math.random()) === 0) {
 		return clone(propOne);
 	} else {
 		return clone(propTwo);
 	}
 }
 /******/
 
 /***Helper Functions***/
 function clone(obj) {
 	return JSON.parse(JSON.stringify(obj));
 }
 
 function replaceAll(target, search, replacement) {
 	return target.replace(new RegExp(search, 'g'), replacement);
 }
 
 function contains(a, obj) {
 	var i = a.length;
 	while (i--) {
 		if (a[i] === obj) {
 			return true;
 		}
 	}
 	return false;
 }
 
 /******/
