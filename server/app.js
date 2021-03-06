if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({silent: true});
}

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var i18n = require('i18n');
var models = require('./models');

var firebaseRoute = require('./security/firebase');
var auth = require('./security/auth');
var passport = require('passport');

var app = express();

i18n.configure({
    locales: ['en', 'ru'],
    cookie: 'locale',
    directory: __dirname + '/locales'
});

// all environments
app.set('port', process.env.PORT || 3000);
app.set('host', process.env.NODE_HOST || ('http://127.0.0.1' + ':' + app.get('port')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

passport.use(auth.authGoogle(app.get('host')));
passport.use(auth.authTwitter(app.get('host')));
passport.use(auth.authFacebook(app.get('host')));
passport.use(auth.authVkontakte(app.get('host')));

app.disable('x-powered-by');
app.use(express.favicon(path.join(__dirname, '/favicon.ico')));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(passport.initialize());
app.use(passport.session());
app.use(i18n.init);
app.use(app.router);
app.use(express.static(path.join(__dirname, '../public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/:libraryId([0-9]+)?', routes.index);
app.get('/ui/:page', routes.ui);

app.get('/auth/firebase/customToken/vk/:uid', firebaseRoute.getCustomTokenVK);
app.get('/auth/close', routes.page);
app.get('/auth/google', passport.authenticate('google', { 
    scope: ['https://www.googleapis.com/auth/plus.profile.emails.read'] 
}));
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/vkontakte', passport.authenticate('vkontakte'));
app.get(auth.PROVIDERS.google.callbackURL, passport.authenticate('google', {
    failureRedirect: '/auth/close', 
    successRedirect: '/auth/close'
}));
app.get(auth.PROVIDERS.twitter.callbackURL, passport.authenticate('twitter', {
    failureRedirect: '/auth/close', 
    successRedirect: '/auth/close'
}));
app.get(auth.PROVIDERS.facebook.callbackURL, passport.authenticate('facebook', {
    failureRedirect: '/auth/close', 
    successRedirect: '/auth/close'
}));
app.get(auth.PROVIDERS.vkontakte.callbackURL, passport.authenticate('vkontakte', {
    failureRedirect: '/auth/close', 
    successRedirect: '/auth/close'
}));
app.post('/auth/logout', routes.logout);

app.post('/cover', isAuthorized, routes.cover.postCover);

app.get('/library/:libraryId', isAuthorized, routes.library.getLibrary);
app.get('/libraries', auth.isAuthenticated(false), routes.library.getLibraries);
app.post('/library/:libraryModel', isAuthorized, routes.library.postLibrary);

app.post('/section', isAuthorized, routes.section.postSection);
app.get('/sections/:libraryId', isAuthorized, routes.section.getSections);
app.put('/sections', isAuthorized, routes.section.putSections);
app.delete('/sections/:id', isAuthorized, routes.section.deleteSection);

app.post('/book', isAuthorized, routes.book.postBook);
app.get('/freeBooks/:userId', isAuthorized, routes.book.getFreeBooks);
app.delete('/book/:id', isAuthorized, routes.book.deleteBook);

app.get('/user', auth.isAuthenticated(true), routes.user.getUser);
app.put('/user', auth.isAuthenticated(true), routes.user.putUser);
app.delete('/user/:id', auth.isAuthenticated(true), routes.user.deleteUser);

models.init(function(err) {
    if(!err) {
        http.createServer(app).listen(app.get('port'), function(){
            console.log('Express server listening on port ' + app.get('port'));
        });
    } else {
        console.log('DAO init error: ', err);
    }
});

function isAuthorized(req, res, next) {
    if(req.user) {
        next();
    } else {
        req.user = {};
        next();
    }
}

// app.get('/js/app.js', delay(5000))
function delay(ms) {
    return function (req, res, next) {
        console.warn('delay start:', req.url, ms);

        setTimeout(function () {
            console.log('delay end:', req.url, ms);
            next();
        }, ms);
    };
}