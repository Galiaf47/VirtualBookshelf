angular.module('VirtualBookshelf')
.factory('main', function ($log, $q, camera, controls, user, environment, tools, navigation, authorization, block) {	
	var canvas;
	var renderer;
	
	var main = {};

	main.start = function() {
		var winResize;

		if(!Detector.webgl) {
			Detector.addGetWebGLMessage();
		}

		init();
		controls.init();

		winResize = new THREEx.WindowResize(renderer, camera.camera);

		startRenderLoop();

		block.global.start();
		user.load().then(function () {
			return $q.all([environment.loadLibrary(user.getLibrary() || 1), authorization.loadUserData()]);
		}).catch(function (error) {
			$log.error(error);
			//TODO: show error message  
		}).finally(function () {
			environment.setLoaded(true);
			block.global.stop();
		});		
	};

	var init = function() {
		var width = window.innerWidth;
		var height = window.innerHeight;

		canvas = document.getElementById(environment.LIBRARY_CANVAS_ID);
		renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
		renderer.setSize(width, height);

		environment.scene = new THREE.Scene();
		environment.scene.fog = new THREE.Fog(0x000000, 4, 7);
	};

	var startRenderLoop = function() {
		requestAnimationFrame(startRenderLoop);

		controls.update();
		navigation.update();
		tools.update();
		
		renderer.render(environment.scene, camera.camera);
	};

	return main;
});