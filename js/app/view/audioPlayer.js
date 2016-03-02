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

window.View.AudioPlayer = (function(){

  var Events = require('events');
  var FS = require('fs');
  var Path = require('path');
  var Playlist = require('./js/app/model/playlist');
  var Time = require("./js/app/util/time");

  function TimeToTag(starttime, endtime){
    var tag = "#t=";
    if (typeof(starttime) === 'string' && starttime.match(/\d{1,2}:\d{1,2}:\d{1,2}/) !== null){
      tag += starttime;
    } else if (typeof(starttime) === 'number'){
      tag += starttime.toString();
    }

    if (typeof(endtime) === 'string' && endtime.match(/\d{1,2}:\d{1,2}:\d{1,2}/) !== null){
      tag += ","+endtime;
    } else if (typeof(endtime) === 'number'){
      tag += ","+endtime.toString();
    }

    return tag;
  }

  function TimeToSecond(time){
    if (typeof(time) === 'string'){
      var t = time.split(":").reverse();
      var val = 0;
      for (var i = 0; i < t.length; i++){
	val = parseInt(t[i])*Math.pow(60, i);
      }
      return val;
    }
    return time;
  }

  function RemoteAudioURI(episode){
    var path = Path.join(NSP.config.absolutePath.audio, episode.audio_filename);
    if (FileExists(path) === false){
      path = episode.audio_src;
    }
    return path;
  }

  function UserAudioPath(episode){
    var path = episode.audio_path;
    if (path !== ""){
      if (FileExists(path) === false){
	path = Path.join(episode.audio_path, episode.audio_filename);
	if (FileExists(path) === false){
	  path = "";
	}
      }
    }
    return path;
  }

  function FileExists(path){
    var lstat = null;
    try{
      lstat = FS.lstatSync(path);
    } catch (e){/* do nothing */}
    return (lstat !== null && lstat.isFile());
  }

  function audioPlayer(system_id){
    if (typeof(system_id) !== 'string'){system_id="#Audio_System";}

    this._playlist = new Playlist();
    this._currentTrack = -1;
    this._currentStory = null;
    this._volume = 0; // This is not the actual volume, but the targeted maximum value.
    this._loop = false;

    this._fadeWatch = null;
    this._currentStartTime = 0;
    this._currentEndTime = 0;

    this._defaultFadeIn = 0;
    this._defaultFadeOut = 0;
    this._currentFadeIn = 0;
    this._currentFadeOut = 0;

    this._stopped = true;
    this._player = $(system_id);
    if (this._player.length <= 0){
      throw new Error("No audio system found.");
    }
    // Store the initial volume level. This is what we assume the user wants their maximum volume to be.
    this._volume = this._player[0].volume;

    this._configured = false;
    this._SetAudioPlayerEvents();
  }
  audioPlayer.prototype.__proto__ = Events.EventEmitter.prototype;
  audioPlayer.prototype.constructor = audioPlayer;

  audioPlayer.prototype.clearTracks = function(){
    if (this.playing){
      this._player[0].pause();
      this.emit("ended");
    }
    this._playlist.clear();
    this._currentTrack = -1;
    this.emit("tracks_cleared");
  };

  audioPlayer.prototype.setPlaylist = function(playlist){
    this.clearTracks();
    for (var i=0; i < playlist.length; i++){
      var episode = NSP.db.episode(playlist.item(i).guid);
      if (episode !== null){
	var story = (playlist.item(i).title !== null) ? episode.storyByTitle(playlist.item(i).title) : null;
	this.queueEpisode(episode, story);
      }
    }
    this._playlist.name = playlist.name;
    if (this._playlist.filename !== playlist.filename){
      this._playlist.filename = playlist.filename;
    }
  };

  audioPlayer.prototype.isEpisodeQueued = function(episode){
    return this._playlist.has(episode.guid, null);
  };

  audioPlayer.prototype.isStoryQueued = function(story){
    if (typeof(story) !== 'undefined' && story !== null){
      return this._playlist.has(story.episode.guid, story.title);
    }
    return false;
  };

  audioPlayer.prototype.queueEpisode = function(episode, story){
    var eindex = NSP.db.getEpisodeIndex(episode.guid);
    if (eindex >= 0){ // Validate that the episode we're given is in the database.

      // Determin the URL (URI) of the audio. Basically, play the local file if we have it, otherwise, stream.
      var url = UserAudioPath(episode);
      if (url === ""){
	url = RemoteAudioURI(episode);
      }

      // Calculate the track title. This is optional, really.
      var title = (episode.seasonEpisodeTitle !== "") ? episode.seasonEpisodeTitle : episode.title;
      if (typeof(story) !== 'undefined' && story !== null){
	var sindex = episode.getStoryIndexByTitle(story.title);
	if (sindex < 0){
	  console.log("Story not found in Episode.");
	  story = null;
	}
	title = episode.story(sindex).title + " - " + title;
      } else {
	story = null;
      }

      this._playlist.add(episode.guid, (story !== null) ? story.title : null);
      this.emit("track_added", {
	name: title,
	episode: episode,
	story: story
      });
      if (this._currentTrack < 0){
	this._currentTrack = 0;
	this.emit("track_changed"); // Special case for this emit.
      }
      this.emit("episode_queued", episode, story);
    } else {
      throw new Error("Episode invalid or not in database.");
    }
  };

  audioPlayer.prototype.dequeueEpisode = function(episode, story){
    var trackIndex = this._GetTrackIndex(episode, story);
    if (trackIndex === this._currentTrack){
      if (this._currentTrack+1 === this._playlist.length){
	this._player[0].pause();
	this.emit("ended");
	this._currentTrack = -1;
      } else {
	this.playTrack(this._currentTrack + 1);
      }
    }
    var len = this._playlist.length;
    this._playlist.remove(episode.guid, story.title);
    if (len > this._playlist.length){
      if (this._currentTrack > trackIndex){
	this._currentTrack -= 1;
      }
      this.emit("episode_dequeued", episode, story);
    }
  };

  audioPlayer.prototype.nextTrack = function(){
    var nextTrack = this._currentTrack+1;
    if (nextTrack < this._playlist.length){
      this.playTrack(nextTrack);
    } else if (nextTrack === this._playlist.length && this._loop){
      this.playTrack(0);
    } else if (this._currentTrack >= 0){
      this._player[0].currentTime = this._player[0].duration;
    }
  };

  audioPlayer.prototype.previousTrack = function(){
    var prevTrack = this._currentTrack - 1;
    if (prevTrack >= 0){
      this.playTrack(prevTrack);
    } else if (prevTrack < 0 && this._playlist.length > 0 && this._loop){
      this.playTrack(this._playlist.length-1);
    } else if (this._currentTrack === 0){
      this._player[0].currentTime = 0;
    }
  };

  audioPlayer.prototype.nextStory = function(){
    var es = this._GetTrackEpisodeAndStory(this.currentTrackIndex);
    if (es === null){return;}
    if (es.story !== null){
      // If the current track is a story and not entire episode, then simply skip to the next track.
      this.nextTrack();
    } else {
      // Otherwise skip to the end of this story, which, moments later, should give us the next story.
      var cstory = es.episode.storyByTime(this.currentTrackTime);
      if (cstory !== null){
	var nstory = es.episode.nextStory(cstory);
	if (nstory !== null && nstory.endingSec < this.currentTrackDuration){ // If the new story exists and is within the duration of the audio
	  this.currentTrackTime = nstory.beginningSec;
	} else { // Otherwise, time for the next track.
	  this.nextTrack();
	}
      } else {
	cstory = es.episode.firstStory();
	if (cstory.beginningSec > this.currentTrackTime){
	  this.currentTrackTime = cstory.beginningSec;
	} else if (cstory.beginningSec < this.currentTrackTime){
	  this.nextTrack(); // We've pretty much reached the end of the episode if this is the case.
	}
      }
    }
  };

  audioPlayer.prototype.previousStory = function(){
    var es = this._GetTrackEpisodeAndStory(this.currentTrackIndex);
    if (es === null){return;}
    if (es.story !== null){
      this.previousTrack();
      es = this._GetTrackEpisodeAndStory(this.currentTrackIndex); // Getting the next track information.
      if (es !== null){
	var nstory = es.episode.lastEpisode();
	if (nstory !== null){
	  this.currentTrackTime = nstory.beginningSec;
	}
      }
    } else {
      // Otherwise skip to the end of this story, which, moments later, should give us the next story.
      var cstory = es.episode.storyByTime(this.currentTrackTime);
      if (cstory !== null){
	var nstory = es.episode.prevStory(cstory);
	if (nstory !== null){
	  this.currentTrackTime = nstory.beginningSec;
	}
      } else {
	cstory = es.episode.firstStory();
	if (cstory.beginningSec > this.currentTrackTime){
	  this.previousTrack(); // We're at the head of the episode. The "previous" story would be in the previous track.
	} else { // We must be at the tail of the episode.
	  cstory = es.episode.lastStory();
	  while (cstory !== null && cstory.beginningSec > this.currentTrackDuration){
	    cstory = es.episode.prevStory(cstory);
	  }
	  if (cstory !== null){
	    this.currentTrackTime = cstory.beginningSec;
	  }
	}
      }
    }
  };

  audioPlayer.prototype.playTrack = function(index){
    if (index >= 0 && index < this._playlist.length){
      var es = this._GetTrackEpisodeAndStory(index);
      if (es === null){return;}

      var url = UserAudioPath(es.episode);
      if (url === ""){
	url = RemoteAudioURI(es.episode);
      }


      var trackoptions = {};
      if (es.story !== null){
	if (es.story.beginningSec > 0){
	  trackoptions.starttime = es.story.beginningSec;
	  trackoptions.endtime = (es.story.endingSec <= 0) ? es.episode.estimateStoryEndTime(es.story) : es.story.endingSec;
	}
      }

      this._currentTrack = index;
      this.play(url, trackoptions);
      this.emit("track_changed");
    } else {
      throw new RangeError();
    }
  };

  audioPlayer.prototype.play = function(url, options){
    options = options || {};
    if (typeof(url) === 'string'){
      this._currentFadeIn = (typeof(options.fadeIn) === 'number') ? options.fadeIn : this._defaultFadeIn;
      this._currentFadeOut = (typeof(options.fadeOut) === 'number') ? options.fadeOut : this._defaultFadeOut;
      if (typeof(options.starttime) !== 'undefined' && typeof(options.endtime) !== 'undefined'){
	this._currentStartTime = options.starttime;
	this._currentEndTime = options.endtime;
	url += TimeToTag(options.starttime, options.endtime);
      } else {
	this._currentStartTime = 0;
	this._currentEndTime = 0;
      }
      this._player[0].pause();
      this._player.find("source").remove();
      this._player.append($("<source></source>").attr({
	"src":url,
	"type":"audio/mp3"
      }));
      this._player[0].load();
    } else {
      var source = this._player.find("source");
      if (source.length > 0){
	if (source.attr("src") === "" && this.playing === false && this._playlist.length < this._currentTrack){
	  this.playTrack(this._currentTrack);
	} else if (this.playing === false){
	  this._player[0].play();
	  this.emit("playing");
	}
      }
    }
  };

  audioPlayer.prototype.pause = function(){
    if (!this._player[0].paused && this._player[0].duration > 0){
      this._player[0].pause();
      this.emit("paused");
    }
  };

  audioPlayer.prototype.getTrackIndex = function(episode, story){
    // NOTE: I want to eventually move the _GetTrackIndex() function INTO this one, but for the sake of speed,
    // just call the old function for now.
    return this._GetTrackIndex(episode, story);
  };

  audioPlayer.prototype._GetTrackIndex = function(episode, story){
    var stitle = (story !== null) ? story.title : null;
    for (var i=0; i < this._playlist.length; i++){
      if (this._playlist.item(i).guid === episode.guid && this._playlist.item(i).title === stitle){
	return i;
      }
    }
    return -1;
  };

  audioPlayer.prototype._GetTrackEpisodeAndStory = function(trackIndex){
    if (trackIndex >= 0 && trackIndex < this._playlist.length){
      var episode = NSP.db.episode(this._playlist.item(trackIndex).guid);
      var story = null;
      if (episode !== null){
	if (this._playlist.item(trackIndex).title !== null){
	  story = episode.storyByTitle(this._playlist.item(trackIndex).title);
	}
	return {
	  episode:episode,
	  story:story
	};
      }
    }
    return null;
  };

  
  audioPlayer.prototype._SetAudioPlayerEvents = function(){
    if (this._configured === false){
      this._configured = true;

      // -----------------------------
      // EVENT ended
      this._player.on("ended", (function(){
	console.log("Ended with currentTime: " + this._player[0].currentTime);
        if (this._currentTrack >= 0 && this._currentTrack+1 < this._playlist.length){
	  this.playTrack(this._currentTrack + 1);
	  this.emit("next_track");
        } else {
	  if (this._playlist.length > 0 && this._loop === true){
	    this.playTrack(0);
	    this.emit("next_track");
	  } else {
	    this.pause();
	    //this._player[0].currentTime = 1;
	    this.emit("ended");
	  }
        }
      }).bind(this));

      // -----------------------------
      // EVENT timeupdate
      this._player.on("timeupdate", (function(){
        if (this._currentTrack >= 0){
	  var starttime = TimeToSecond(this._currentStartTime);
	  var endtime = (this._currentEndTime !== 0) ? TimeToSecond(this._currentEndTime) : this._player[0].duration;
	  var duration = endtime - starttime;

	  // Now check to see if we've reached the endtime (incase we're playing a story and not an episode)...
	  if (this._player[0].currentTime >= endtime){
	    if (this._currentTrack < this._playlist.length-1){
	      this.playTrack(this._currentTrack + 1);
	      this.emit("next_track");
	    } else {
	      this._player[0].pause();
	      this.emit("timeupdate", 1.0);
	      this.emit("ended");
	    }
	  } else {
	    var title = this._playlist.item(this._currentTrack).title;
	    var episode = NSP.db.episode(this._playlist.item(this._currentTrack).guid);
	    if (episode !== null && title === null){
	      var curStory = episode.storyByTime(this._player[0].currentTime);
	      if (curStory !== this._currentStory){
	        this._currentStory = curStory;
	        this.emit("story_changed", this._currentStory);
	      }
	    }
	    this.emit("timeupdate", (this._player[0].currentTime-starttime)/duration);
	  }
        }
      }).bind(this));


      // -----------------------------
      // EVENT canplay
      this._player.on("canplay", (function(){
	if (this._player[0].currentTime > 0){return;} // We should already know we "can play"

	console.log("Canplay with currentTime: " + this._player[0].currentTime);
	if (this._currentFadeIn > 0){
	  this._player[0].volume = 0;
	} else {
	  this._player[0].volume = this._volume;
	}

	var es = this._GetTrackEpisodeAndStory(this._currentTrack);
	if (es !== null){
	  if (es.story !== this._currentStory){
	    this._currentStory = es.story;
	    this.emit("story_changed", this._currentStory);
	  }
	  
	  if (NSP.config.autoUpdateDurationInfo){
	    var playerDur = Math.floor(this._player[0].duration);
	    if (this._player.find("source").attr("src") === UserAudioPath(es.episode)){
	      if (es.episode.audio_path_durationSec !== playerDur){
		es.episode.audio_path_durationSec = playerDur;
	      }
	    } else {
	      if (es.episode.audio_durationSec !== playerDur){
		es.episode.audio_durationSec = playerDur;
	      }
	    }
	  }
	}

	if (this.playing === false){
	  this._player[0].play();
	  this.emit("playing");
	}

	if (this._currentFadeIn > 0 || this._currentFadeOut > 0){
	  this._fadeWatch = setInterval((function(){
	    var starttime = TimeToSecond(this._currentStartTime);
	    var endtime = (this._currentEndTime !== 0) ? TimeToSecond(this._currentEndTime) : this._player[0].duration;

	    // Manage the fade in/out of the audio.
	    var fadeVol = 0;
	    if (this._currentFadeIn > 0){
	      if (this._player[0].volume !== this._volume){
		fadeVol = (this._player[0].currentTime - starttime) / this._currentFadeIn;
		if (fadeVol >= 0){
		  fadeVol = (fadeVol <= this._volume) ? fadeVol : this._volume;
		  if (fadeVol !== this._player[0].volume){
		    this._player[0].volume = this._volume*fadeVol;
		    if (fadeVol >= 1.0 && this._currentFadeOut <= 0){
		      clearInterval(this._fadeWatch);
		      this._fadeWatch = null;
		    }
		  }
		}
	      }
	    }

	    if (this._currentFadeOut > 0){
	      if (this._player[0].volume !== 0){
		fadeVol = (endtime - this._player[0].currentTime) / this._currentFadeOut;
		if (fadeVol <= 1.0){
		  fadeVol = (fadeVol <= this._volume) ? fadeVol : this._volume;
		  fadeVol = (fadeVol >= 0) ? fadeVol : 0;
		  if (fadeVol !== this._player[0].volume){
		    this._player[0].volume = this._volume * fadeVol;
		    if (fadeVol <= 0){
		      clearInterval(this._fadeWatch);
		      this._fadeWatch = null;
		    }
		  }
		}
	      }
	    }
	  }).bind(this), 10);
	}
      }).bind(this));
    }
  };


  Object.defineProperties(audioPlayer.prototype, {
    "volume":{
      get:function(){return this._volume;},
      set:function(level){
	if (level < 0.0){this._volume = 0;}
	if (level > 1.0){this._volume = 1.0;}
	this._volume = level;
      }
    },

    "loop":{
      // NOTE: This property doesn't actually effect anything yet.
      get:function(){return this._loop;},
      set:function(loop){
	this._loop = (typeof(loop) === 'boolean') ? loop : this._loop;
      }
    },

    "playing":{
      //get:function(){return this._player[0].duration > 0 && this._player[0].paused === false && this._player[0].ended === false;}
      get:function(){return (this._player[0].paused === false && this._player[0].currentTime >= 0);}
    },

    "paused":{
      get:function(){return this._player[0].paused;}
    },

    "playlist":{
      get:function(){return this._playlist.clone();}
    },

    "currentURI":{
      get:function(){return this._player[0].currentSrc;}
    },

    "trackCount":{
      get:function(){return this._playlist.length;}
    },

    "currentTrackIndex":{
      get:function(){return this._currentTrack;}
    },

    "currentTrackEpisodeGUID":{
      get:function(){
	if (this._currentTrack >= 0){
	  return this._playlist.item(this._currentTrack).guid;
	}
	return null;
      }
    },

    "currentTrackEpisode":{
      get:function(){
	if (this._currentTrack >= 0){
	  return NSP.db.episode(this._playlist.item(this._currentTrack).guid);
	}
	return null;
      }
    },

    "currentTrackEpisodeTitle":{
      get:function(){
	if (this._currentTrack >= 0){
	  var e = this.currentTrackEpisode;
	  return (e.seasonEpisodeTitle !== "") ? e.seasonEpisodeTitle : e.title;
	}
	return "";
      }
    },

    "currentTrackStory":{
      get:function(){
	if (this._currentTrack >= 0){
	  var e = this.currentTrackEpisode;
	  if (this._playlist.item(this._currentTrack).title !== null){
	    if (e !== null){
	      return e.storyByTitle(this._playlist.item(this._currentTrack).title);
	    }
	  } else {
	    return e.storyByTime(this.currentTrackTime);
	  }
	}
	return null;
      }
    },

    "currentTrackStoryTitle":{
      get:function(){
	if (this._currentTrack >= 0){
	  var s = this.currentTrackStory;
	  if (s !== null){
	    return s.title;
	  }
	}
	return "";
      }
    },

    "currentTrackTitle":{
      get:function(){
	var title = "";
	if (this._currentTrack >= 0){
	  var ep = this.currentTrackEpisode;
	  //var es = this._GetTrackEpisodeAndStory(this._currentTrack);
	  if (ep !== null){
	    title = (ep.seasonEpisodeTitle !== "") ? ep.seasonEpisodeTitle : ep.title;
	    var s = this.currentTrackStory;
	    if (s !== null){
	      title = s.title + " - " + title;
	    }
	  }
	}
	return title;
      }
    },

    "currentTrackTime":{
      get:function(){
	// If we have a story, we want the story's duration, otherwise, it's just the duration of the audio itself.
	if (this._currentTrack >= 0 && this._playlist.item(this._currentTrack).title !== null){
	  var es = this._GetTrackEpisodeAndStory(this._currentTrack);
	  if (es !== null && es.story !== null){
	    var storyDur = es.story.duration;
	    if (storyDur > 0){
	      return this._player[0].currentTime - es.story.beginningSec;
	    }
	  }
	}
	return this._player[0].currentTime;
      },
      set:function(time){
	time = (typeof(time) === 'string') ? parseInt(time) : time;
	if (typeof(time) !== 'number' || Number.isNaN(time)){
	  throw new TypeError();
	}

	if (this._currentTrack >= 0){
	  if (time < 0){
	    time = 0;
	  } else if (time > this.currentTrackDuration){
	    time = this.currentTrackDuration;
	  }
	  if (this._playlist.item(this._currentTrack).title !== null){
	    var es = this._GetTrackEpisodeAndStory(this._currentTrack);
	    if (es !== null && es.story !== null){
	      this._player[0].currentTime = es.story.beginningSec + time;
	    }
	  } else {
	    this._player[0].currentTime = time;
	  }
	}
      }
    },

    "currentTrackDuration":{
      get:function(){
	// If we have a story, we want the story's duration, otherwise, it's just the duration of the audio itself.
	if (this._currentTrack >= 0 && this._playlist.item(this._currentTrack).title !== null){
	  var es = this._GetTrackEpisodeAndStory(this._currentTrack);
	  if (es !== null && es.story !== null){
	    var storyDur = es.story.duration;
	    if (storyDur === 0 && es.story.beginningSec < this._player[0].duration){
	      storyDur = this._player[0].duration - es.story.beginningSec;
	    }
	    return storyDur;
	  }
	}
	return this._player[0].duration;
      }
    }
  });

  return audioPlayer;
})();
