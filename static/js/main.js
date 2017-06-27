$(document).ready(function() {

    ///setup before functions
    var typingTimer;                //timer identifier
    var doneTypingInterval = 1500;  //time in ms (5 seconds)
    var chance = new Chance(Math.random);
    var teams = [];
    var startDate = moment($("#seasonStartPicker").val());
    var endDate = moment($("#seasonEndPicker").val());
    var checkedBackToBack = true;
    var totalGamesPerTeam;
    var totalDays;
    var numberOfTeams;
    var gamesToPlay;

    class Team {
      constructor(city, color, games) {
        this.city = city;
        this.color = color;
        this.games = games;
      }
    }

    // setup calendar
    $('#calendar').fullCalendar({
        theme: true
    });

    // date pickers
    $( "#seasonStartPicker" ).datepicker({
      onSelect: function(dateText, inst) {
        var date = moment($(this).val());
        startDate = date;
        $('#calendar').fullCalendar('gotoDate', date);
      }
    });
    $( "#seasonEndPicker" ).datepicker({
      onSelect: function(dateText, inst) {
        var date = moment($(this).val());
        endDate = date;
      }
    });

    //back to back
    $("#backToBack").change(function() {
      if(!this.checked) {
        $("#backToBacks").css("display", "none");
        checkedBackToBack = false;
      } else {
        $("#backToBacks").css("display", "block");
        checkedBackToBack = true;
      }
    });

    // key days of the week
    $( "#rankingDays" ).sortable({
      revert: true
    });
    $( "ul, li" ).disableSelection();
    $("#keyDays").tooltip();


    // generate button validation
    $("form > li > input").change(function() {
      var empty = false;
      $("form > li > input").each(function() {
          if ($(this).val() == "") {
              empty = true;
          }
      });
      if (empty) {
          $("#generateButton").attr("disabled", "disabled");
      } else {
          $("#generateButton").removeAttr("disabled");
      }
    });

    // generating the teams from the textbox
    $('#numberOfTeams').keyup(function(){
        clearTimeout(typingTimer);
        if ($('#numberOfTeams').val()) {
            typingTimer = setTimeout(doneTyping, doneTypingInterval);
        }
    });
    //user is "finished typing," do something
    function doneTyping () {
      generateTeams();
    }

    function generateTeams () {
        numberOfTeams = parseInt($("#numberOfTeams").val());
        teams = [];
        if (!isNaN(numberOfTeams) && numberOfTeams <= 100 && numberOfTeams >= 2) {
          $("#teamsList").children().remove();
          for (var i = 1; i <= numberOfTeams; i++) {
            var city = chance.city();
            var color = chance.color({format: 'hex'});
            teams.push(new Team(city, color, 0));
          }
          teams.sort(sortTeams);
          teams.forEach(function(element) {
            $("#teamsList").append('<li style=\'background-color:' + element.color + '\'>' + element.city + '</li>');
          });
        }
    };

    $("#generateButton").click(function() {
      generateSchedule();
    });

    function generateSchedule() {
      var maxDays = maxScheduledDays();
      totalDays = endDate.diff(startDate, 'days')+1;
      totalGamesPerTeam = parseInt($("#numberOfGames").val());
      gamesToPlay = Math.ceil(totalGamesPerTeam / (numberOfTeams-1));
      var events = [];
      var datesToKeep = [];
      var i = teams.length;
      while(i--) {
        var datesTaken = [];
        var team = teams[0];
        while(team.games < totalGamesPerTeam) {
          var day = getAvailableDay(datesTaken);
          var opponent = getAvailableOpponent(team, events);
          events.push({
            title: team.city + " vs " + opponent.city,
            start: day,
            color: team.color,
            home: team.city,
            away: opponent.city
          });
          team.games++;
          if (team.games >= totalGamesPerTeam) {
            teams.splice(0, 1);
          }
          opponent.games++;
          datesTaken.push(formatDate(day));
        }
      };
      $("#calendar").fullCalendar('addEventSource', events);
    }

    function getAvailableDay(datesTaken) {
      var date = moment($.extend( true, {}, startDate ));
      var randomDay = Math.floor(Math.random() * totalDays);
      date.add(randomDay, 'days')
      // check if the random date selected is already taken
      if ($.inArray(formatDate(date), datesTaken) !== -1) {
        return getAvailableDay(datesTaken);
      }
      return date;
    }

    function getAvailableOpponent(currentTeam, events) {
      var randomTeam = Math.floor(Math.random() * teams.length);
      if (teams[randomTeam].city == currentTeam.city) { // same team, try again
        return getAvailableOpponent(currentTeam, events);
      } else if (teams[randomTeam].games >= totalGamesPerTeam) { // random team has hit their max games, try again
        return getAvailableOpponent(currentTeam, events);
      } else {
        // grabs all games scheduled between the current team and potential opponent
        var gamesPlayed = $.grep(events, function(game) {
          return (game.away == teams[randomTeam].city && game.home == currentTeam.city) ||
            (game.away == currentTeam.city && game.home == teams[randomTeam].city);
        });
        // check to see if the team has already played the max against this team
        if (gamesPlayed.length >= gamesToPlay) {
          return getAvailableOpponent(currentTeam, events);
        }
      }
      return teams[randomTeam];
    }

    function maxScheduledDays() {
      var maxDaysInSchedule = 0;
      if (startDate != null && endDate != null && endDate > startDate) {
        var totalDays = endDate.diff(startDate, 'days')+1;
        var backToBacks = backToBackGames();
        if (backToBacks == 0) {
          maxDaysInSchedule = totalDays / 2;
        } else {
          maxDaysInSchedule = totalDays - (Math.floor(totalDays / (backToBacks + 1)));
        }
      } else {
        alert("Dates are incorrect, Season Start and End Date must be provided and End Date must be after the Start Date");
      }

      return maxDaysInSchedule;
    }

    function backToBackGames() {
      if (checkedBackToBack) {
        return parseInt($("#backToBackNumber").val());
      } else {
        return 0;
      }
    }

    function formatDate(momentDate) {
      return momentDate.format("YYYY-MM-DD");
    }

    function sortTeams(firstObject, secondObject) {
      var firstCity = firstObject.city;
      var secondCity = secondObject.city
      return ((firstCity < secondCity) ? -1 : ((firstCity > secondCity) ? 1 : 0));
    }

});
