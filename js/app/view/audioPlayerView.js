

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
	this._SetPlayPauseBTN("pause");
      }).bind(this));

      this._audioPlayer.on("ended", (function(){
	this._SetPlayPauseBTN("play");
      }).bind(this));

      this._audioPlayer.on("paused", (function(){
	this._SetPlayPauseBTN("play");
      }).bind(this));

      this._audioPlayer.on("timeupdate", (function(progress){
	this._entity.progress.css("width", Math.floor(100*progress).toString() + "%");
      }).bind(this));

      this._audioPlayer.on("track_added", (function(info){
	AddTrackItem(this._entity.playlist, info, this._audioPlayer);
      }).bind(this));

      this._audioPlayer.on("track_changed", (function(){
	this._entity.title.text(this._audioPlayer.currentTrackTitle);
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
