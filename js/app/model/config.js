
module.exports = (function(){

  var FS = require("fs");
  var Path = require("path");
  var Events = require("events");

  function VerifyConfig(conf, obj){
    if (typeof(obj) !== typeof({})){
      throw new Error("Expected object.");
    }
    
    if (typeof(obj.path) === typeof({})){
      conf.path = obj.path;
    }
    conf.skipInvalidEpisodes = obj.skip_invalid_episodes;
    conf.downloadFeedAtStartup = obj.download_feed_at_startup;
    conf.playIntroAtStartup = obj.play_intro_at_startup;
  }

  function config(){
    this._path = {
      database: Path.normalize("database.json"),
      audio:    Path.normalize("audio")
    };
    this._skipInvalidEpisodes = false;
    this._downloadFeedAtStartup = true;
    this._playIntroAtStartup = true;
  }
  config.prototype.__proto__ = Events.EventEmitter.prototype;
  config.prototype.constructor = config;

  config.prototype.fromString = function(str){
    try {
      VerifyConfig(JSON.parse(str));
      this.emit("changed");
    } catch (e) {throw e;}
  };

  config.prototype.toString = function(){
    return JSON.stringify({
      path:{
	database: this._path.database,
	audio: this._path.audio
      },
      skip_invalid_episodes: this._skipInvalidEpisodes,
      download_feed_at_startup: this._downloadFeedAtStartup
    });
  };

  config.prototype.open = function(path){
    path = Path.normalize(path);
    FS.access(path, FS.R_OK | FS.W_OK, (function(err){
      if (!err){
        // Only bother loading if there was no issue. This should mean the file exists.
        FS.readFile(path, (function(err, data){
          if (err){
            this.emit("error", err);
          } else {
            try {
              VerifyConfig(this, JSON.parse(data.toString()));
              this.emit("opened", true);
              this.emit("changed");
            } catch (e) {
              this.emit("error", e);
            }
          }
        }).bind(this));
      } else {
        this.emit("opened", false);
      }
    }).bind(this));
  };

  config.prototype.save = function(path){
    path = Path.normalize(path);
    var base = Path.dirname(path);
    FS.access(base, FS.R_OK | FS.W_OK, (function(err){
      if (!err){
	FS.writeFile(path, this.toString(), (function(err){
	  if (err){
	    this.emit("error", err);
	  } else {
	    this.emit("saved");
	  }
	}).bind(this));
      } else {
	this.emit("error", err);
      }
    }).bind(this));
  };

  Object.defineProperties(config.prototype, {
    "json":{
      get:function(){return this.toString();},
      set:function(str){
	try{
	  this.fromString(str);
	} catch (e) {throw e;}
      }
    },

    "path":{
      get:function(){
	return {
	  database: this._path.database,
	  audio: this._path.audio
	};
      },
      set:function(path){
	if (typeof(path) !== typeof({})){
	  throw TypeError();
	}
	this._path.database = (typeof(path.database) === 'string') ? Path.normalize(path.database) : this._path.database;
	this._path.audio = (typeof(path.audio) === 'string') ? Path.normalize(path.audio) : this._path.audio;
	this.emit("changed");
      }
    },

    "skipInvalidEpisodes":{
      get:function(){return this._skipInvalidEpisodes;},
      set:function(enable){
	this._skipInvalidEpisodes = (typeof(enable) === 'boolean') ? enable : this._skipInvalidEpisodes;
	this.emit("changed");
      }
    },

    "downloadFeedAtStartup":{
      get:function(){return this._downloadFeedAtStartup;},
      set:function(enable){
	this._downloadFeedAtStartup = (typeof(enable) === 'boolean') ? enable : this._downloadFeedAtStartup;
	this.emit("changed");
      }
    },

    "playIntroAtStartup":{
      get:function(){return this._playIntroAtStartup;},
      set:function(enable){
	this._playIntroAtStartup = (typeof(enable) === 'boolean') ? enable : this._playIntroAtStartup;
	this.emit("changed");
      }
    }
  });

  return config;
})();
