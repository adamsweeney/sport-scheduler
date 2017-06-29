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
      constructor(city, color, games, dates, locations) {
        this.city = city;
        this.color = color;
        this.games = games;
        this.dates = dates;
        this.locations = locations;
      }

      toString(){
        return this.city;
      }
    }

    class Location {
      constructor(opponent, isHome) {
        this.opponent = opponent;
        this.isHome = isHome;
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
            teams.push(new Team(city, color, 0, [], []));
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
      var i = teams.length;
      while(i--) {
        var team = teams[0];
        while(team.games < totalGamesPerTeam) {
          var opponent = getAvailableOpponent(team, events);
          var day = getAvailableDay(team, opponent);
          var homeTeam = getHomeTeam(team, opponent);
          var awayTeam = homeTeam.city == team.city ? opponent : team;
          events.push({
            title: homeTeam.city + " vs " + awayTeam.city,
            start: day,
            color: homeTeam.color,
            home: homeTeam.city,
            away: awayTeam.city
          });
          team.games++;
          if (team.games >= totalGamesPerTeam) {
            teams.splice(0, 1);
          }
          opponent.games++;
          team.dates.push(formatDate(day));
          opponent.dates.push(formatDate(day));
          homeTeam.locations.push(new Location(awayTeam, true));
          awayTeam.locations.push(new Location(homeTeam, false));
        }
      };
      $("#calendar").fullCalendar('addEventSource', events);
    }

    function getHomeTeam(team, opponent) {
      var totalHomeGames = 0;
      // get all games against this opponent, whilst tallying the homegames they've played total
      var locations = $.grep(team.locations, function(location) {
        if (location.isHome) {
          totalHomeGames++;
        }
        return location.opponent.city === opponent.city;
      });

      // within all those games vs the opponent, get how many of those were home
      var homeGames = 0;
      locations.forEach(function(location) {
        if (location.isHome) {
          homeGames++;
        }
      });
      if (!gamesToPlay % 2) { // even number of games between each team
        if ((gamesToPlay / 2) == homeGames) {
          return opponent;
        } else {
          return team;
        }
      } else { //uneven number, makes life harder
        // can we slot a home game? home games are less than total played so far
        if ((locations.length / 2) >= homeGames && (locations.length == 0 || (team.games / 2) >= totalHomeGames)) {
          return team;
        } else {
          return opponent;
        }
      }


    }

    function getAvailableDay(currentTeam, opponent) {
      var date = moment($.extend( true, {}, startDate ));
      var randomDay = Math.floor(Math.random() * totalDays);
      date.add(randomDay, 'days')
      // check if the random date selected is already taken
      if ($.inArray(formatDate(date), currentTeam.dates) !== -1 || $.inArray(formatDate(date), opponent.dates) !== -1) {
        return getAvailableDay(currentTeam, opponent);
      }
      return date;
    }

    function getAvailableOpponent(currentTeam, events, availableTeams) {
      var belowMaxGamesTeams = availableTeams || $.merge([], teams);
      belowMaxGamesTeams.sort(sortTeamsByGames);
      if (belowMaxGamesTeams[0].city == currentTeam.city) { // same team, try again but remove first
        belowMaxGamesTeams.splice(0, 1);
        return getAvailableOpponent(currentTeam, events, belowMaxGamesTeams);
      } else if (belowMaxGamesTeams[0].games >= totalGamesPerTeam) { // random team has hit their max games, try again
        belowMaxGamesTeams.splice(0, 1);
        return getAvailableOpponent(currentTeam, events, belowMaxGamesTeams);
      } else {
        // grabs all games scheduled between the current team and potential opponent
        var gamesPlayed = $.grep(events, function(game) {
          return (game.away == belowMaxGamesTeams[0].city && game.home == currentTeam.city) ||
            (game.away == currentTeam.city && game.home == belowMaxGamesTeams[0].city);
        });
        // check to see if the team has already played the max against this team
        if (gamesPlayed.length >= gamesToPlay) {
          belowMaxGamesTeams.splice(0, 1);
          return getAvailableOpponent(currentTeam, events, belowMaxGamesTeams);
        }
      }
      return belowMaxGamesTeams[0];
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

    function sortTeamsByGames(firstObject, secondObject) {
      var firstCity = firstObject.games;
      var secondCity = secondObject.games
      return ((firstCity < secondCity) ? -1 : ((firstCity > secondCity) ? 1 : 0));
    }


});
