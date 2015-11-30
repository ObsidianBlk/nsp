/* ------------------------------------------------------------------------

  Copyright (C) 2015 Bryan Miller
  
  -------------------------------------------------------------------------

  This file is part of The Nosleep Pod-App (NSP).

  NSP is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  NSP is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with NSP.  If not, see <http://www.gnu.org/licenses/>.

------------------------------------------------------------------------ */


$(document).ready(function(){
  $('ul.nsp-tabs.mainwindow').tabs();
  $('ul.nsp-tabs.playlist').tabs();

  var Package = require('./package.json');
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
  var playlistView = new View.PlaylistView("#playlist-select");
  var settingsView = new View.SettingsView("#app-settings");
  var episodeEditorView = new View.EpEditorView("#episode-editor");
  //var storyEditorView = new View.StEditorView("#story-editor");


  $(".about_version").html("v" + Package.version);

  episodeView.on("view_writer", function(writer, link){
    poiView.writer(writer, link);
  });

  episodeView.on("view_narrator", function(narrator, link){
    poiView.narrator(narrator, link);
  });

  episodeView.on("edit_episode", function(episode, options){
    episodeEditorView.openModal(episode, options);
  });

  episodeEditorView.on("edit_story", function(episode, story, options){
    Materialize.toast("Story Editor not yet implemented.");
  });

  poiView.on("view_episode", function(info){
    episodeView.openEpisode(info.guid, info.title);
  });

  filterView.on("apply", function(filters){
    episodeView.addSearchFilters(filters, true);
  });

  playerView.on("request_playlist_dialog", function(pl){
    playlistView.openModal(pl);
  });

  playlistView.on("playlist_selected", function(pl){
    audioPlayer.setPlaylist(pl);
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
          NSP.db.save(NSP.config.absolutePath.database);
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
	    NSP.db.save(NSP.config.absolutePath.database);
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

    $(".app-act-mainmenu-settings").click(function(){
      settingsView.openModal();
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
