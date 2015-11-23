

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
    conf.showEditor = obj.show_editor;
    conf.debugMode = (typeof(obj.debug_mode) === 'boolean') ? obj.debug_mode : false;
    conf.heartbeatRythm = obj.heartbeat_rythm;
  }

  function config(application_path){
    this._dataPath = "";
    if (typeof(application_path) === 'string'){
      //this._dataPath = require("../util/userPath")(application_name);
      this._dataPath = application_path;
      console.log(this._dataPath);
      //this._dataPath = "";
    }
    this._saveFilePath = "config.json"; // If a relative value, this will me merged with _dataPath when no path is given in the save() function.

    this._path = {
      database: Path.normalize("database.json"),
      playlists: Path.normalize("playlists"),
      audio:    Path.normalize("data/audio/episodes"),
      images:   Path.normalize("data/images")
    };
    this._autoCacheImages = true;
    this._autoSaveDatabaseOnChange = true;
    this._autoSaveConfigOnChange = true;
    this._skipInvalidEpisodes = false;
    this._downloadFeedAtStartup = true;
    this._playIntroAtStartup = true;
    this._showEditor = false;
    this._debug_mode = false;
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
    var data = {
      path: this._path,
      auto_cache_images: this._autoCacheImages,
      auto_save_database_on_change: this._autoSaveDatabaseOnChange,
      auto_save_config_on_change: this._autoSaveConfigOnChange,
      skip_invalid_episodes: this._skipInvalidEpisodes,
      download_feed_at_startup: this._downloadFeedAtStartup,
      play_intro_at_startup: this._playIntroAtStartup,
      show_editor: this._showEditor,
      heartbeat_rythm: this._heartbeatRythm
    };

    // We don't include debug mode in the export unless it's already true!
    // Kinda want to keep this hidden unless the person knows about it.
    if (this._debug_mode === true){
      data.debug_mode = true;
    }

    return JSON.stringify(data, null, JSON_INDENTATION_STRING);
  };

  config.prototype.open = function(path){
    if (this.loading || this.saving){return;}

    var assumedPath = Path.join(this._dataPath, this._saveFilePath);
    path = (typeof(path) === 'string') ? path : this._saveFilePath;

    var loadPath = path;
    if (Path.isAbsolute(loadPath) === false){
      loadPath = Path.join(this._dataPath, loadPath);
    }
    loadPath = Path.resolve(loadPath);

    this._loading = true;
    FS.access(loadPath, FS.R_OK | FS.W_OK, (function(err){
      if (!err){
        // Only bother loading if there was no issue. This should mean the file exists.
        FS.readFile(loadPath, (function(err, data){
          if (err){
            this._loading = false;
            this.emit("error", err);
          } else {
            try {
              VerifyConfig(this, JSON.parse(data.toString()));
	      if (path !== this._saveFilePath){
		this._saveFilePath = path;
	      }
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
    
    path = (typeof(path) === 'string') ? Path.normalize(path) : this._saveFilePath;
    var savePath = path;
    if (Path.isAbsolute(savePath) === false){
      savePath = Path.join(this._dataPath, savePath);
    }
    savePath = Path.resolve(savePath);

    var base = Path.dirname(savePath);
    this._saving = true;
    FS.access(base, FS.R_OK | FS.W_OK, (function(err){
      if (!err){
	FS.writeFile(savePath, this.toString(), (function(err){
          this._saving = false;
	  if (err){
	    this.emit("error", err);
	  } else {
	    if (path !== this._saveFilePath){
	      this._saveFilePath = path;
	    }
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

    "dataPath":{
      get:function(){return this._dataPath;}
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

    "absolutePath":{
      get:function(){
	return {
	  database: (Path.isAbsolute(this._path.database)) ? this._path.database : Path.join(this._dataPath, this._path.database),
	  playlists: (Path.isAbsolute(this._path.playlists)) ? this._path.playlists : Path.join(this._dataPath, this._path.playlists),
	  audio: (Path.isAbsolute(this._path.audio)) ? this._path.audio : Path.join(this._dataPath, this._path.audio),
	  images: (Path.isAbsolute(this._path.images)) ? this._path.images : Path.join(this._dataPath, this._path.images)
	};
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

    "showEditor":{
      get:function(){return this._showEditor;},
      set:function(enable){
	this._showEditor = (typeof(enable) === 'boolean') ? enable : this._showEditor;
	this._dirty = true;
	this.emit("changed");
      }
    },

    "debugMode":{
      get:function(){return this._debug_mode;},
      set:function(enable){
	this._debug_mode = (typeof(enable) === 'boolean') ? enable : this._debug_Mode;
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
