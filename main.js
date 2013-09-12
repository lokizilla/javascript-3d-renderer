/* Author: Leslie "Loki" Moore
	Prerequisites: Sylvester (matrix.js, vector.js, sylvester.js), jQuery
*/

// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
// -------------------------------------------------- initial setup and globals ---------- //
// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
// --- globals
	// --- global switches
		var running = true; // turn on or off globally
		var flag_debug = false; // output console logs
		var flag_debug_verbose = false; // debug verbosely
		var flag_trigger_debugger = false; // trigger the webkit debugger at each loop of animate()
		var flag_trigger_debugger_verbose = false; // trigger the webkit debugger at each stage of the pipeline
		var flag_wireFrame = true; // wireframe on / off
		var flag_backFace = true; // backface culling on / off
		var flag_flatShading = false; // flat shading on / off
	// --- canvas elements
		var canvas; // background dom element
		var ctx; // canvas drawing context
		var viewportWidth, viewportHeight; // overall size of canvas
		var index, index2, index3, index4; // loop iterators
	// --- timing variables
		var thisFrame, lastFrame; // timers for fps counter etc.
		var framesRendered = 0;
		var framesRenderedTotal = 0;
	// --- create the concept of a cube
		var totalCubes = 100; // total number of cubes in scene
		// cube contains 12 polygons from 8 vertices // index data is based on these 8 vertices 
		// position data is relative from origin at centre of cube, (0, 0, 0)
		var scale = 400; // scale factor

		// vertex data
		var cubeVertexData = [[- scale, scale, - scale], // 1
		[scale, scale, - scale], // 2
		[-scale, scale, scale,], // 3
		[scale, scale, scale], // 4
		[- scale, - scale, - scale], // 5
		[scale, - scale, - scale], // 6
		[- scale, - scale, scale], // 7
		[scale, - scale, scale]]; // 8

		// index for cube faces / polygons
		var cubeIndex = [[2, 1, 0], // 1 // top
		[1, 2, 3], // 2
		[4, 2, 0], // 3 // left
		[2, 4, 6], // 4
		[4, 5, 7], // 5 // bottom
		[7, 6, 4], // 6
		[0, 1, 4], // 7 // back
		[5, 4, 1], // 8
		[1, 3, 7], // 9 // right
		[7, 5, 1], // 10
		[2, 6, 7], // 11 // front
		[7, 3, 2]]; // 12

		var cubes = []; // empty array
// --- end globals

window.onload = function setUpCanvas() {
	if (flag_debug == true) {console.log("entering window.onload")};
	canvas = $("#backgroundvas"); // get canvas element

	if (typeof canvas === "undefined") {} // if no canvas, do nothing
		else ctx = canvas.get(0).getContext("2d"); // else get 2D drawing context

	if (typeof ctx === "undefined") {} // if no context, do nothing
	else {
		window.addEventListener('resize', resizeCanvas, false); // resize canvas on resize of window using attached function

		if (flag_debug == true) {console.log("  calling resizeCanvas() from window.onload")};
		resizeCanvas(); // size canvas to window
		if (flag_debug == true) {console.log("  calling setUpAnimation() from window.onload")};
		setUpAnimation(); // perform setup
		if (flag_debug == true) {console.log("  calling animate() from window.onload")};
		animate(); // begin animation
	}
};

function setUpAnimation()
{
	if (flag_debug == true) {console.log("      entering setUpAnimation()")};
	// --- push cubes onto array with random parameters
	for (index = 0; index < totalCubes; index++) // for total cubes requested:
	{
		// cubes are made of:
		// 2 triangles per face, 6 faces = 12 triangles (x, y, z for each, referencing cubeIndex)
		// colour + alpha per face
		// start position of cube (x, y, z)
		// speed of movement (x, y, z)

		// push cubes
		cubes.push({
			polygon: [], // filled below
			position: /*{x: 0, y: 0, z: 0},*/ {x: getRandomInt(-20000, 20000), y: getRandomInt(-20000, 20000), z: getRandomInt(13000, 36000)},
			rotation: /*{x: 0, y: 0, z: 0},*/ {x: getRandomInt(-1000, 1000), y: getRandomInt(-1000, 1000), z: getRandomInt(-1000, 1000)},
			speed: {x: getRandomInt(- 10, 10), y: getRandomInt(- 10, 10), z: getRandomInt(- 10, 10)} // speed of movement
		});

		// push polys into cube
		for (index2 = 0; index2 < 12; index2++)
		{
			cubes[index].polygon.push({
				originalVerts: cubeIndex[index2], // forms lookup into index
				currentVert0: Sylvester.Vector.create([0, 0, 0, 1]),
				currentVert1: Sylvester.Vector.create([0, 0, 0, 1]),
				currentVert2: Sylvester.Vector.create([0, 0, 0, 1]), // vertex data
				active: true, // used in backface culling
				colour: 'rgba(' + getRandomInt(30, 128) + ', ' + getRandomInt(30, 128) + ', ' + getRandomInt(30, 128) + ', 1)', // face colour
				normal: Sylvester.Vector.create([0, 0, 0]) // normal, useful later in pipeline
			});
		}
	}

	if (flag_debug == true) {console.log("      " + totalCubes + " cubes pushed")};

	lastFrame = Date.now(); // get initial timing point

	if (flag_debug == true) {console.log("      leaving setUpAnimation()")};
	if (flag_trigger_debugger_verbose == true) {debugger;}
}









// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------- 3d setup and logic ---------- //
// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
// create the concept of a camera
	// transformation matrices
	var worldTransform = [], cameraTransform = [], perspectiveTransform = [], screenTransform = [];
	// camera properties
	var cameraPosition = Sylvester.Vector.create([0, -300, -2750]), // xyz position
		cameraRotation = Sylvester.Vector.create([0, 0, 0]); // xyz rotation
		if (flag_debug_verbose == true) {console.log("Camera position: " + cameraPosition)};
		if (flag_debug_verbose == true) {console.log("Camera rotation: " + cameraRotation)};
	// view frustum
	var nearDistance = 250, // near frustum
		farDistance = 50000; // far frustum
	// temp matrices
	var tempMat1 = Sylvester.Matrix.I(4, 4), tempMat2 = Sylvester.Matrix.I(4, 4), tempMat3 = Sylvester.Matrix.I(4, 4), tempMat4 = Sylvester.Matrix.I(4, 4), result = Sylvester.Matrix.I(4, 4);
	// temp vertices
	var tempVert1 = Sylvester.Vector.create([0, 0, 0]), tempVert2 = Sylvester.Vector.create([0, 0, 0]), tempVert3 = Sylvester.Vector.create([0, 0, 0]), eyeVector = Sylvester.Vector.create([0, 0, 0]);

