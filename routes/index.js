var express = require('express');
var router = express.Router();
var admin = require('firebase-admin');
var fs = require('fs');
var path = require('path');
var schedule = require('node-schedule');
var moment = require('moment');

var serviceAccount = require('../week-calendar-194609-firebase-adminsdk-o53vz-a2d31d8bc9.json');
var admin_uid = "g3zIfkYXPuSSfCAM6ehVdISESOl2";


function get_status(now=null) {
  if (now == null)
    now = moment();
  friday_6pm = now.clone().day(5).startOf('day').hour(18);
  saturday_end = now.clone().endOf('week');
  if (now.isBetween(friday_6pm, saturday_end)) {
    plan_begin = friday_6pm;
    plan_end = plan_begin.clone().endOf('day');
    adjust_end = friday_6pm.clone().add(7, 'days');
  }
  else {
    plan_begin = friday_6pm.clone().add(-7, 'days');
    plan_end = plan_begin.clone().endOf('day');
    adjust_end = friday_6pm.clone();
  }

  if (now.isBefore(plan_end))
    return 'plan';
  else
    return 'adjust';
};

// 'plan' or 'adjust'
var _status = get_status();

// round_end_time: time to `merge plan and adjust to past`, a new round begin
// plan_end_time: tiem to `copy plan to adjust`, plan ends
var round_end_time = moment().startOf('day').day(5).hour(18);
if (moment().isAfter(round_end_time))
  round_end_time.add(7, 'days');
round_end_time = new Date(round_end_time.toString());
var plan_end_time = moment().startOf('day').day(6).hour(1);
if (moment().isAfter(plan_end_time))
  plan_end_time.add(7, 'days');
plan_end_time = new Date(plan_end_time.toString());

/* merge schedule */
var begin_new_round_schedule = null;
function begin_new_round() {
  _status = 'merging';
  console.log('Begin to merge `plan` and `adjust`.');

  // merge
  agendas_dir = './data/agendas';
  user_dirs = fs.readdirSync(agendas_dir);
  for (var i = 0; i < user_dirs.length; i ++) {
    if (user_dirs[i][0] != '.') {   // if is a normal file
      user_dir = path.join(agendas_dir, user_dirs[i]);
      var past, plan, adjust;
      try {past = JSON.parse(fs.readFileSync(path.join(user_dir, 'past')))}
        catch (err) {console.log(err); past = []};
      try {plan = JSON.parse(fs.readFileSync(path.join(user_dir, 'plan')))}
        catch (err) {console.log(err); plan = []};
      try {adjust = JSON.parse(fs.readFileSync(path.join(user_dir, 'adjust')))}
        catch (err) {console.log(err); adjust = []};

      // add plan to past
      // if the same event appears in adjust, delete it
      for (var j = 0; j < plan.length; j ++) {
        for (var k = 0; k < adjust.length; k ++) {
          if (typeof(adjust[k]) != 'undefined') {
            if (plan[j].title == adjust[k].title &&
                plan[j].start == adjust[k].start &&
                plan[j].end   == adjust[k].end) {
              adjust.splice(k, 1);
              break;
            }
          }
        }

        plan[j].className = 'past-plan';
        past.push(plan[j]);
      }

      // add remaining adjust to past
      for (var j = 0; j < adjust.length; j ++) {
        adjust[j].className = 'past-adjust';
        past.push(adjust[j]);
      }
      console.log('past: ', past);

      // write to past
      try {fs.writeFileSync(path.join(user_dir, 'past'), JSON.stringify(past));} catch (err) {console.log(err);}

      // delete plan and adjust file
      // let both files be created when users need them
      try {fs.unlinkSync(path.join(user_dir, 'plan'))} catch  (err) {console.log(err);};
      try {fs.unlinkSync(path.join(user_dir, 'adjust'))} catch (err) {console.log(err);};
    }
  }

  console.log('Finished merging');
  _status = 'plan';
  begin_new_round_schedule = schedule.scheduleJob(round_end_time.setDate(round_end_time.getDate() + 7),
                                                  begin_new_round);
};
begin_new_round_schedule = schedule.scheduleJob(round_end_time, begin_new_round);

/* copy schedule */
var begin_adjust_schedule;
function begin_adjust() {
  _status = 'copying';
  console.log('Begin to copy `plan` to `adjust`.');

  // copy
  agendas_dir = './data/agendas';
  user_dirs = fs.readdirSync(agendas_dir);
  for (var i = 0; i < user_dirs.length; i ++) {
    if (user_dirs[i][0] != '.') {   // if is a normal file
      user_dir = path.join(agendas_dir, user_dirs[i]);
      try {
        fs.copyFileSync(path.join(user_dir, 'plan'), path.join(user_dir, 'adjust'));
      }
      catch (err) {
        console.log(err);
      }
    }
  }

  console.log('Finished copying');
  _status = 'adjust';
  begin_adjust_schedule = schedule.scheduleJob(plan_end_time.setDate(plan_end_time.getDate() + 7), begin_adjust);
};
begin_adjust_schedule = schedule.scheduleJob(plan_end_time, begin_adjust);


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

