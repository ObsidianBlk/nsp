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


module.exports = (function(){
  var FS = require("fs");
  var Path = require("path");
  var Events = require("events");

  var episode = require("./episode");

  var JSON_INDENTATION_STRING = "  ";


  function VerifyDB(db, data, skipInvalidEpisodes){
    if (typeof(data) !== typeof({})){
      throw new Error("Database is not an object.");
    }
    
    if (typeof(data.episode) === 'undefined'){
      db._episode = [];
    } else if (data.episode instanceof Array){
      db._episode = [];
      for (var i=0; i < data.episode.length; i++){
        try {
          db.addEpisode(data.episode[i]);
        } catch (e) {
          if (!skipInvalidEpisodes){
            console.log(data);
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
    this._episode = [];
    this._dirty = false;
    this._loading = false;
    this._saving = false;
  }
  database.prototype.__proto__ = Events.EventEmitter.prototype;
  database.prototype.constructor = database;

  database.prototype.fromString = function(str){
    try {
      VerifyDB(this, JSON.parse(str), false);
      this._dirty = true;
      this.emit("changed", null);
    } catch (e) {throw e;}
  };

  database.prototype.toString = function(){
    var data = {};
    if (this._episode.length > 0){
      data.episode = [];
      for (var i=0; i < this._episode.length; i++){
	data.episode.push(JSON.parse(this._episode[i].toString()));
      }
    }
    return JSON.stringify(data, null, JSON_INDENTATION_STRING);
  };

  database.prototype.open = function(path, skipInvalidEpisodes){
    if (this.loading || this.saving){return;}
    skipInvalidEpisodes = (typeof(skipInvalidEpisodes) === 'boolean') ? skipInvalidEpisodes : false;

    path = Path.normalize(path);
    this._loading = true;
    FS.readFile(path, (function(err, data){
      if (err){
	this._loading = false;
	if (err.code == 'ENOENT'){
	  this.emit("opened", false); // File doesn't exit. Not an error state, really.
	} else {
	  // On the other hand... WE'RE ALL GONNA DIE!
          this.emit("error", err);
	}
      } else {
        try {
          VerifyDB(this, JSON.parse(data.toString()), skipInvalidEpisodes);
          this._loading = false;
	  this._dirty = false; // Because if we're loading from a source, that data hasn't changed yet.
          this.emit("opened", true);
          this.emit("changed");
        } catch (e) {
          this.emit("error", e);
        }
      }
    }).bind(this));
  };

  database.prototype.save = function(path){
    if (this.loading || this.saving){return;}
    
    path = Path.normalize(path);
    var base = Path.dirname(path);
    this._saving = true;

    var WriteDatabase = (function(){
      FS.writeFile(path, this.toString(), (function(err){
        this._saving = false;
	if (err){
	  this.emit("error", err);
	} else {
	  this._dirty = false;
	  this.emit("saved");
	}
      }).bind(this));
    }).bind(this);

    if (process.platform === "win32"){
      // NOTE: The FS.access() function does not work as expected in Windows... so we'll just cross our fingers for now!
      WriteDatabase();
    } else {
      FS.access(base, FS.R_OK | FS.W_OK, (function(err){
	if (!err){
	  WriteDatabase();
	} else {
          this._saving = false;
	  this.emit("error", err);
	}
      }).bind(this));
    }
  };

  database.prototype.addEpisode = function(edata){
    var ep = null;
    if (typeof(edata) === typeof({})){
      try {
	var ep = new episode(edata);
	if (this._GetEpisodeIndex(ep.guid) >= 0){
	  ep = null;
	}
      } catch (e) {
	throw e;
      }
    } else if (edata instanceof episode){
      if (this._GetEpisodeIndex(ep.guid) < 0){
	ep = edata;
      }
    } else {
      throw new Error("Invalid type. Given " + typeof(edata));
    }

    if (ep !== null){
      ep.on("changed", (function(){
	this._dirty = true;
      }).bind(this));
      this._episode.push(ep);
      if (this.loading === false){
	this._dirty = true;
	this.emit("episode_added", ep);
	this.emit("changed");
      }
    }
  };

  database.prototype.episode = function(guid_or_index){
    var index = this._GetEpisodeIndex(guid_or_index);
    if (index >= 0){
      return this._episode[index];
    }
    return null;
  };

  database.prototype.getEpisodeIndex = function(guid){
    return this._GetEpisodeIndex(guid);
  };

  database.prototype.episodeList = function(filter){
    if (typeof(filter) === 'function'){
      return this._episode.filter(filter);
    }
    return this._episode.slice();
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

    "dirty":{
      get:function(){return this._dirty;}
    },

    "loading":{
      get:function(){return this._loading;}
    },

    "saving":{
      get:function(){return this._saving;}
    }
  });


  return database;
})();