// process:
	// --- build the projection transform matrix
	function buildProjectionTransform()
	{
		perspectiveTransform  = Sylvester.Matrix.create([
			[1, 0, 0, 0], 
			[0, viewportWidth / viewportHeight, 0, 0], // aspect ratio correction
			[0, 0, 0, 0],
			[0, 0, 1, 0]
		]);
	}

	function buildScreenTransform()
	{
		// Calculate values
		var temp_width = viewportWidth / 2;
		var temp_height = viewportHeight / 2;

		// Create the screen space matrix (a, 0, 0, a, 0, -b, 0, b, 0, 0, 1, 0, 0, 0, 0, 1)
		screenTransform = Sylvester.Matrix.create(
			[[temp_width - 0.5, 0, 0, temp_width - 0.5],
			[0, -temp_height - 0.5, 0, temp_height - 0.5],
			[0, 0, 1, 0],
			[0, 0, 0, 1]]
		);
	}

	// --- build the camera transformation matrix
	function buildCameraTransform()
	{
		if (flag_debug == true) {console.log("entering buildCameraTransform()")};
		// tempMat1: x, tempMat2: y, tempMat3: z, tempMat4: translation

		// reset matrices:
		result = Sylvester.Matrix.I(4, 4);

		// calculate inverse rotation matrices
			// rotation on x axis:
			tempMat1.elements[0][0] = 1; tempMat1.elements[0][1] = 0; tempMat1.elements[0][2] = 0; tempMat1.elements[0][3] = 0;
			tempMat1.elements[1][0] = 0; tempMat1.elements[1][1] = Math.cos(cameraRotation.elements[0]); tempMat1.elements[1][2] = Math.sin(cameraRotation.elements[0]); tempMat1.elements[1][3] = 0;
			tempMat1.elements[2][0] = 0; tempMat1.elements[2][1] = - Math.sin(cameraRotation.elements[0]); tempMat1.elements[2][2] = Math.cos(cameraRotation.elements[0]); tempMat1.elements[2][3] = 0;
			tempMat1.elements[3][0] = 0; tempMat1.elements[3][1] = 0; tempMat1.elements[3][2] = 0; tempMat1.elements[3][3] = 1;

			if (flag_debug_verbose == true) {console.log("  x axis rotation matrix: " + tempMat1.elements)};
			result = result.multiply(tempMat1);

			// rotation on y axis:
			tempMat2.elements[0][0] = Math.cos(cameraRotation.elements[1]); tempMat2.elements[0][1] = 0; tempMat2.elements[0][2] = - Math.sin(cameraRotation.elements[1]); tempMat2.elements[0][3] = 0;
			tempMat2.elements[1][0] = 0; tempMat2.elements[1][1] = 1; tempMat2.elements[1][2] = 0; tempMat2.elements[1][3] = 0;
			tempMat2.elements[2][0] = Math.sin(cameraRotation.elements[1]); tempMat2.elements[2][1] = 0; tempMat2.elements[2][2] = Math.cos(cameraRotation.elements[1]); tempMat2.elements[2][3] = 0;
			tempMat2.elements[3][0] = 0; tempMat2.elements[3][1] = 0; tempMat2.elements[3][2] = 0; tempMat2.elements[3][3] = 1;

			if (flag_debug_verbose == true) {console.log("  y axis rotation matrix: " + tempMat2.elements)};
			result = result.multiply(tempMat2);

			// rotation on z axis:
			tempMat3.elements[0][0] = Math.cos(cameraRotation.elements[2]); tempMat3.elements[0][1] = Math.sin(cameraRotation.elements[2]); tempMat3.elements[0][2] = 0; tempMat3.elements[0][3] = 0;
			tempMat3.elements[1][0] = - Math.sin(cameraRotation.elements[2]); tempMat3.elements[1][1] = Math.cos(cameraRotation.elements[2]); tempMat3.elements[1][2] = 0; tempMat3.elements[1][3] = 0;
			tempMat3.elements[2][0] = 0; tempMat3.elements[2][1] = 0; tempMat3.elements[2][2] = 1; tempMat3.elements[2][3] = 0;
			tempMat3.elements[3][0] = 0; tempMat3.elements[3][1] = 0; tempMat3.elements[3][2] = 0; tempMat3.elements[3][3] = 1;

			if (flag_debug_verbose == true) {console.log("  z axis rotation matrix: " + tempMat3.elements)};
			result = result.multiply(tempMat3);

		// calculate inverse translation
		tempMat4.elements[0][0] = 1; tempMat4.elements[0][1] = 0; tempMat4.elements[0][2] = 0; tempMat4.elements[0][3] = - cameraPosition.elements[0];
		tempMat4.elements[1][0] = 0; tempMat4.elements[1][1] = 1; tempMat4.elements[1][2] = 0; tempMat4.elements[1][3] = - cameraPosition.elements[1];
		tempMat4.elements[2][0] = 0; tempMat4.elements[2][1] = 0; tempMat4.elements[2][2] = 1; tempMat4.elements[2][3] = - cameraPosition.elements[2];
		tempMat4.elements[3][0] = 0; tempMat4.elements[3][1] = 0; tempMat4.elements[3][2] = 0; tempMat4.elements[3][3] = 1;

		if (flag_debug_verbose == true) {console.log("  translation matrix: " + tempMat4)};

		result = result.multiply(tempMat4);
		cameraTransform = result;

		if (flag_debug_verbose == true) {console.log("  camera transform matrix: " + cameraTransform.elements)};

		if (flag_debug == true) {console.log("leaving buildCameraTransform()")};

		if (flag_trigger_debugger_verbose == true) {debugger;}
	}

	// --- for all objects in the scene:
	// --- build a new world-space transform matrix and apply to verts
	function worldSpaceTransform()
	{
		if (flag_debug == true) {console.log("entering worldSpaceTransform()")};
		// tempMat1: x, tempMat2: y, tempMat3: z, tempMat4: translation

		for (index = 0; index < totalCubes; index++) // for all objects:
		{
			// reset matrices:
			result = Sylvester.Matrix.I(4, 4);

			if (flag_debug_verbose == true) {console.log("  object: " + index)};
			// --- create the matrix itself
				// calculate translation
				tempMat4.elements[0][0] = 1; tempMat4.elements[0][1] = 0; tempMat4.elements[0][2] = 0; tempMat4.elements[0][3] = - cubes[index].position.x;
				tempMat4.elements[1][0] = 0; tempMat4.elements[1][1] = 1; tempMat4.elements[1][2] = 0; tempMat4.elements[1][3] = - cubes[index].position.y;
				tempMat4.elements[2][0] = 0; tempMat4.elements[2][1] = 0; tempMat4.elements[2][2] = 1; tempMat4.elements[2][3] = - cubes[index].position.z;
				tempMat4.elements[3][0] = 0; tempMat4.elements[3][1] = 0; tempMat4.elements[3][2] = 0; tempMat4.elements[3][3] = 1;

				if (flag_debug_verbose == true) {console.log("  translation matrix: " + tempMat4.elements)};
				result = result.multiply(tempMat4);

				// calculate inverse rotation matrices
					// rotation on x axis:
					tempMat1.elements[0][0] = 1; tempMat1.elements[0][1] = 0; tempMat1.elements[0][2] = 0; tempMat1.elements[0][3] = 0;
					tempMat1.elements[1][0] = 0; tempMat1.elements[1][1] = Math.cos(cubes[index].rotation.x); tempMat1.elements[1][2] = - Math.sin(cubes[index].rotation.x); tempMat1.elements[1][3] = 0;
					tempMat1.elements[2][0] = 0; tempMat1.elements[2][1] = Math.sin(cubes[index].rotation.x); tempMat1.elements[2][2] = Math.cos(cubes[index].rotation.x); tempMat1.elements[2][3] = 0;
					tempMat1.elements[3][0] = 0; tempMat1.elements[3][1] = 0; tempMat1.elements[3][2] = 0; tempMat1.elements[3][3] = 1;

					if (flag_debug_verbose == true) {console.log("  x axis rotation matrix: " + tempMat1.elements)};
					result = result.multiply(tempMat1);

					// rotation on y axis:
					tempMat2.elements[0][0] = Math.cos(cubes[index].rotation.y); tempMat2.elements[0][1] = 0; tempMat2.elements[0][2] = Math.sin(cubes[index].rotation.y); tempMat2.elements[0][3] = 0;
					tempMat2.elements[1][0] = 0; tempMat2.elements[1][1] = 1; tempMat2.elements[1][2] = 0; tempMat2.elements[1][3] = 0;
					tempMat2.elements[2][0] = - Math.sin(cubes[index].rotation.y); tempMat2.elements[2][1] = 0; tempMat2.elements[2][2] = Math.cos(cubes[index].rotation.y); tempMat2.elements[2][3] = 0;
					tempMat2.elements[3][0] = 0; tempMat2.elements[3][1] = 0; tempMat2.elements[3][2] = 0; tempMat2.elements[3][3] = 1;

					if (flag_debug_verbose == true) {console.log("  y axis rotation matrix: " + tempMat2.elements)};
					result = result.multiply(tempMat2);

					// rotation on z axis:
					tempMat3.elements[0][0] = Math.cos(cubes[index].rotation.z); tempMat3.elements[0][1] = - Math.sin(cubes[index].rotation.z); tempMat3.elements[0][2] = 0; tempMat3.elements[0][3] = 0;
					tempMat3.elements[1][0] = Math.sin(cubes[index].rotation.z); tempMat3.elements[1][1] = Math.cos(cubes[index].rotation.z); tempMat3.elements[1][2] = 0; tempMat3.elements[1][3] = 0;
					tempMat3.elements[2][0] = 0; tempMat3.elements[2][1] = 0; tempMat3.elements[2][2] = 1; tempMat3.elements[2][3] = 0;
					tempMat3.elements[3][0] = 0; tempMat3.elements[3][1] = 0; tempMat3.elements[3][2] = 0; tempMat3.elements[3][3] = 1;

					if (flag_debug_verbose == true) {console.log("  z axis rotation matrix: " + tempMat3.elements)};
					result = result.multiply(tempMat3);
					worldTransform = result;

					if (flag_debug_verbose == true) {console.log("  world transform matrix: " + worldTransform.elements)};

			// --- apply this to the verts
			for (index2 = 0; index2 < 12; index2++) // for all polys within object:
			{
				// multiply original verts against matrix, output to current verts
				cubes[index].polygon[index2].currentVert0 = matrixTransform(worldTransform,
					[cubeVertexData[cubes[index].polygon[index2].originalVerts[0]][0],
					cubeVertexData[cubes[index].polygon[index2].originalVerts[0]][1],
					cubeVertexData[cubes[index].polygon[index2].originalVerts[0]][2],
					1]);

				cubes[index].polygon[index2].currentVert1 = matrixTransform(worldTransform,
					[cubeVertexData[cubes[index].polygon[index2].originalVerts[1]][0],
					cubeVertexData[cubes[index].polygon[index2].originalVerts[1]][1],
					cubeVertexData[cubes[index].polygon[index2].originalVerts[1]][2],
					1]);

				cubes[index].polygon[index2].currentVert2 = matrixTransform(worldTransform, 
					[cubeVertexData[cubes[index].polygon[index2].originalVerts[2]][0],
					cubeVertexData[cubes[index].polygon[index2].originalVerts[2]][1],
					cubeVertexData[cubes[index].polygon[index2].originalVerts[2]][2],
					1]);
			}
		}

		if (flag_debug == true) {console.log("  applied to verts")};
		if (flag_debug == true) {console.log("leaving worldSpaceTransform()")};

		if (flag_trigger_debugger_verbose == true) {debugger;}
	}

	// --- calculate back face culling
	function calculateBackFaces()
	{
		if (flag_debug == true) {console.log("entering calculateBackFaces()")};

		for (index = 0; index < totalCubes; index++) // for all objects:
		{
			for (index2 = 0; index2 < 12; index2++) // for all polygons:
			{
				// get the 3 indices of the vertices that make up the polygon
				// lookup the verts from those indices on the object

				// construct vector a by subtracting vertex 1 from vertex 0.
				tempVert1.elements[0] = cubes[index].polygon[index2].currentVert0.elements[0]; // vert 0
				tempVert1.elements[1] = cubes[index].polygon[index2].currentVert0.elements[1];
				tempVert1.elements[2] = cubes[index].polygon[index2].currentVert0.elements[2];
				tempVert2.elements[0] = cubes[index].polygon[index2].currentVert1.elements[0]; // vert 1
				tempVert2.elements[1] = cubes[index].polygon[index2].currentVert1.elements[1];
				tempVert2.elements[2] = cubes[index].polygon[index2].currentVert1.elements[2];
				tempVert1 = tempVert1.subtract(tempVert2); // vert 0 - vert 1

				// construct vector b by subtracting vertex 2 from vertex 0.
				tempVert2.elements[0] = cubes[index].polygon[index2].currentVert0.elements[0]; // vert 0
				tempVert2.elements[1] = cubes[index].polygon[index2].currentVert0.elements[1];
				tempVert2.elements[2] = cubes[index].polygon[index2].currentVert0.elements[2];
				tempVert3.elements[0] = cubes[index].polygon[index2].currentVert2.elements[0]; // vert 2
				tempVert3.elements[1] = cubes[index].polygon[index2].currentVert2.elements[1];
				tempVert3.elements[2] = cubes[index].polygon[index2].currentVert2.elements[2];
				tempVert2 = tempVert2.subtract(tempVert3); // vert 0 - vert 2

				// calculate the normal from vector a and b (crossproduct)
				tempVert1 = tempVert1.cross(tempVert2); // a is now the normal

				// Create eye-vector to viewpoint (vertex 0 to the camera position)
				eyeVector.elements[0] = cubes[index].polygon[index2].currentVert0.elements[0]; // vert 0
				eyeVector.elements[1] = cubes[index].polygon[index2].currentVert0.elements[1];
				eyeVector.elements[2] = cubes[index].polygon[index2].currentVert0.elements[2];
				eyeVector = eyeVector.subtract(cameraPosition);

				// normalise the vectors
				vectorNormalise(tempVert1);
				vectorNormalise(eyeVector);

				if (tempVert1.dot(eyeVector) <= 0) {cubes[index].polygon[index2].active = true}
				    else {cubes[index].polygon[index2].active = false};

				// Store the current normal for reference later in the pipeline
				cubes[index].polygon[index2].normal = tempVert1;

				if (flag_debug_verbose == true) {console.log("  object: " + index + " polygon: " + index2 + " set: " + cubes[index].polygon[index2].active)};
			}
		}

		if (flag_debug == true) {console.log("leaving calculateBackFaces()")};
	}

	// --- apply camera-space transform
	function cameraSpaceTransform()
	{
		if (flag_debug == true) {console.log("entering cameraSpaceTransform()")};

		for (index = 0; index < totalCubes; index++) // for all objects:
		{
			for (index2 = 0; index2 < 12; index2++) // for all polys within object:
			{
				// multiply current verts against matrix, output to current verts
				cubes[index].polygon[index2].currentVert0 = matrixTransform(cameraTransform,
					[cubes[index].polygon[index2].currentVert0.elements[0],
					cubes[index].polygon[index2].currentVert0.elements[1],
					cubes[index].polygon[index2].currentVert0.elements[2],
					cubes[index].polygon[index2].currentVert0.elements[3]]
				);

				// multiply current verts against matrix, output to current verts
				cubes[index].polygon[index2].currentVert1 = matrixTransform(cameraTransform,
					[cubes[index].polygon[index2].currentVert1.elements[0],
					cubes[index].polygon[index2].currentVert1.elements[1],
					cubes[index].polygon[index2].currentVert1.elements[2],
					cubes[index].polygon[index2].currentVert1.elements[3]]
				);

				// multiply current verts against matrix, output to current verts
				cubes[index].polygon[index2].currentVert2 = matrixTransform(cameraTransform, 
					[cubes[index].polygon[index2].currentVert2.elements[0],
					cubes[index].polygon[index2].currentVert2.elements[1],
					cubes[index].polygon[index2].currentVert2.elements[2],
					cubes[index].polygon[index2].currentVert2.elements[3]]
				);
			}
		}

		if (flag_debug == true) {console.log("  applied to verts")};
		if (flag_debug == true) {console.log("leaving cameraSpaceTransform()")};

		if (flag_trigger_debugger_verbose == true) {debugger;}
	}

	// --- depth-sort the object
	function depthSort()
	{
		// will return to this later
	}

	// --- apply the projection-space transform
	function projectionSpaceTransform()
	{
		if (flag_debug == true) {console.log("entering projectionSpaceTransform()")};

		for (index = 0; index < totalCubes; index++) // for all objects:
		{
			for (index2 = 0; index2 < 12; index2++) // for all polys within object:
			{
				// multiply current verts against matrix, output to current verts
				cubes[index].polygon[index2].currentVert0 = matrixTransform(perspectiveTransform,
				    [cubes[index].polygon[index2].currentVert0.elements[0],
				    cubes[index].polygon[index2].currentVert0.elements[1],
				    cubes[index].polygon[index2].currentVert0.elements[2],
				    cubes[index].polygon[index2].currentVert0.elements[3]]
				);

				cubes[index].polygon[index2].currentVert1 = matrixTransform(perspectiveTransform,
					[cubes[index].polygon[index2].currentVert1.elements[0],
					cubes[index].polygon[index2].currentVert1.elements[1],
					cubes[index].polygon[index2].currentVert1.elements[2],
					cubes[index].polygon[index2].currentVert1.elements[3]]
				);

				cubes[index].polygon[index2].currentVert2 = matrixTransform(perspectiveTransform,
					[cubes[index].polygon[index2].currentVert2.elements[0],
					cubes[index].polygon[index2].currentVert2.elements[1],
					cubes[index].polygon[index2].currentVert2.elements[2],
					cubes[index].polygon[index2].currentVert2.elements[3]]
				);
			}
		}

		if (flag_debug == true) {console.log("  applied to verts")};
		if (flag_debug == true) {console.log("leaving projectionSpaceTransform()")};

		if (flag_trigger_debugger_verbose == true) {debugger;}
	}

	// --- calculate lighting
	function processLighting()
	{
		// n/a for now
	}

	// --- de-homogenise
	function deHomogenise()
	{
		if (flag_debug == true) {console.log("entering deHomogenise()")};

		// Divide transformed verts by the w co-ordinate
		for (index = 0; index < totalCubes; index++) // for all objects:
		{
			for (index2 = 0; index2 < 12; index2++) // for all polys within object:
			{
				cubes[index].polygon[index2].currentVert0.elements[0] = 
					cubes[index].polygon[index2].currentVert0.elements[0] / cubes[index].polygon[index2].currentVert0.elements[3]; // x
				cubes[index].polygon[index2].currentVert0.elements[1] = 
					cubes[index].polygon[index2].currentVert0.elements[1] / cubes[index].polygon[index2].currentVert0.elements[3]; // y
				cubes[index].polygon[index2].currentVert0.elements[2] = 
					cubes[index].polygon[index2].currentVert0.elements[2] / cubes[index].polygon[index2].currentVert0.elements[3]; // z
				cubes[index].polygon[index2].currentVert0.elements[3] = 
					cubes[index].polygon[index2].currentVert0.elements[3] / cubes[index].polygon[index2].currentVert0.elements[3]; // w

				cubes[index].polygon[index2].currentVert1.elements[0] = 
					cubes[index].polygon[index2].currentVert1.elements[0] / cubes[index].polygon[index2].currentVert1.elements[3]; // x
				cubes[index].polygon[index2].currentVert1.elements[1] = 
					cubes[index].polygon[index2].currentVert1.elements[1] / cubes[index].polygon[index2].currentVert1.elements[3]; // y
				cubes[index].polygon[index2].currentVert1.elements[2] = 
					cubes[index].polygon[index2].currentVert1.elements[2] / cubes[index].polygon[index2].currentVert1.elements[3]; // z
				cubes[index].polygon[index2].currentVert1.elements[3] = 
					cubes[index].polygon[index2].currentVert1.elements[3] / cubes[index].polygon[index2].currentVert1.elements[3]; // w

				cubes[index].polygon[index2].currentVert2.elements[0] = 
					cubes[index].polygon[index2].currentVert2.elements[0] / cubes[index].polygon[index2].currentVert2.elements[3]; // x
				cubes[index].polygon[index2].currentVert2.elements[1] = 
					cubes[index].polygon[index2].currentVert2.elements[1] / cubes[index].polygon[index2].currentVert2.elements[3]; // y
				cubes[index].polygon[index2].currentVert2.elements[2] = 
					cubes[index].polygon[index2].currentVert2.elements[2] / cubes[index].polygon[index2].currentVert2.elements[3]; // z
				cubes[index].polygon[index2].currentVert2.elements[3] = 
					cubes[index].polygon[index2].currentVert2.elements[3] / cubes[index].polygon[index2].currentVert2.elements[3]; // w                                        
			}
		}

		if (flag_debug == true) {console.log("  applied to verts")};
		if (flag_debug == true) {console.log("leaving deHomogenise()")};

		if (flag_trigger_debugger_verbose == true) {debugger;}
	}

	// --- apply screen-space transform
	function screenSpaceTransform()
	{
		if (flag_debug == true) {console.log("entering screenSpaceTransform()")};

		for (index = 0; index < totalCubes; index++) // for all objects:
		{
			for (index2 = 0; index2 < 12; index2++) // for all polys within object:
			{
				// multiply current verts against matrix, output to current verts
				cubes[index].polygon[index2].currentVert0 = matrixTransform(screenTransform,
					[cubes[index].polygon[index2].currentVert0.elements[0],
					cubes[index].polygon[index2].currentVert0.elements[1],
					cubes[index].polygon[index2].currentVert0.elements[2],
					cubes[index].polygon[index2].currentVert0.elements[3]]
				);

				cubes[index].polygon[index2].currentVert1 = matrixTransform(screenTransform,
					[cubes[index].polygon[index2].currentVert1.elements[0],
					cubes[index].polygon[index2].currentVert1.elements[1],
					cubes[index].polygon[index2].currentVert1.elements[2],
					cubes[index].polygon[index2].currentVert1.elements[3]]
				);

				cubes[index].polygon[index2].currentVert2 = matrixTransform(screenTransform,
					[cubes[index].polygon[index2].currentVert2.elements[0],
					cubes[index].polygon[index2].currentVert2.elements[1],
					cubes[index].polygon[index2].currentVert2.elements[2],
					cubes[index].polygon[index2].currentVert2.elements[3]]
				);
			}
		}

		if (flag_debug == true) {console.log("  applied to verts")};
		if (flag_debug == true) {console.log("leaving screenSpaceTransform()")};

		if (flag_trigger_debugger_verbose == true) {debugger;}
	}

	// --- depth sort all objects
	function depthSortScene()
	{
		// revisit this later
	}







// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
// -------------------------------------------------- animation setup and logic ---------- //
// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
function animate()
{
	if (flag_debug == true) {console.log("entering animate()")};

	if (running) requestAnimFrame(animate); // tell browser to render, when running

	update(); // update the elements
	draw(); // draw the frame

	framesRendered++;

	thisFrame = Date.now(); // get current tick
	if (thisFrame - lastFrame > 1000) // if time elapsed is more than 1 second:
	{
		framesRenderedTotal = framesRenderedTotal + framesRendered;

		console.log("fps: " + framesRendered + ", total frames rendered: " + framesRenderedTotal);

		framesRendered = 0; // reset
		lastFrame = thisFrame; // set new reference
	}

	if (flag_debug == true) {console.log("looping animate()")};

	if (flag_trigger_debugger == true) {debugger;}
}

// requestAnim shim layer by Paul Irish
// http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/ (CC0 license)
// TODO: update this to the newer version
	window.requestAnimFrame = (function(){
		return  window.requestAnimationFrame       ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame    ||
			window.oRequestAnimationFrame      ||
			window.msRequestAnimationFrame     ||
			function(/* function */ callback, /* DOMElement */ element){
				window.setTimeout(callback, 1000 / 60);
			};
	})();









// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
// ----------------------------------------- frame-to-frame updates, high level ---------- //
// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
// debug
	var rotation = 0;

