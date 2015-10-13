
if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.AudioPlayer = (function(){

  var Events = require('events');

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

  function audioPlayer(system_id, player_controls){
    if (typeof(system_id) !== 'string'){system_id="#Audio_System";}
    
    this._playlist = [];
    this._currentTrack = -1;
    this._currentStory = null;
    this._volume = 0; // This is not the actual volume, but the targeted maximum value.
    this._loop = false;

    this._fadeWatch = null;

    this._player = $(system_id);
    if (this._player.length <= 0){
      throw new Error("No audio system found.");
    }
    // Store the initial volume level. This is what we assume the user wants their maximum volume to be.
    this._volume = this._player[0].volume;

    player_controls = player_controls || {};
    this._SetupPlayerControls(player_controls);


    this._player.on("ended", (function(){
      if (this._currentTrack >= 0 && this._currentTrack < this._playlist.length){
	this.playTrack(this._currentTrack + 1);
	this.emit("next_track");
      } else {
	this.emit("ended");
      }
    }).bind(this));

    this._player.on("timeupdate", (function(){
      if (this._currentTrack >= 0){
	var starttime = this._playlist[this._currentTrack].starttime;
	starttime = (starttime !== null) ? TimeToSecond(starttime) : 0;
	var endtime = this._playlist[this._currentTrack].endtime;
	endtime = (endtime !== null) ? TimeToSecond(endtime) : this._player[0].duration;

	// Now check to see if we've reached the endtime (incase we're playing a story and not an episode)...
	if (this._player[0].currentTime > endtime){
	  if (this._currentTrack < this._playlist.length-1){
	    this.playTrack(this._currentTrack + 1);
	    this.emit("next_track");
	  } else {
	    this._player[0].pause();
	    this.emit("ended");
	  }
	} else {
	  if (this._playlist[this._currentTrack].episode !== null && this._playlist[this._currentTrack].story === null){
	    var curStory = this._playlist[this._currentTrack].episode.storyByTime(this._player[0].currentTime);
	    if (curStory !== this._currentStory){
	      this._currentStory = curStory;
	      this.emit("story_changed", this._currentStory);
	    }
	  }
	  this.emit("timeupdate");
	}
      }
    }).bind(this));
  }
  audioPlayer.prototype.__proto__ = Events.EventEmitter.prototype;
  audioPlayer.prototype.constructor = audioPlayer;

  audioPlayer.prototype.clearTracks = function(){
    if (this.playing){
      this._player[0].pause();
      this.emit("ended");
    }
    this._playlist = [];
    this._currentTrack = -1;
  };

  audioPlayer.prototype.isEpisodeQueued = function(episode){
    for (var i=0; i < this._playlist.length; i++){
      if (this._playlist[i].episode !== null && this._playlist[i].story === null && this._playlist[i].episode === episode){
	return true;
      }
    }
    return false;
  };

  audioPlayer.prototype.isStoryQueued = function(story){
    for (var i=0; i < this._playlist.length; i++){
      if (this._playlist[i].story !== null && this._playlist[i].story === story){
	return true;
      }
    }
    return false;
  };

  audioPlayer.prototype.queueEpisode = function(episode, story){
    var url = (episode.audio_path !== "") ? episode.audio_path : episode.audio_src;
    var eindex = NSP.db.getEpisodeIndex(episode.guid);
    if (eindex >= 0){
      var title = episode.title;
      if (typeof(story) !== 'undefined'){
	var sindex = episode.getStoryIndexByTitle(story.title);
	if (sindex < 0){
	  console.log("Story not found in Episode.");
	  story = null;
	}
      } else {
	story = null;
      }

      var track = {
	name: title,
	episode: episode
      };
      if (story !== null){
	track.story = story;
      }

      this.addTrack(url, track);
    } else {
      throw new Error("Episode invalid or not in database.");
    }
  };

  audioPlayer.prototype.addTrack = function(url, options){
    if (this._GetTrackIndex(url) === -1){
      options = options || {};
      options.fadeIn = (typeof(options.fadeIn) === 'number') ? options.fadeIn : 0;
      options.fadeOut = (typeof(options.fadeOut) === 'number') ? options.fadeOut : 0;

      this._playlist.push({
	url: url,
	name: options.name,
	episode: (typeof(options.episode) !== 'undefined') ? options.episode : null,
	story: (typeof(options.story) !== 'undefined') ? options.story : null,
	starttime: (typeof(options.starttime) !== 'undefined') ? options.starttime : null,
	endtime: (typeof(options.endtime) !== 'undefined') ? options.endtime : null,
	fadeIn: options.fadeIn,
	fadeOut: options.fadeOut
      });
      this.emit("track_added");
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

  audioPlayer.prototype.playTrack = function(index){
    if (index >= 0 && index < this._playlist.length){
      var url = this._playlist[index].url;

      if (this._playlist[index].episode !== null && this._playlist[index].story !== null){
	if (this._playlist[index].story.beginningSec > 0){
	  this._playlist[index].starttime = this._playlist[index].story.beginningSec;
	  this._playlist[index].endtime = (this._playlist[index].story.endingSec <= 0) ?
	    this._playlist[index].episode.estimateStoryEndTime(this._playlist[index].story) : 
	    this._playlist[index].story.endingSec;
	}
      }
      var time = TimeToTag(this._playlist[index].starttime, this._playlist[index].endtime);

      this._currentTrack = index;
      if (this._fadeWatch !== null){
	clearInterval(this._fadeWatch);
	this._fadeWatch = null;
      }

      this._player[0].pause();
      this._player.find("source").remove();
      this._player.append($("<source></source>").attr({
	"src":url+time,
	"type":"audio/mp3"
      }));
      this._player[0].load();
      var fadingIn = this._playlist[index].fadeIn > 0;
      var fadingOut = this._playlist[index].fadeOut > 0;
      this._player.on("canplay", (function(){
	if (fadingIn){
	  this._player[0].volume = 0;
	} else {
	  this._player[0].volume = this._volume;
	}
	if (this._playlist[this._currentTrack].story !== this._currentStory){
	  this._currentStory = this._playlist[this._currentTrack].story;
	  this.emit("story_changed", this._currentStory);
	}
	this._player[0].play();
	this.emit("playing");

	if (fadingIn || fadingOut){
	  this._fadeWatch = setInterval((function(){
	    if (this._currentTrack >= 0){
	      var starttime = this._playlist[this._currentTrack].starttime;
	      starttime = (starttime !== null) ? TimeToSecond(starttime) : 0;
	      var endtime = this._playlist[this._currentTrack].endtime;
	      endtime = (endtime !== null) ? TimeToSecond(endtime) : this._player[0].duration;

	      // Manage the fade in/out of the audio.
	      var fadeVol = 0;
	      if (this._playlist[this._currentTrack].fadeIn > 0){
		if (this._player[0].volume !== this._volume){
		  fadeVol = (this._player[0].currentTime - starttime) / this._playlist[this._currentTrack].fadeIn;
		  if (fadeVol >= 0){
		    fadeVol = (fadeVol <= this._volume) ? fadeVol : this._volume;
		    if (fadeVol !== this._player[0].volume){
		      this._player[0].volume = this._volume*fadeVol;
		      if (fadeVol >= 1.0 && fadingOut === false){
			clearInterval(this._fadeWatch);
			this._fadeWatch = null;
		      }
		    }
		  }
		}
	      }

	      if (this._playlist[this._currentTrack].fadeOut > 0){
		if (this._player[0].volume !== 0){
		  fadeVol = (endtime - this._player[0].currentTime) / this._playlist[this._currentTrack].fadeOut;
		  if (fadeVol <= 1.0){
		    fadeVol = (fadeVol <= this._volume) ? fadeVol : this._volume;
		    fadeVol = (fadeVol >= 0) ? fadeVol : 0;
		    if (fadeVol !== this._player[0].volume){
		      this._player[0].volume = this._volume * fadeVol;
		      if (fadeVol <= 0){
			clearInterval();
			this._fadeWatch = null;
		      }
		    }
		  }
		}
	      }
	    }
	  }).bind(this), 10);
	}
      }).bind(this));
    } else {
      throw new RangeError();
    }
  };

  audioPlayer.prototype.play = function(url, options){
    if (typeof(url) === 'string'){
      if (this._playlist.length > 0){
	this._playlist = [];
      }
      try {
	this.addTrack(url, options);
	this.playTrack(0);
      } catch (e) {throw e;}
    } else if (this._player[0].paused && this._player.find("source").length > 0){
      this._player[0].play();
      this.emit("playing");
    }
  };

  audioPlayer.prototype.pause = function(){
    if (!this._player[0].paused && this._player[0].duration > 0){
      this._player[0].pause();
      this.emit("paused");
    }
  };

  audioPlayer.prototype._GetTrackIndex = function(url){
    for (var i=0; i < this._playlist.length; i++){
      if (this._playlist[i].url === url){
	return i;
      }
    }
    return -1;
  };

  audioPlayer.prototype._SetupPlayerControls = function(controls){
    if (typeof(controls.playpause) === 'string'){
      $(controls.playpause).on("click", (function(){
	if (this.playing && !this.paused){
	  this.pause();
	} else if (this.paused){
	  this.play();
	}
      }).bind(this));
    }

    if (typeof(controls.nextTrack) === 'string'){
      $(controls.nexttrack).on("click", (function(){
	this.nextTrack();
      }).bind(this));
    }

    if (typeof(controls.previousTrack) === 'string'){
      $(controls.previousTrack).on("click", (function(){
	this.previousTrack();
      }).bind(this));
    }

    if (typeof(controls.nextStory) === 'string'){
      $(controls.nextStory).on("click", (function(){
	Materialize.toast("Operation not yet defined.", 4000);
      }).bind(this));
    }

    if (typeof(controls.previousStory) === 'string'){
      $(controls.previousStory).on("click", (function(){
	Materialize.toast("Operation not yet defined.", 4000);
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
      get:function(){return this._player[0].playing;}
    },

    "paused":{
      get:function(){return this._player[0].paused;}
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

    "currentTrackEpisode":{
      get:function(){
	if (this._currentTrack >= 0){
	  if (this._playlist[this._currentTrack].es_index !== null){
	    var pos = this._playlist[this._currentTrack].es_index.lastIndexOf("S");
	    var eindex = -1;
	    if (pos > 0){
	      eindex = parseInt(this._playlist[this._currentTrack].es_index.substr(1, pos-1));
	    } else {
	      eindex = parseInt(this._playlist[this._currentTrack].es_index.substr(1));
	    }
	    if (eindex >= 0){
	      return NSP.db.episode(eindex);
	    }
	  }
	}
	return null;
      }
    },

    "currentTrackStory":{
      get:function(){
	if (this._currentTrack >= 0 && this._playlist[this._currentTrack].es_index !== null){
	  var pos = this._playlist[this._currentTrack].es_index.lastIndexOf("S");
	  var sindex = (pos > 0) ? parseInt(this._playlist[this._currentTrack].es_index.substr(pos+1)) : -1;
	  if (sindex >= 0){
	    return this.currentTrackEpisode.story(sindex);
	  } else {
	    return this.currentTrackEpisode.storyByTime(this._player[0].currentTime);
	  }
	}
	return null;
      }
    },

    "currentTrackTitle":{
      get:function(){
	var title = "";
	if (this._currentTrack >= 0){
	  title = this._playlist[this._currentTrack].title;
	  var ep = this.currentTrackEpisode;
	  if (ep !== null){
	    title = ep.title;
	    var story = this.currentTrackStory;
	    story = (story !== null) ? story : ep.storyByTime(this._player[0].currentTime);
	    if (story !== null){
	      title += " - " + story.title;
	    }
	  }
	}
	return title;
      }
    }
  });

  return audioPlayer;
})();
