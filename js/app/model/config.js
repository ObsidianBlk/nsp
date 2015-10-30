
module.exports = (function(){

  var FS = require("fs");
  var Path = require("path");
  var Events = require("events");

  var JSON_INDENTATION_STRING = "  ";


  function VerifyConfig(conf, obj){
    if (typeof(obj) !== typeof({})){
      throw new Error("Expected object.");
    }
    
    if (typeof(obj.path) === typeof({})){
      conf.path = obj.path;
    }
    conf.autoCacheImages = obj.auto_cache_images;
    conf.autoSaveDatabaseOnChange = obj.auto_save_database_on_change;
    conf.autoSaveConfigOnChange = obj.auto_save_config_on_change;
    conf.skipInvalidEpisodes = obj.skip_invalid_episodes;
    conf.downloadFeedAtStartup = obj.download_feed_at_startup;
    conf.playIntroAtStartup = obj.play_intro_at_startup;
    conf.heartbeatRythm = obj.heartbeat_rythm;
  }

  function config(){
    this._path = {
      database: Path.normalize("database.json"),
      playlists: Path.normalize("playlists"),
      audio:    Path.normalize("cache/audio/episodes"),
      images:   Path.normalize("cache/images")
    };
    this._autoCacheImages = true;
    this._autoSaveDatabaseOnChange = true;
    this._autoSaveConfigOnChange = true;
    this._skipInvalidEpisodes = false;
    this._downloadFeedAtStartup = true;
    this._playIntroAtStartup = true;
    this._heartbeatRythm = 200;

    this._loading = false;
    this._saving = false;
    this._dirty = false;
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
      path: this._path,
      auto_cache_images: this._autoCacheImages,
      auto_save_database_on_change: this._autoSaveDatabaseOnChange,
      auto_save_config_on_change: this._autoSaveConfigOnChange,
      skip_invalid_episodes: this._skipInvalidEpisodes,
      download_feed_at_startup: this._downloadFeedAtStartup,
      play_intro_at_startup: this._playIntroAtStartup,
      heartbeat_rythm: this._heartbeatRythm
    }, null, JSON_INDENTATION_STRING);
  };

  config.prototype.open = function(path){
    if (this.loading || this.saving){return;}
    
    path = Path.normalize(path);
    this._loading = true;
    FS.access(path, FS.R_OK | FS.W_OK, (function(err){
      if (!err){
        // Only bother loading if there was no issue. This should mean the file exists.
        FS.readFile(path, (function(err, data){
          if (err){
            this._loading = false;
            this.emit("error", err);
          } else {
            try {
              VerifyConfig(this, JSON.parse(data.toString()));
              this._loading = false;
              this.emit("opened", true);
              this.emit("changed");
            } catch (e) {
              this.emit("error", e);
            }
          }
        }).bind(this));
      } else {
        this._loading = false;
        this.emit("opened", false);
      }
    }).bind(this));
  };

  config.prototype.save = function(path){
    if (this.loading || this.saving){return;}
    
    path = Path.normalize(path);
    var base = Path.dirname(path);
    this._saving = true;
    FS.access(base, FS.R_OK | FS.W_OK, (function(err){
      if (!err){
	FS.writeFile(path, this.toString(), (function(err){
          this._saving = false;
	  if (err){
	    this.emit("error", err);
	  } else {
            this._dirty = false;
	    this.emit("saved");
	  }
	}).bind(this));
      } else {
        this._saving = false;
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
	  playlists: this._path.playlists,
	  audio: this._path.audio,
	  images: this._path.images
	};
      },
      set:function(path){
	if (typeof(path) !== typeof({})){
	  throw TypeError();
	}
	this._path.database = (typeof(path.database) === 'string') ? Path.normalize(path.database) : this._path.database;
	this._path.playlists = (typeof(path.playlists) === 'string') ? Path.normalize(path.playlists) : this._path.playlists;
	this._path.audio = (typeof(path.audio) === 'string') ? Path.normalize(path.audio) : this._path.audio;
	this._path.images = (typeof(path.images) === 'string') ? Path.normalize(path.images) : this._path.images;
        this._dirty = true;
	this.emit("changed");
      }
    },

    "autoCacheImages":{
      get:function(){return this._autoCacheImages;},
      set:function(enable){
	this._autoCacheImages = (typeof(enable) === 'boolean') ? enable : this._autoCacheImages;
        this._dirty = true;
	this.emit("changed");
      }
    },

    "autoSaveDatabaseOnChange":{
      get:function(){return this._autoSaveDatabaseOnChange;},
      set:function(enable){
        this._autoSaveDatabaseOnChange = (typeof(enable) === 'boolean') ? enable : this._autoSaveDatabaseOnChange;
        this._dirty = true;
        this.emit("changed");
      }
    },

    "autoSaveConfigOnChange":{
      get:function(){return this._autoSaveConfigOnChange;},
      set:function(enable){
        this._autoSaveConfigOnChange = (typeof(enable) === 'boolean') ? enable : this._autoSaveConfigOnChange;
        this._dirty = true;
        this.emit("changed");
      }
    },

    "skipInvalidEpisodes":{
      get:function(){return this._skipInvalidEpisodes;},
      set:function(enable){
	this._skipInvalidEpisodes = (typeof(enable) === 'boolean') ? enable : this._skipInvalidEpisodes;
        this._dirty = true;
	this.emit("changed");
      }
    },

    "downloadFeedAtStartup":{
      get:function(){return this._downloadFeedAtStartup;},
      set:function(enable){
	this._downloadFeedAtStartup = (typeof(enable) === 'boolean') ? enable : this._downloadFeedAtStartup;
        this._dirty = true;
	this.emit("changed");
      }
    },

    "playIntroAtStartup":{
      get:function(){return this._playIntroAtStartup;},
      set:function(enable){
	this._playIntroAtStartup = (typeof(enable) === 'boolean') ? enable : this._playIntroAtStartup;
        this._dirty = true;
	this.emit("changed");
      }
    },

    "heartbeatRythm":{
      get:function(){return this._heartbeatRythm;},
      set:function(hb){
	if (typeof(hb) === 'number'){
	  var t = Math.floor(hb);
	  if (t > 0){
	    this._heartbeatRythm = t;
            this._dirty = true;
	    this.emit("changed");
	  }
	}
      }
    },

    "loading":{
      get:function(){return this._loading;}
    },

    "saving":{
      get:function(){return this._saving;}
    },
    
    "dirty":{
      get:function(){return this._dirty;}
    }
  });

  return config;
})();
