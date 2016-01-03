import SelectorMetaDto from '../models/SelectorMetaDto';
import ShelfObject from '../models/ShelfObject';
import BookObject from '../models/BookObject';

import {environment} from '../scene';
import {locator} from '../scene';
import preview from '../scene/preview';
import selector from '../scene/selector';

import '../data';
import '../dialog';
import '../ui/block';
import '../ui/catalog';
import '../user';

angular.module('VirtualBookshelf')
.factory('tools', function ($q, $log, data, dialog, block, catalog, user, growl) {
	var tools = {};

	var ROTATION_SCALE = 1;

	var states = {
		rotateLeft: false,
		rotateRight: false
	};

	tools.getSelectedDto = function() {
		if (selector.isSelectedBook()) {
			return catalog.getBook(selector.getSelectedId());
		} else if (selector.isSelectedSection()) {
			return environment.getSection(selector.getSelectedId());
		}

		return null;
	};

	tools.place = function() {
		var selectedDto;
		var focusedObject = selector.getFocusedObject();

		if(focusedObject instanceof ShelfObject) {
			selector.placing = false;
			selectedDto = tools.getSelectedDto();

			block.global.start();
			$q.when(locator.placeBook(selectedDto, focusedObject)).then(function (position) {
				return saveBook(selectedDto, position, focusedObject);
			}).then(function (newDto) {
				return environment.updateBook(newDto);
			}).then(function () {
				var bookDto = catalog.getBook(selectedDto.id);
				selector.select(new SelectorMetaDto(BookObject.TYPE, bookDto.id, bookDto.shelfId));
				growl.success('Book placed');
			}).catch(function (error) {
				growl.error(error);
				$log.error(error);
			}).finally(function () {
				block.global.stop();
			});
		} else {
			growl.error('Shelf is not selected');
		}
	};

	var saveBook = function(dto, position, shelf) {
		dto.shelfId = shelf.getId();
		dto.sectionId = shelf.parent.getId();
		dto.pos_x = position.x;
		dto.pos_y = position.y;
		dto.pos_z = position.z;

		return data.postBook(dto);
	};

	tools.unplace = function() {
		var bookDto = selector.isSelectedBook() ? tools.getSelectedDto() : null;

		if(bookDto) {
			block.global.start();
			unplaceBook(bookDto).then(function () {
				growl.success('Book unplaced');
				return catalog.loadBooks(user.getId());		
			}).catch(function (error) {
				growl.error(error);
				$log.error(error);
			}).finally(function () {
				block.global.stop();
			});
		}
	};

	var unplaceBook = function(bookDto) {
		bookDto.sectionId = null;

		return data.postBook(bookDto).then(function () {
			return environment.updateBook(bookDto);
		});
	};

	tools.deleteBook = function(id) {
		return data.deleteBook(id).then(function () {
			selector.unselect();
			environment.removeBook(id);
			return catalog.loadBooks(user.getId());
		});
	};

	tools.deleteSection = function(id) {
		return data.deleteSection(id).then(function () {
			selector.unselect();
			environment.removeSection(id);
		});
	};

	tools.rotateLeft = function() {
		states.rotateLeft = true;
	};

	tools.rotateRight = function() {
		states.rotateRight = true;
	};

	tools.stop = function() {
		states.rotateLeft = false;
		states.rotateRight = false;
	};

	tools.update = function() {
		if(states.rotateLeft) {
			rotate(ROTATION_SCALE);
		} else if(states.rotateRight) {
			rotate(-ROTATION_SCALE);
		}
	};

	var rotate = function(scale) {
		var obj;

		if(preview.isActive()) {
			preview.rotate(scale);
		} else {
			obj = selector.getSelectedObject();
			if(obj) obj.rotate(scale);
		}
	};

	return tools;
});