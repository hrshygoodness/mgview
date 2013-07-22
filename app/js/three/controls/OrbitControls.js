/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / https://github.com/WestLangley
 * @author aleeper / https://github.com/aleeper
 */

THREE.OrbitControls = function ( object, domElement ) {

	THREE.EventDispatcher.call( this );

	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API

	this.target = new THREE.Vector3();

	this.userZoom = true;
	this.userZoomSpeed = 1.0;

	this.userRotate = true;
	this.userRotateSpeed = 1.0;

	this.allowPan = false;

	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	this.minDistance = 0;
	this.maxDistance = Infinity;

	// internals

	var scope = this;

	var EPS = 0.000001;
	var PIXELS_PER_ROUND = 1800;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var zoomStart = new THREE.Vector2();
	var zoomEnd = new THREE.Vector2();
	var zoomDelta = new THREE.Vector2();

	var panStart =  new THREE.Vector2();
	var panEnd =    new THREE.Vector2();
	var panDelta =  new THREE.Vector2();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;

	var defaultUp = new THREE.Vector3( 0, 1, 0); // y-up is assumed
	var unitZ = new THREE.Vector3( 0, 0, 1); // Needed for the case when camera.up = [0, -1, 0]

	var lastPosition = new THREE.Vector3();

	var STATE = { NONE : -1, ROTATE : 0, ZOOM : 1, PAN : 2 };
	var state = STATE.NONE;

	// events

	var changeEvent = { type: 'change' };

	this.move = function ( delta ) {
		var objectMatrix = this.object.matrix;
		var rM = new THREE.Matrix4();
		rM.extractRotation(objectMatrix);
        var el = rM.elements;
		var x_axis = new THREE.Vector3(el[0], el[1], el[2]);
        var y_axis = new THREE.Vector3(el[4], el[5], el[6]);
        var z_axis = new THREE.Vector3(el[8], el[9], el[10]);

		var offset = new THREE.Vector3();
		offset.add(		x_axis.clone().multiplyScalar(delta.x))
			.add(	y_axis.clone().multiplyScalar(delta.y))
			.add(	z_axis.clone().multiplyScalar(delta.z));
		scope.target.add(offset);
		scope.object.position.add(offset);

	};


	this.rotateLeft = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		thetaDelta -= angle;

	};

	this.rotateRight = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		thetaDelta += angle;

	};

	this.rotateUp = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		phiDelta -= angle;

	};

	this.rotateDown = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		phiDelta += angle;

	};

	this.zoomIn = function ( zoomScale ) {

		if ( zoomScale === undefined ) {

			zoomScale = getZoomScale();

		}

		scale /= zoomScale;

	};

	this.zoomOut = function ( zoomScale ) {

		if ( zoomScale === undefined ) {

			zoomScale = getZoomScale();

		}

		scale *= zoomScale;

	};

	this.update = function () {

		var position = this.object.position;
		var offset = position.clone().sub( this.target );

		// If the camera "up" vector is not [0,1,0], rotate local
		// frame for the purposes of the subsequent polar calculations.
		var didRotate = false;
		var angle = this.object.up.angleTo(defaultUp);
		if ( angle > EPS ) {

			var didRotate = true;
			var rotAxis;

			if(angle < Math.PI - EPS)
				rotAxis = this.object.up.clone().cross(defaultUp).normalize();
			else
				rotAxis = unitZ;

			var quat = new THREE.Quaternion();
			quat.setFromAxisAngle(rotAxis, angle);
			offset.applyQuaternion(quat);

		}

		// angle from z-axis around y-axis

		var theta = Math.atan2( offset.x, offset.z );

		// angle from y-axis

		var phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

		if ( this.autoRotate ) {

			this.rotateLeft( getAutoRotationAngle() );

		}

		theta += thetaDelta;
		phi += phiDelta;

		// restrict phi to be between desired limits
		phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

		// restrict phi to be betwee EPS and PI-EPS
		phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

		var radius = offset.length() * scale;

		// restrict radius to be between desired limits
		radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

		offset.x = radius * Math.sin( phi ) * Math.sin( theta );
		offset.y = radius * Math.cos( phi );
		offset.z = radius * Math.sin( phi ) * Math.cos( theta );

		// If we originally applied a local rotation, now we rotate back!
		if ( didRotate ) {

			offset.applyQuaternion(quat.inverse());

		}

		position.copy( this.target ).add( offset );

		this.object.lookAt( this.target );

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;

		if ( lastPosition.distanceTo( this.object.position ) > 0 ) {

			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.object.position );

		}

	};


	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

	}

	function getZoomScale() {

		return Math.pow( 0.95, scope.userZoomSpeed );

	}

	function onMouseDown( event ) {

		if ( !scope.userRotate ) return;

		event.preventDefault();

		if ( event.button === 0 ) {

			state = STATE.ROTATE;

			rotateStart.set( event.clientX, event.clientY );

		} else if ( event.button === 1 ) {

			state = STATE.ZOOM;

			zoomStart.set( event.clientX, event.clientY );

		} else if ( event.button === 2 && scope.allowPan ) {

			state = STATE.PAN;

			panStart.set( event.clientX, event.clientY );

		}


		document.addEventListener( 'mousemove', onMouseMove, false );
		document.addEventListener( 'mouseup', onMouseUp, false );

	}

	function onMouseMove( event ) {

		event.preventDefault();

		if ( state === STATE.ROTATE ) {

			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			scope.rotateLeft( 2 * Math.PI * rotateDelta.x / PIXELS_PER_ROUND * scope.userRotateSpeed );
			scope.rotateUp( 2 * Math.PI * rotateDelta.y / PIXELS_PER_ROUND * scope.userRotateSpeed );

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.ZOOM ) {

			zoomEnd.set( event.clientX, event.clientY );
			zoomDelta.subVectors( zoomEnd, zoomStart );

			if ( zoomDelta.y > 0 ) {

				scope.zoomIn();

			} else {

				scope.zoomOut();

			}

			zoomStart.copy( zoomEnd );

		} else if ( state === STATE.PAN ) {

			panEnd.set( event.clientX, event.clientY );
			panDelta.subVectors( panEnd, panStart );
			//panDelta.x *= -1;
			var moveVec = new THREE.Vector3(-1.0*panDelta.x, panDelta.y, panDelta.z);
			var position = scope.object.position;
			var offset = position.clone().sub( scope.target );

			moveVec.multiplyScalar(0.0006 * offset.length());

			// TODO this is the code lifted from Rviz (www.ros.org/wiki/rviz)
			// which has the effect of making the cursor move at the same speed as the background
			// If we don't maintain a pointer to the render window though, we can't do much...
			/*
			var fovY = scope.camera.fov;
			var fovX = fovY*scope.camera.aspect;
			var width = camera_->getViewport()->getActualWidth();
			var height = camera_->getViewport()->getActualHeight();
			move( -((float)diff_x / (float)width) * distance * tan( fovX / 2.0f ) * 2.0f,
				((float)diff_y / (float)height) * distance * tan( fovY / 2.0f ) * 2.0f,
				0.0f );*/

			scope.move(moveVec);

			panStart.copy( panEnd );

		}

	}

	function onMouseUp( event ) {

		if ( ! scope.userRotate ) return;

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );

		state = STATE.NONE;

	}

	function onMouseWheel( event ) {

		if ( ! scope.userZoom ) return;

		var delta = 0;

		if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta;

		} else if ( event.detail ) { // Firefox

			delta = - event.detail;

		}

		if ( delta > 0 ) {

			scope.zoomOut();

		} else {

			scope.zoomIn();

		}

	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

};
