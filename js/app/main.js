

$(document).ready(function(){
  require('nw.gui').Window.get().showDevTools();

  var Feeder = require('./js/app/util/feeder');

  var episodeView = new View.EpisodeView();
  
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
  });
  
  app.run();
});
