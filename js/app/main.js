

$(document).ready(function(){
  require('nw.gui').Window.get().showDevTools();
  $('ul.nsp-tabs').tabs();

  var Feeder = require('./js/app/util/feeder');

  var audioPlayer = new View.AudioPlayer();
  var episodeView = new View.EpisodeView(".cards", ".sheet", audioPlayer);
  var playerView = new View.AudioPlayerView(audioPlayer);
  
  var app = new Application();
  app.on("database_created", function(){
    NSP.db.on("episode_added", function(ep){
      episodeView.addEpisode(ep, true);
    });
  });


  app.on("application_ready", function(){
    episodeView.connectToDB(NSP.db);

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


    if (NSP.config.playIntroAtStartup){
      audioPlayer.volume = 0.5;
      audioPlayer.play("audio/David-Cummings-The-Nosleep-Podcast-Theme.mp3", {
	starttime:0,
	endtime:12.5,
	fadeIn:1.0,
	fadeOut:1.0
      });
    }
  });
  
  app.run();
});
