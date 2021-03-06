import {ShelfObject} from 'lib3d';
import {BookObject} from 'lib3d';
import {SelectorMetaDto} from 'lib3d';
import {locator} from 'lib3d';
import {preview} from 'lib3d';
import {selector} from 'lib3d';

import * as lib3d from 'lib3d';

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

	tools.placing = false;

	tools.getSelectedDto = function() {
		let selectedObject = selector.getSelectedObject();
		
		if (selector.isSelectedBook()) {
			return selectedObject ? selectedObject.dataObject : catalog.getBook(selector.getSelectedId());
		} else if (selector.isSelectedSection()) {
			return selectedObject.dataObject;
		}

		return null;
	};

	tools.place = function() {
		var freePlace;
		var selectedDto;
		var focusedObject = selector.getFocusedObject();

		if(focusedObject instanceof ShelfObject) {
			tools.placing = false;
			selectedDto = tools.getSelectedDto();
			freePlace = locator.placeBook(selectedDto, focusedObject);

			if (!freePlace) {
				growl.error('There is no free space');
				return;
			}

			block.global.start();
			saveBook(selectedDto, freePlace, focusedObject).then(function () {
				return tools.updateBook(selectedDto);
			}).then(function () {
				var bookDto = catalog.getBook(selectedDto.id);
				selector.select(new SelectorMetaDto(BookObject.TYPE, bookDto.id, bookDto.shelfId));
				tools.placing = false;

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

	function saveBook(dto, position, shelf) {
		dto.shelfId = shelf.getId();
		dto.sectionId = shelf.parent.getId();
		dto.pos_x = position.x;
		dto.pos_y = position.y;
		dto.pos_z = position.z;

		return data.postBook(dto);
	}

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

	function unplaceBook(bookDto) {
		bookDto.sectionId = null;

		return data.postBook(bookDto).then(function () {
			return tools.updateBook(bookDto);
		});
	}

	tools.deleteBook = function(id) {
		return data.deleteBook(id).then(function () {
			selector.unselect();
			lib3d.getLibrary().removeBook(id);
			return catalog.loadBooks(user.getId());
		});
	};

	tools.deleteSection = function(id) {
		return data.deleteSection(id).then(function () {
			selector.unselect();
			lib3d.getLibrary().removeSection(id);
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

	tools.updateBook = function(dto) {
		var library = lib3d.getLibrary();

	    if(library.getBookShelf(dto)) {
	        library.removeBook(dto.id);
	        var book = lib3d.factory.createBook(dto);
	        library.addBook(book);

	        return Promise.resolve(true);
	    } else {
	        library.removeBook(dto.id);
	        return Promise.resolve(true);
	    }
	};

	function rotate(scale) {
		var obj;

		if(preview.isActive()) {
			preview.rotate(scale);
		} else {
			obj = selector.getSelectedObject();
			if(obj) obj.rotate(scale);
		}
	}

	return tools;
});