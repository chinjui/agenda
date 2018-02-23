var express = require('express');
var router = express.Router();
var admin = require('firebase-admin');
var fs = require('fs');

var serviceAccount = require('../week-calendar-194609-firebase-adminsdk-o53vz-a2d31d8bc9.json');

var admin_uid = "g3zIfkYXPuSSfCAM6ehVdISESOl2";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://week-calendar-194609.firebaseio.com'
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* GET admin page. */
router.get('/admin', function(req, res, next) {
  res.render('admin', {title: 'Admin Page'});
});

router.post('/add-events', function(req, res, next) {
  var access_token = req.body['access_token'];
  var events_str = req.body['events'];
  // verify user
  admin.auth().verifyIdToken(access_token)
    .then(function(decodedToken) {
      var uid = decodedToken.uid;
      var name = decodedToken.name;
      var path = __dirname + '/../data/agendas/' + uid;

      var addEventToFile = function() {
        fs.writeFile(path + '/today', events_str, function(err) {
          if(err) {
            return console.log(err);
          }
          console.log(path + "/today  was saved!");
        });
      };

      // create directory for user
      fs.mkdir(path, 0744, function(err) {
        if (err) {
          if (err.code == 'EEXIST') addEventToFile(); // ignore the error if the folder already exists
          else console.log(err.toString());
        }
        else addEventToFile(); // successfully created folder
      });
      res.send('You uid is: ' + uid);
    }).catch(function(error) {
      res.send(error.toString() + '. Failed to verify user.');
    });
});

router.post('/get-events', function(req, res, next){
  var access_token = req.body['access_token'];
  var requested_uid = req.body['requested_uid'];

  // verify user
  admin.auth().verifyIdToken(access_token)
    .then(function(decodedToken) {
      var uid = decodedToken.uid;
      var name = decodedToken.name;
      if (admin_uid == uid && typeof(requested_uid) != 'undefined')
        uid = requested_uid;
      else if (admin_uid != uid && typeof(requested_uid) != 'undefined') {
        res.end('You are not an admin!');
        return;
      }
      var path = __dirname + '/../data/agendas/' + uid;
      var user_info_path = __dirname + '/../public/users';

      var readEventFromFile = function() {
        fs.readFile(path + '/today', function(err, data) {
          if(err)
            res.end(err.toString());
          res.end(data);
        });
      };
      var addUserIfNotExist = function(uid, name) {
        fs.readFile(user_info_path, function(err, data) {
          if (err)
            console.log(err);
          users = JSON.parse(data);
          if (!users.hasOwnProperty(uid)) {
            console.log('name: ' + name + ', '+ uid);
            users[uid] = name;
            fs.writeFile(user_info_path, JSON.stringify(users), function(err) {
              if(err) {
                return console.log(err);
              }
              console.log('User ' + name + ' was saved!');
            });
          }
        });
      };

      // create directory for user
      fs.mkdir(path, 0744, function(err) {
        if (err) {
          if (err.code == 'EEXIST') readEventFromFile(); // ignore the error if the folder already exists
          else console.log(err);
        }
        else { // user signed in for the 1st time
          readEventFromFile();
        }
      });
      addUserIfNotExist(uid, name);
    }).catch(function(error) {
      res.send(error.toString() + '. Failed to verify user.');
    });

});
module.exports = router;