router.post('/get-comment', function(req, res, next) {
  var access_token = req.body['access_token'];

  // verify user
  admin.auth().verifyIdToken(access_token)
    .then(function(decodedToken) {
      var uid = decodedToken.uid;
      var name = decodedToken.name;
      var path = __dirname + '/../data/agendas/' + uid + '/comment';

      fs.readFile(path, function(err, data) {
        if(err) {
          console.log(err.toString());
          res.end("");
        }
        else
          res.end(data);
      });

    }).catch(function(error) {
      res.send(error.toString() + '. Failed to verify user.');
    });
});

router.post('/add-comment', function(req, res, next) {
  var access_token = req.body['access_token'];
  var requested_uid = req.body['requested_uid'];
  var comment = req.body['comment'];

  // verify user
  admin.auth().verifyIdToken(access_token)
    .then(function(decodedToken) {
      var uid = decodedToken.uid;
      var name = decodedToken.name;
      var path = __dirname + '/../data/agendas/' + requested_uid + '/comment';

      if (admin_uid != uid) {
        res.end('You are not an admin!');
        return;
      }

      fs.writeFile(path, comment, function(err) {
        if(err)
          res.end(err.toString());
        else
          res.end('評語添加成功');
      });

    }).catch(function(error) {
      res.send(error.toString() + '. Failed to verify user.');
    });
});

router.post('/change-name', function(req, res, next) {
  var access_token = req.body['access_token'];
  var new_name = req.body['new_name'];

  // verify user
  admin.auth().verifyIdToken(access_token)
    .then(function(decodedToken) {
      var uid = decodedToken.uid;
      var name = decodedToken.name;
      var path = __dirname + '/../public/users';

      fs.readFile(path, function(err, data) {
        if(err)
          res.end(err.toString());
        else {
          data = JSON.parse(data);
          data[uid] = new_name;

          fs.writeFile(path, JSON.stringify(data), function(err) {
            if(err)
              res.end(err.toString());
            else
              res.end('使用者名字更新成功');
          });

        }
      });

    }).catch(function(error) {
      res.send(error.toString() + '. Failed to verify user.');
    });
});

router.post('/add-events', function(req, res, next) {
  var access_token = req.body['access_token'];
  var events_str = req.body['events'];
  var now = moment();

  // set filename
  var filename = '/' + _status;   // '/plan' or '/adjust'

  // verify user
  admin.auth().verifyIdToken(access_token)
    .then(function(decodedToken) {
      var uid = decodedToken.uid;
      var name = decodedToken.name;
      var path = __dirname + '/../data/agendas/' + uid;

      // verify time of added events
      // TODO

      var addEventToFile = function() {
        fs.writeFile(path + filename, events_str, function(err) {
          if(err) {
            return console.log(err);
          }
          console.log(path + filename +  "  was saved!");
          res.end("週日程表更新成功");
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
    }).catch(function(error) {
      res.end(error.toString() + '. Failed to verify user.');
    });
});

router.post('/get-events', function(req, res, next){
  var access_token = req.body['access_token'];
  var requested_uid = req.body['requested_uid'];
  var requested_time = req.body['requested_time'];

  // set filename
  var filename;
  if (requested_time == 'now')
    filename = '/' + _status;   // '/plan' or '/adjust'
  else if (requested_time == 'past')
    filename = '/past';         // '/past'
  else {
    res.end('Client needs to specify the entry: `requested_time`');
    return;
  }

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
        if (requested_time == 'now')
          fs.readFile(path + filename, function(err, data) {
            if(err)
              res.end(err.toString());
            res.end(data);
          });
        else if (requested_time == 'past') {
          src = fs.createReadStream(path + filename);
          src.pipe(res);
        }
        else {
          res.end("Clients need to specify requested_time.");
        }
      };
      var addUserIfNotExist = function(uid, name) {
        fs.readFile(user_info_path, function(err, data) {
          if (err) {
            console.log(err);
            users = {};
          }
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

      if (typeof(requested_uid) == 'undefined' && requested_time == 'now') {
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
      }
      else if (requested_time == 'now') {
        readEventFromFile();
      }
      else if (requested_time == 'past') {

      }
      else {
        console.log('Error in get-events');
      }
    }).catch(function(error) {
      res.send(error.toString() + '. Failed to verify user.');
    });

});

module.exports = router;
