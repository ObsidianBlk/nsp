

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
    var trackIndex = audioPlayer.getTrackIndex(info.episode, info.story);
    if (trackIndex >= 0){
      entity.append(e);
      e.attr("data-episode", info.episode.guid);
      if (info.story !== null){
	e.attr("data-story", info.story.title);
      } else {
	e.attr("data-story", info.episode.guid);
      }
      e.find(".track-title").text(info.name);

      e.on("click", function(){
	var trackIndex = audioPlayer.getTrackIndex(info.episode, info.story);
	if (trackIndex >= 0 && audioPlayer.currentTrackIndex >= 0 && audioPlayer.currentTrackIndex !== trackIndex){
	  audioPlayer.playTrack(trackIndex);
	}
      });
    }
  }


  function ActivateTrackItem(episode, story){
    if (episode !== null){
      var trackEntity = $(".player-track.selected");
      if (trackEntity.length > 0){
        trackEntity.removeClass("selected");
      }
      var stitle = (story !== null) ? story.title : episode.guid;
      trackEntity = $(".player-track");
      trackEntity.each(function(e){
	var ent = $(trackEntity[e]);
	if (ent.attr("data-episode") === episode.guid && ent.attr("data-story") === stitle){
	  ent.addClass("selected");
	}
      });
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
      progress: $("#player-seek-bar")
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

      this._entity.progress.on("change", (function(){
	this._entity.progress.removeClass("dragging");
	this._audioPlayer.currentTrackTime = this._entity.progress[0].value;
	//console.log("Scrubber Changed: " + this._entity.progress[0].value + " | " + this._audioPlayer.currentTrackTime);
      }).bind(this));

      this._entity.progress.on("mousedown", function(){
	if (!$(this).hasClass("dragging")){
	  $(this).addClass("dragging");
	}
      });

      this._audioPlayer.on("playing", (function(){
        // NOTE: Using the ::play() method, audio can be played without it being identified as a track.
        // to ignore trackless audio, check to see if a currentTrackIndex is defined.
        if (this._audioPlayer.currentTrackIndex >= 0){
	  this._entity.progress.attr("max", this._audioPlayer.currentTrackDuration.toString());
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
	if (this._entity.progress.hasClass("dragging") === false){
	  this._entity.progress[0].value = this._audioPlayer.currentTrackTime;
	}
      }).bind(this));

      this._audioPlayer.on("track_added", (function(info){
	AddTrackItem(this._entity.playlist, info, this._audioPlayer);
      }).bind(this));

      this._audioPlayer.on("track_changed", (function(){
	this._entity.title.text(this._audioPlayer.currentTrackTitle);
	this._entity.progress.val(0);
        ActivateTrackItem(this._audioPlayer.currentTrackEpisode, this._audioPlayer.currentTrackStory);
      }).bind(this));

      this._audioPlayer.on("tracks_cleared", (function(){
	this._entity.title.text("No Track");
	this._entity.progress.val(0);
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
