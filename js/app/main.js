

$(document).ready(function(){
  $('ul.nsp-tabs').tabs();

  var Feeder = require('./js/app/util/feeder');

  var PATH_INTRO_AUDIO = "resources/audio/David-Cummings-The-Nosleep-Podcast-Theme.mp3";

  var app = new Application();
  var audioPlayer = new View.AudioPlayer();
  var episodeView = new View.EpisodeView(app, audioPlayer, {
    list:".episode-card-list", 
    sheet:".sheet"});
  var playerView = new View.AudioPlayerView(audioPlayer);
  var poiView = new View.POIView("#person-of-import");
  var filterView = new View.FilterView("#list-filters");

  episodeView.on("view_writer", function(writer, link){
    poiView.writer(writer, link);
  });

  episodeView.on("view_narrator", function(narrator, link){
    poiView.narrator(narrator, link);
  });

  poiView.on("view_episode", function(info){
    episodeView.openEpisode(info.guid, info.title);
  });

  filterView.on("apply", function(filters){
    episodeView.addSearchFilters(filters, true);
  });
  
  app.on("database_created", function(){
    NSP.db.on("episode_added", function(ep){
      episodeView.addEpisode(ep, true);
    });
  });


  app.on("application_ready", function(){
    if (NSP.config.debugMode){
      var win = require('nw.gui').Window.get();
      win.showDevTools();
      $(".application-debug-element").removeAttr("style");
      $(".app_action_debugrefresh").on("click", function(){
	win.reloadDev();
      });
    }
    episodeView.connectToDB(NSP.db);

    NSP.db.on("saved", function(){
      Materialize.toast("Database Saved!", 3000, 'rounded');
    });
    NSP.db.on("error", function(err){
      var errmsg = (typeof(err.message) !== 'undefined') ? err.message : err;
      Materialize.toast("Database Error: " + errmsg, 3000, 'rounded');
    });

    app.on("heartbeat", function(){
      if (NSP.config.autoSaveDatabaseOnChange && NSP.db.dirty){
        if (NSP.db.loading === false && NSP.db.saving === false){
	  Materialize.toast("Saving Database Changes...", 3000, 'rounded');
          NSP.db.save(NSP.config.path.database);
        }
      }
    });

    var refreshing = false;
    $(".app_action_refresh").click(function(evt){
      var target = $(".app_action_refresh").find("i.material-icons");
      var progress = $(".progress");
      if (refreshing === false){
        refreshing = true;
        target.addClass("md-inactive");
        progress.css({"display":"block"});
        var feed = new Feeder();

        feed.on("error", function(err){
          refreshing = false;
          target.removeClass("md-inactive");
          progress.css({"display":"none"});
          // TODO: Stop load spinner and log error... or throw it... whatever I want.
        });

        feed.on("rss_complete", function(){
          refreshing = false;
          target.removeClass("md-inactive");
          progress.css({"display":"none"});
          // TODO: Stop load spinner and... ummm... save the database maybe.
          if (NSP.db.dirty){
            Materialize.toast("New Episodes", 3000, 'rounded');
	    NSP.db.save(NSP.config.path.database);
          } else {
	    Materialize.toast("No new episodes.", 3000, 'rounded');
          }
        });

        app.feedUpdate(feed);
        evt.preventDefault();
      }
    });

    $(".app_action_search").click(function(){
      filterView.openModal(episodeView.getSearchFilters());
    });


    if (NSP.config.playIntroAtStartup){
      audioPlayer.volume = 0.5;
      audioPlayer.play(PATH_INTRO_AUDIO, {
	starttime:0,
	endtime:12.5,
	fadeIn:1.0,
	fadeOut:1.0
      });
    }
  });
  
  app.run();
});
