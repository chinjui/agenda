var get_time_limit = function() {
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

  return [plan_begin, plan_end, adjust_end];
};

function count_overcomer_time(begin_time, phrases, events, className='past') {
  // begin_time:  moment object, begining of the week to be counted
  // phrases:     An array like ['讀聖經', '傳福音', '個人禱告', '家聚會']
  // events:      An array containing fullcalendar events
  // className:   'past' or 'now' (now is an useless argument)

  // current calendar start and end time
  begin_time.startOf('day');
  end_time = begin_time.clone().add(7, 'days');

  // exclude events with unwanted time or className
  valid_events = [];
  for (var i = 0; i < events.length; i ++) {
    if (typeof(events[i]) == 'undefined')
      break;
    //var same_class_name = (events[i].className.substring(0, 3) == className.substring(0, 3));
    var valid_date = (moment(events[i].start).isBetween(begin_time, end_time));
    if (valid_date)
      valid_events.push(events[i]);
  }

  // if (className == 'past') discount plan if overlapped with adjust
  // if (className == 'past') {
  //   for (var i = 0; i < valid_events.length; i ++) {
  //     if (typeof(valid_events[i]) == 'undefined')
  //       break;
  //     if (valid_events[i].className == 'past-plan') {
  //       plan_start = moment(valid_events[i].start);
  //       plan_end = moment(valid_events[i].end);

  //       for (var j = 0; j < valid_events.length; j ++) {
  //         if (typeof(valid_events[j]) == 'undefined')
  //           break;
  //         if (valid_events[j].className == 'past-adjust') {
  //           adjust_start = moment(valid_events[j].start);
  //           adjust_end = moment(valid_events[j].end);

  //           if (plan_start.isBefore(adjust_end) && plan_end.isAfter(adjust_start)) {  // overlapping
  //             valid_events.splice(i, 1);
  //             i --;
  //             break;
  //           }
  //         }
  //       }
  //     }
  //   }
  // }

  // remove all past-plan from array
  for (var i = 0; i < valid_events.length; i ++) {
    if (typeof(valid_events[i]) == 'undefined')
      break;
    if (valid_events[i].className == 'past-plan') {
      valid_events.splice(i, 1);
      i --;
    }
  }

  // initialize counts to 0s
  counts = {};
  for (var i = 0; i < phrases.length; i ++)
    counts[phrases[i]] = 0;

  // iterate through events
  for (var i = 0; i < valid_events.length; i ++) {
    start = moment(valid_events[i].start);
    end = moment(valid_events[i].end);
    interval = end.diff(start, 'hours', true);
    for (var key in counts) {
      if (valid_events[i].title.includes(key))
        counts[key] += interval;
    }
  }

  return JSON.stringify(counts, undefined, 2);
}
