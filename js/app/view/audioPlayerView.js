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

      e.find(".track-action-clear").on("click", (function(ent){
	var guid = e.attr("data-episode");
	var title = e.attr("data-story");
	var episode = NSP.db.episode(guid);
	var story = null;
	if (episode !== null){
	  if (guid !== title){
	    story = episode.storyByTitle(title);
	  }
	  audioPlayer.dequeueEpisode(episode, story);
	}
	ent.stopPropagation();
      }).bind(this));
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
      link_action: $(".player-story-web-link"),
      playlist: $(".player-playlist"),
      title: $(".player-title"),
      title_episode: $(".player-episode-title"),
      title_story: $(".player-story-title"),
      progress: $("#player-seek-bar")
    };
    this._configured = false;
    this._audioPlayer = audioPlayer;

    // These are the hooks.
    this._ConfigurePlayerCallbacks();
    this._ConfigureControlButtons();
    this._ConfigurePlaylistControlButtons();
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

  audioPlayerView.prototype._UpdateTrackTitle = function(){
    this._entity.title_episode.text(this._audioPlayer.currentTrackEpisodeTitle);
    var story_title = this._audioPlayer.currentTrackStoryTitle;
    if (story_title !== ""){
      this._entity.title_story.css("visibility", "visible");
      this._entity.title_story.text(story_title);

      var story = this._audioPlayer.currentTrackStory;
      if (story.link !== null && story.link !== ""){
	$(".player-story-web-link").css("visibility", "visible");
      } else {
	$(".player-story-web-link").css("visibility", "hidden");
      }
    } else {
      this._entity.title_story.css("visibility", "hidden");
      $(".player-story-web-link").css("visibility", "hidden");
    }
  };


  audioPlayerView.prototype._ConfigurePlayerCallbacks = function(){
    if (this._configured === false){
      this._configured = true;

      this._entity.link_action.on("click", (function(){
	var story = this._audioPlayer.currentTrackStory;
	if (story !== null && story.link !== "" && story.link !== null){
	  require('nw.gui').Shell.openExternal(story.link);
	}
      }).bind(this));

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

      this._audioPlayer.on("episode_dequeued", (function(episode, story){
	var track_elements = $(".player-track");
	for (var i=0; i < track_elements.length; i++){
	  var element = $(track_elements[i]);
	  var eguid = element.attr("data-episode");
	  var estory = element.attr("data-story");
	  if (eguid === episode.guid){
	    if (estory !== eguid && story !== null && story.title === estory){
	      element.remove();
	      break;
	    }
	  }
	}
      }).bind(this));

      this._audioPlayer.on("track_changed", (function(){
	this._UpdateTrackTitle();
	this._entity.progress.val(0);
        ActivateTrackItem(this._audioPlayer.currentTrackEpisode, this._audioPlayer.currentTrackStory);
      }).bind(this));

      this._audioPlayer.on("tracks_cleared", (function(){
	this._entity.title_episode.text("No Track");
	this._entity.title_story.css("visibility", "hidden");
	$(".player-story-web-link").css("visibility", "hidden");
	this._entity.progress.val(0);
	this._entity.playlist.empty();
      }).bind(this));

      this._audioPlayer.on("story_changed", (function(){
	this._UpdateTrackTitle();
      }).bind(this));
    }
  };


  audioPlayerView.prototype._ConfigureControlButtons = function(){
    var playpauseBTN = $(".player_action_playpause");
    var nextStoryBTN = $(".player_action_nextstory");
    var prevStoryBTN = $(".player_action_prevstory");
    var nextTrackBTN = $(".player_action_nexttrack");
    var prevTrackBTN = $(".player_action_prevtrack");

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

    nextTrackBTN.on("click", (function(){
      this._audioPlayer.nextTrack();
    }).bind(this));

    prevTrackBTN.on("click", (function(){
      this._audioPlayer.previousTrack();
    }).bind(this));

    nextStoryBTN.on("click", (function(){
      this._audioPlayer.nextStory();
    }).bind(this));

    prevStoryBTN.on("click", (function(){
      this._audioPlayer.previousStory();
    }).bind(this));
  };


  audioPlayerView.prototype._ConfigurePlaylistControlButtons = function(){
    var act_save_playlist = $(".playlist-action-save");
    var act_clear_playlist = $(".playlist-action-clear");

    // This... is very easy!
    act_save_playlist.on("click", (function(){
      this.emit("request_playlist_dialog", this._audioPlayer.playlist);
    }).bind(this));


    act_clear_playlist.on("click", (function(){
      if (this._audioPlayer.trackCount > 0){
	this._audioPlayer.clearTracks();
      }
    }).bind(this));
  };


  return audioPlayerView;
})();
