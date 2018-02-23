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

