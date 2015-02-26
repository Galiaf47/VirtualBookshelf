angular.module('VirtualBookshelf')
/* 
 * controls.js is a service for processing not UI(menus) events 
 * like mouse, keyboard, touch or gestures.
 *
 * TODO: remove all busines logic from there and leave only
 * events functionality to make it more similar to usual controller
 */
.factory('controls', function ($q, $log, SelectorMeta, BookObject, ShelfObject, SectionObject, camera, navigation, environment, mouse, selector) {
	var controls = {};

	controls.init = function() {
		controls.initListeners();
	};

	controls.initListeners = function() {
		document.addEventListener('mousedown', controls.onMouseDown, false);
		document.addEventListener('mouseup', controls.onMouseUp, false);
		document.addEventListener('mousemove', controls.onMouseMove, false);	
		document.oncontextmenu = function() {return false;};
	};

	controls.update = function() {
		if(mouse[3]) {
			camera.rotate(mouse.longX, mouse.longY);
		}
		if(mouse[1] && mouse[3]) {
			camera.go(navigation.BUTTONS_GO_SPEED);
		}
	};

	controls.onMouseDown = function(event) {
		mouse.down(event); 

		if(mouse.isCanvas() && mouse[1] && !mouse[3]) {
			controls.selectObject();
			selector.selectFocused();
		}
	};

	controls.onMouseUp = function(event) {
		mouse.up(event);
		
		if(event.which === 1) {
			if(selector.isSelectedEditable()) {
				var obj = selector.getSelectedObject();

				if(obj.changed) {
					obj.save();
				}
			}
		}
	};

	controls.onMouseMove = function(event) {
		mouse.move(event);

		if(mouse.isCanvas()) {
			event.preventDefault();

			if(mouse[1] && !mouse[3]) {		
				controls.moveObject();
			} else {
				controls.selectObject();
			}
		}
	};

	//****

	controls.selectObject = function() {
		var
			intersected,
			object;

		if(mouse.isCanvas() && environment.library) {
			//TODO: optimize
			intersected = mouse.getIntersected(environment.library.children, true, [BookObject]);
			if(!intersected) {
				intersected = mouse.getIntersected(environment.library.children, true, [ShelfObject]);
			}
			if(!intersected) {
				intersected = mouse.getIntersected(environment.library.children, true, [SectionObject]);
			}
			if(intersected) {
				object = intersected.object;
			}

			selector.focus(new SelectorMeta(object));
		}
	};

	controls.moveObject = function() {
		var mouseVector;
		var newPosition;
		var intersected;
		var parent;
		var oldParent;
		var selectedObject;

		if(selector.isSelectedEditable()) {
			selectedObject = selector.getSelectedObject();
			mouseVector = camera.getVector();	

			newPosition = selectedObject.position.clone();
			oldParent = selectedObject.parent;

			if(selector.isSelectedBook()) {
				intersected = mouse.getIntersected(environment.library.children, true, [ShelfObject]);
				selectedObject.setParent(intersected ? intersected.object : null);
			}

			parent = selectedObject.parent;
			if(parent) {
				parent.localToWorld(newPosition);

				newPosition.x -= (mouseVector.z * mouse.dX + mouseVector.x * mouse.dY) * 0.003;
				newPosition.z -= (-mouseVector.x * mouse.dX + mouseVector.z * mouse.dY) * 0.003;

				parent.worldToLocal(newPosition);
				if(!selectedObject.move(newPosition) && selector.isSelectedBook()) {
					if(parent !== oldParent) {
						selectedObject.setParent(oldParent);
					}
				}
			}
		}
	};

	return controls;	
});