function update()
{
	if (flag_debug == true) {console.log("entering update()")};

	// process:
		// move the camera to new pos / rot
		// build a camera transformation matrix (do not apply this yet)
		buildCameraTransform();
		// for all objects in the scene:
			// build a new world-space transform matrix and apply to verts
			worldSpaceTransform();
			// calculate back face culling
			if (flag_backFace == true) {calculateBackFaces();}
			// apply camera-space transform
			cameraSpaceTransform();
			// depth-sort the object
			depthSort();
			// apply projection-space transform
			projectionSpaceTransform();
			// calculate lighting
			processLighting();
			// de-homogenise
			deHomogenise();
			// apply screen-space transform
			screenSpaceTransform();    
			// depth sort all objects
			depthSortScene();



	// debug: give objects some rotation
	for (index = 0; index < totalCubes; index++) // for all objects:
	{
		cubes[index].rotation.x = cubes[index].rotation.x + 0.006;
		cubes[index].rotation.y = cubes[index].rotation.y + 0.012;
		cubes[index].rotation.z = cubes[index].rotation.z + 0.018;
	}

	// debug: give the camera some movement
	rotation += 0.005;
	cameraRotation.elements[0] = -(Math.sin(rotation) * 0.6);
	cameraRotation.elements[1] = Math.sin(rotation * 2.0) * 0.75;
	cameraRotation.elements[2] = Math.sin(rotation * 2.0) * 0.45;
	cameraPosition.elements[0] = Math.sin(rotation * 2.0) * 8000.0;
	cameraPosition.elements[1] = Math.sin(rotation) * 20000.0;
	cameraPosition.elements[2] = Math.sin(rotation * 2.0) * 4000.0;

	if (flag_debug == true) {console.log("leaving update()")};
}









// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
// ---------------------------------------------------------- rasterising logic ---------- //
// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
function draw()
{
	if (flag_debug == true) {console.log("entering draw()")};

	// clear scene:
	ctx.clearRect(0, 0, viewportWidth, viewportHeight); // clear canvas
	ctx.strokeStyle = "rgb(255, 255, 255)";

	// draw dependent on flags:
	if (flag_wireFrame == true)
	{
		for (index = 0; index < totalCubes; index++) // for all cubes:
		{
			for (index2 = 0; index2 < 12; index2++) // for all polys:
			{
				ctx.beginPath(); // begin line
				if (cubes[index].polygon[index2].active == true) // if poly active:
				{
					ctx.moveTo(cubes[index].polygon[index2].currentVert0.elements[0], cubes[index].polygon[index2].currentVert0.elements[1]);
					ctx.lineTo(cubes[index].polygon[index2].currentVert1.elements[0], cubes[index].polygon[index2].currentVert1.elements[1]);
					ctx.lineTo(cubes[index].polygon[index2].currentVert2.elements[0], cubes[index].polygon[index2].currentVert2.elements[1]);
					ctx.lineTo(cubes[index].polygon[index2].currentVert0.elements[0], cubes[index].polygon[index2].currentVert0.elements[1]);
					ctx.stroke(); // commit drawing of line to screen

					if (flag_flatShading == true) // if flat shading active:
					{
						ctx.fillStyle = cubes[index].polygon[index2].colour;
						ctx.fill();
					}
				}
			}
		}
	}

	if (flag_debug == true) {console.log("leaving draw()")};
}









// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
// ----------------------------------------- helper functions and miscellaneous ---------- //
// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
// --- return a pseudo random number within given boundaries
function getRandomInt (min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- return a pseudo random floating-point number within given boundaries
function getRandomFloat (min, max) {
	return Math.random() * (max - min) + min;
}

// --- resize the canvas, if necessary
function resizeCanvas()
{
	if (flag_debug == true) {console.log("      entering resizeCanvas()")};

	ctx.canvas.width = window.innerWidth;
	ctx.canvas.height = window.innerHeight;

	viewportWidth = window.innerWidth;
	viewportHeight = window.innerHeight;

	buildProjectionTransform(); // projection matrix is static on screen size
	buildScreenTransform(); // screen matrix is static on screen size

	if (flag_debug == true) {console.log("          canvas is now " + viewportWidth + "x" + viewportHeight)};
	if (flag_debug_verbose == true) {console.log("          projection matrix is now " + perspectiveTransform.elements)};
	if (flag_debug_verbose == true) {console.log("          screen matrix is now " + screenTransform.elements)};
	if (flag_debug == true) {console.log("      leaving resizeCanvas()")};
	if (flag_trigger_debugger_verbose == true) {debugger;}
}

// --- matrix * vector transformation
function matrixTransform (mat, vec)
{
	return Sylvester.Vector.create(
		[
			mat.elements[0][0] * vec[0] +    mat.elements[0][1] * vec[1] +    mat.elements[0][2] * vec[2] +    mat.elements[0][3] * vec[3], // x
			mat.elements[1][0] * vec[0] +    mat.elements[1][1] * vec[1] +    mat.elements[1][2] * vec[2] +    mat.elements[1][3] * vec[3], // y
			mat.elements[2][0] * vec[0] +    mat.elements[2][1] * vec[1] +    mat.elements[2][2] * vec[2] +    mat.elements[2][3] * vec[3], // z
			mat.elements[3][0] * vec[0] +    mat.elements[3][1] * vec[1] +    mat.elements[3][2] * vec[2] +    mat.elements[3][3] * vec[3]  // w
		]
	);
}

// --- vector dot product
function dotProduct(vec1, vec2)
{
	return (vec1[0] * vec2[0]) + (vec1[1] * vec2[1]) + (vec1[2] * vec2[2]);
}

// --- vector cross product
function crossProduct(vec1, vec2)
{
	return Sylvester.Matrix.create(
		[
			(vec1[1] * vec2[2]) - (vec1[2] * vec2[1]), 
			(vec1[2] * vec2[0]) - (vec1[0] * vec2[2]),
			(vec1[0] * vec2[1]) - (vec1[1] * vec2[0]),
			0
		]
	);
}

function vectorLength(vec) // input: Sylvester.Vector type
{
	return Math.sqrt((vec.elements[0] * vec.elements[0]) + (vec.elements[1] * vec.elements[1]) + (vec.elements[2] * vec.elements[2]));
}

function vectorNormalise(vec) // input: Sylvester.Vector type
{
	var length = vectorLength(vec);

	if (length > 0)
	{
		vec.elements[0] /= length;
		vec.elements[1] /= length;
		vec.elements[2] /= length;
	}
}







// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
// -------------------------------------------------- extra stuff to play with! ---------- //
// --------------------------------------------------------------------------------------- //
// --------------------------------------------------------------------------------------- //
// build a camera transform in one go (untested, ripped from windows project, probably doesn't work, wasn't used there either!)
	//_cameraTransform->Initialise(
	//  (cos(_rotation->_vector._y) * cos(_rotation->_vector._z)) + (sin(_rotation->_vector._y) * sin(_rotation->_vector._x) * sin(_rotation->_vector._z)),
	//  cos(_rotation->_vector._x) * sin(_rotation->_vector._z),
	//  (-(sin(_rotation->_vector._y)) * cos(_rotation->_vector._z)) + (cos(_rotation->_vector._y) * sin(_rotation->_vector._x) * sin(_rotation->_vector._z)),
	//  -(_position->_vector._x * _cameraTransform->_matrix.elements[0][0]) + (_position->_vector._y * _cameraTransform->_matrix.elements[0][1]) + (_position->_vector._z * _cameraTransform->_Sylvester.Matrix.elements[0][2]),

	//  (-(cos(_rotation->_vector._y)) * sin(_rotation->_vector._z)) + (sin(_rotation->_vector._y) * sin(_rotation->_vector._x) * cos(_rotation->_vector._z)),
	//  cos(_rotation->_vector._x) * cos(_rotation->_vector._z),
	//  (sin(_rotation->_vector._y) * sin(_rotation->_vector._z)) + (cos(_rotation->_vector._y) * sin(_rotation->_vector._x) * cos(_rotation->_vector._z)),
	//  -(_position->_vector._x * _cameraTransform->_matrix.elements[1][0]) + (_position->_vector._y * _cameraTransform->_matrix.elements[1][1]) + (_position->_vector._y * _cameraTransform->_Sylvester.Matrix.elements[1][2]),

	//  sin(_rotation->_vector._y) * cos(_rotation->_vector._x),
	//  -sin(_rotation->_vector._x),
	//  cos(_rotation->_vector._y) * cos(_rotation->_vector._x),
	//  -(_position->_vector._x * _cameraTransform->_matrix.elements[2][0]) + (_position->_vector._y * _cameraTransform->_matrix.elements[2][1]) + (_position->_vector._z * _cameraTransform->_Sylvester.Matrix.elements[2][2]),

	//  0, 0, 0, 1);
