
module.exports = (function(){
  var FS = require("fs");
  var Path = require("path");
  var Events = require("events");

  var episode = require("./episode");


  function VerifyDB(db, data){
    console.log("Verifying DB object.");
    if (typeof(data) !== typeof({})){
      throw new Error("Database is not an object.");
    }

    db._path.audio = (typeof(data.path_audio) === 'string') ? data.path_audio : db.path.audio;
    db._ignoreInvalidEpisodes = (typeof(data.ignore_invalid_episode) === 'boolean') ? data.ignore_invalid_episode : db._ignoreInvalidEpisodes;
    
    if (typeof(data.episode) === 'undefined'){
      db._episode = [];
    } else if (data.episode instanceof Array){
      db._episode = [];
      for (var i=0; i < data.episode.length; i++){
        try {
          db.addEpisode(data.episode[i]);
        } catch (e) {
          if (!db._ignoreInvalidEpisodes){
            throw new Error("Invalid episode data at index " + i + ": " + e.message);
          } else {
            console.log("Invalid episode data at index " + i + ": " + e.message);
          }
        }
      }
    } else {
      throw new Error("Database property 'episode' expected to be an array. Was given " + typeof(data.episode));
    }
  }
  

  function database(){
    this._path = {
      audio:Path.normalize("audio")
    };
    this._ignoreInvalidEpisodes = false;
    this._episode = [];
  }
  database.prototype.__proto__ = Events.EventEmitter.prototype;
  database.prototype.constructor = database;

  database.prototype.fromString = function(str){
    try {
      VerifyDB(this, JSON.parse(str));
      this.emit("changed", null);
    } catch (e) {throw e;}
  };

  database.prototype.toString = function(){
    var data = {
      path_audio: this._path.audio,
      ignore_invalid_episode: this._ignoreInvalidEpisodes
    };
    if (this._episode.length > 0){
      data.episode = [];
      for (var i=0; i < this._episode.length; i++){
	data.episode.push(JSON.parse(this._episode[i].toString()));
      }
    }
    return JSON.stringify(data);
  };

  database.prototype.open = function(path){
    path = Path.normalize(path);
    FS.access(path, FS.R_OK | FS.W_OK, (function(err){
      if (!err){
	console.log("Path " + path + " accessable. Attempting to read");
        // Only both loading if there was no issue. This should mean the file exists.
        FS.readFile(path, (function(err, data){
	  console.log("Obtained data from " + path);
          if (err){
            this.emit("error", err);
          } else {
            try {
	      console.log("Parsing data.");
              VerifyDB(this, JSON.parse(data.toString()));
              this.emit("opened", null);
              this.emit("changed", null);
            } catch (e) {
              this.emit("error", e);
            }
          }
        }).bind(this));
      } else {
        this.emit("no_database", null);
        this.emit("opened", null);
      }
    }).bind(this));
  };

  database.prototype.save = function(path){
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

  database.prototype.addEpisode = function(edata){
    if (typeof(edata) === typeof({})){
      try {
	var ep = new episode(edata);
	if (this._GetEpisodeIndex(ep.guid) < 0){
	  this._episode.push(ep);
	  this.emit("episode_added", null, ep);
	  this.emit("changed", null);
	}
      } catch (e) {
	throw e;
      }
    } else if (edata instanceof episode){
      if (this._GetEpisodeIndex(ep.guid) < 0){
	this._episode.push(ep);
	this.emit("episode_added", "", ep);
	this.emit("changed", null);
      }
    } else {
      throw new Error("Invalid type. Given " + typeof(edata));
    }
  };

  database.prototype.episode = function(guid_or_index){
    var index = this._GetEpisodeIndex(guid_or_index);
    if (index >= 0){
      return this._episode[index];
    }
    return null;
  };

  database.prototype._GetEpisodeIndex = function(guid_or_index){
    if (typeof(guid_or_index) === 'number' && guid_or_index%1 === 0){
      if (guid_or_index >= 0 && guid_or_index < this._episode.length){
        return guid_or_index;
      }
    } else if (typeof(guid_or_index) === 'string'){
      for (var i=0; i < this._episode.length; i++){
        if (this._episode[i].guid === guid_or_index){
          return i;
        }
      }
    }
    return -1;
  };


  Object.defineProperties(database.prototype, {
    "json":{
      get:function(){return this.toString();},
      set:function(str){
	try {
	  this.fromString(str);
	} catch (e) {throw e;}
      }
    },

    "episodeCount":{
      get:function(){return this._episode.length;}
    },

    "path_audio":{
      get:function(){return this._path.audio;},
      set:function(path){
        this._path.audio = Path.normalize(path);
        this.emit("changed", null);
      }
    }
  });


  return database;
})();
