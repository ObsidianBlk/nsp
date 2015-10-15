

if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.AudioPlayerView = (function(){

  var Events = require('events');
  var FS = require('fs');
  //var Path = require('path');
  //var Feeder = require('./js/app/util/feeder');

  var templates = {
    playlistTrack: FS.readFileSync("templates/playlistTrack.html").toString()
    //episodeDetailsStory: FS.readFileSync("templates/episodeDetailsStory.html").toString()
  };


// --------------------------------------------------------------------
// --------------------------------------------------------------------
// --------------------------------------------------------------------


  function AddTrackItem(entity, info, audioPlayer){
    var e = $(templates.playlistTrack);
    entity.append(e);
    e.addClass("TrackID-" + info.trackIndex);
    e.find(".track-title").text(info.name);
    if (info.episode !== null){
      e.data({episodeid:info.episode.guid});
      if (info.story !== null){
	e.data({storytitle:info.story.title});
      }
    } else if (info.url !== null){
      e.data({url:info.url});
    }

    e.on("click", function(){
      if (audioPlayer.currentTrackIndex >= 0 && audioPlayer.currentTrackIndex !== info.trackIndex){
	audioPlayer.playTrack(info.trackIndex);
      }
    });
  }


  function ActivateTrackItemIndex(index){
    if (index >= 0){
      var trackEntity = $(".player-track.darken-3");
      var btn = null;
      if (trackEntity.length > 0){
        trackEntity.removeClass("darken-3").addClass("darken-1");
        btn = trackEntity.find(".track-action-jumpto");
        if (btn.length > 0){
          btn.find(".option-jumpto").removeAttr("style");
          btn.find(".option-play").css("display", "none");
          btn.find(".option-pause").css("display", "none");
        }
      }
      trackEntity = $(".TrackID-" + index);
      if (trackEntity.length > 0){
        if (trackEntity.hasClass("darken-3") === false){
          trackEntity.removeClass("darken-1").addClass("darken-3");
          btn = trackEntity.find(".track-action-jumpto");
          if (btn.length > 0){
            btn.find(".option-jumpto").css("display", "none");
            btn.find(".option-play").removeAttr("style");
          }
        }
      }
    }
  }

  function SetActiveTrackItemPlayState(state){
    var trackEntity = $(".player-track.darken-3");
    var btn = null;
    if (trackEntity.length > 0){
      btn = trackEntity.find(".track-action-jumpto");
      if (btn.length > 0){
        if (state === "play"){
          btn.find(".option-pause").css("display", "none");
          btn.find(".option-play").removeAttr("style");
        } else if (state === "pause"){
          btn.find(".option-play").css("display", "none");
          btn.find(".option-pause").removeAttr("style");
        }
      }
    }
  }


// --------------------------------------------------------------------
// --------------------------------------------------------------------
// --------------------------------------------------------------------


  function audioPlayerView(audioPlayer){
    this._entity = {
      playlist: $(".player-playlist"),
      title: $(".player-title"),
      progress: $(".player-progress")
    };
    this._configured = false;
    this._audioPlayer = audioPlayer;

    // These are the hooks.
    this._ConfigurePlayerCallbacks();
    this._ConfigureControlButtons();
  }
  audioPlayerView.prototype.__proto__ = Events.EventEmitter.prototype;
  audioPlayerView.prototype.constructor = audioPlayerView;


  audioPlayerView.prototype._SetPlayPauseBTN = function(state){
    var playpauseBTN = $(".player_action_playpause");
    if (state === "play"){
      playpauseBTN.find(".option-play").removeAttr("style");
      playpauseBTN.find(".option-pause").css("display", "none");
    } else if (state === "pause") {
      playpauseBTN.find(".option-pause").removeAttr("style");
      playpauseBTN.find(".option-play").css("display", "none");
    }
  };


  audioPlayerView.prototype._ConfigurePlayerCallbacks = function(){
    if (this._configured === false){
      this._configured = true;

      this._audioPlayer.on("playing", (function(){
        // NOTE: Using the ::play() method, audio can be played without it being identified as a track.
        // to ignore trackless audio, check to see if a currentTrackIndex is defined.
        if (this._audioPlayer.currentTrackIndex >= 0){
	  this._SetPlayPauseBTN("pause");
          SetActiveTrackItemPlayState("pause");
        }
      }).bind(this));

      this._audioPlayer.on("ended", (function(){
        // NOTE: Using the ::play() method, audio can be played without it being identified as a track.
        // to ignore trackless audio, check to see if a currentTrackIndex is defined.
        if (this._audioPlayer.currentTrackIndex >= 0){
	  this._SetPlayPauseBTN("play");
          SetActiveTrackItemPlayState("play");
        }
      }).bind(this));

      this._audioPlayer.on("paused", (function(){
        // NOTE: Using the ::play() method, audio can be played without it being identified as a track.
        // to ignore trackless audio, check to see if a currentTrackIndex is defined.
        if (this._audioPlayer.currentTrackIndex >= 0){
	  this._SetPlayPauseBTN("play");
          SetActiveTrackItemPlayState("play");
        }
      }).bind(this));

      this._audioPlayer.on("timeupdate", (function(progress){
	this._entity.progress.css("width", Math.floor(100*progress).toString() + "%");
      }).bind(this));

      this._audioPlayer.on("track_added", (function(info){
	AddTrackItem(this._entity.playlist, info, this._audioPlayer);
      }).bind(this));

      this._audioPlayer.on("track_changed", (function(){
	this._entity.title.text(this._audioPlayer.currentTrackTitle);
        ActivateTrackItemIndex(this._audioPlayer.currentTrackIndex);
      }).bind(this));

      this._audioPlayer.on("tracks_cleared", (function(){
	this._entity.title.text("No Track");
	this._entity.playlist.empty();
      }).bind(this));
    }
  };


  audioPlayerView.prototype._ConfigureControlButtons = function(){
    var playpauseBTN = $(".player_action_playpause");
    playpauseBTN.on("click", (function(){
      if (this._audioPlayer.currentTrackIndex >= 0){
	if (playpauseBTN.find(".option-play").css("display") === "none"){
	  this._audioPlayer.pause();
	  this._SetPlayPauseBTN("play");
	} else {
	  this._audioPlayer.play();
	  this._SetPlayPauseBTN("pause");
	}
      }
    }).bind(this));
  };


  return audioPlayerView;
})();
