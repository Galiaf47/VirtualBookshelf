import SelectorMeta from './models/SelectorMeta';
import ShelfObject from './models/ShelfObject';
import BookObject from './models/BookObject';
import SectionObject from './models/SectionObject';

import {camera} from './scene';
import {environment} from './scene';
import navigation from './navigation';
import preview from './scene/preview';
import selector from './scene/selector';
import mouse from './scene/mouse';

import './ui/block';
import './ui/tools';
import './ui/tooltip';

angular.module('VirtualBookshelf')
/* 
 * controls.js is a service for processing not UI(menus) events 
 * like mouse, keyboard, touch or gestures.
 *
 * TODO: remove all busines logic from there and leave only
 * events functionality to make it more similar to usual controller
 */
.factory('controls', function ($q, $log, $rootScope, block, tools, data, tooltip) {
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
		if(!preview.isActive()) {
			if(mouse[3]) {
				camera.rotate(mouse.longX, mouse.longY);
			}
			if(mouse[1] && mouse[3]) {
				camera.go(navigation.BUTTONS_GO_SPEED);
			}
		}
	};

	controls.onMouseDown = function(event) {
		mouse.down(event); 

		if(isCanvas() && mouse[1] && !mouse[3] && !preview.isActive()) {
			controls.selectObject();

			if(selector.placing) {
				tools.place();
			} else {
				selector.selectFocused();
			}

			$rootScope.$apply();
		}
	};

	controls.onMouseUp = function(event) {
		mouse.up(event);
		
		if(event.which === 1 && !preview.isActive()) {
			if(selector.isSelectedEditable()) {
				controls.saveObject(
					selector.getSelectedObject()
				);
			}
		}
	};

	controls.saveObject = function(obj) {
		if (obj && obj.changed) {
			block.global.start();

			controls.postObject(obj)
			.then(function (newDto) {
				obj.dataObject = newDto;
				obj.changed = false;
			})
			.catch(function () {
				obj.rollback();
			})
			.finally(function () {
				block.global.stop();
			});
		}
	};

	controls.postObject = function(obj) {
		if (obj instanceof BookObject) {
			return data.postBook(obj.getDto());
		} else if (obj instanceof SectionObject) {
			return data.postSection(obj.getDto());
		}
	};

	controls.onMouseMove = function(event) {
		mouse.move(event);

		if(isCanvas() && !preview.isActive()) {
			event.preventDefault();

			if(mouse[1] && !mouse[3]) {		
				controls.moveObject();
			} else {
				controls.selectObject();
				$rootScope.$apply();
			}
		}
	};

	//****

	controls.selectObject = function() {
		var
			intersected,
			object;

		if(isCanvas() && environment.library) {
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

				if (selector.getSelectedId() !== object.getId()) {
					tooltip.set(object);
				}
			}

			selector.focus(new SelectorMeta(object));
		}
	};

	controls.moveObject = function() {
		var mouseVector;
		var newPosition;
		var parent;
		var selectedObject;

		if(selector.isSelectedEditable()) {
			selectedObject = selector.getSelectedObject();

			if(selectedObject) {
				mouseVector = camera.getVector();	
				newPosition = selectedObject.position.clone();
				parent = selectedObject.parent;
				parent.localToWorld(newPosition);

				newPosition.x -= (mouseVector.z * mouse.dX + mouseVector.x * mouse.dY) * 0.003;
				newPosition.z -= (-mouseVector.x * mouse.dX + mouseVector.z * mouse.dY) * 0.003;

				parent.worldToLocal(newPosition);
				selectedObject.move(newPosition);
			}
		}
	};

	var isCanvas = function() {
		return mouse.getTarget().id === data.LIBRARY_CANVAS_ID;
	};

	return controls;	
});