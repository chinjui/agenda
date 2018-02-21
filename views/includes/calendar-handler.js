$(document).ready(function() {
  $('#calendar').fullCalendar({
    header: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    defaultDate: moment().toDate(),
    navLinks: false, // can click day/week names to navigate views
    editable: true,
    defaultView: 'agendaWeek', // only show weekly view
    // header: false, // Hide buttons/titles
    minTime: '06:30:00', // Start time for the calendar
    maxTime: '22:30:00', // End time for the calendar
    eventLimit: true, // allow "more" link when too many events
    columnHeaderFormat: 'ddd', // Only show day of the week names
    themeSystem: 'jquery-ui',
    handleWindowResize: true,
    firstDay: 6, // arrange agenda from Saturday
    displayEventTime: true, // Display event time
    selectable: true, // allow highlight by clicking and dragging
    viewRender: function(view, element){
      $('.fc-day').filter(
        function(index){
        return moment( $(this).data('date') ).isBefore(moment(),'day')
      }).addClass('date-in-past');
    },
    events: [],
  });

});
