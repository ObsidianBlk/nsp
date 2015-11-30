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


var Application = (function($){
  var Events = require("events");
  var Path = require("path");
  var FS = require("fs");
  var Database = require("./js/app/model/database");
  var Config = require("./js/app/model/config");
  var Feeder = require("./js/app/util/feeder");
  var Mkdirr = require("./js/app/util/mkdirr");

  if (typeof(window.NSP) === 'undefined'){
    window.NSP = {
      config:null,
      db:null
    };
  }


  function GetDataPath(dataPath){
    if (typeof(dataPath) !== 'string'){
      dataPath = "data";
    }
    //var dataPath = require("nw.gui").App.dataPath;

    // No point in arguing if it's an absolute path.
    if (Path.isAbsolute(dataPath)){
      return dataPath;
    }

    var tmp = Path.resolve(dataPath);
    // If the dataPath's root is the same as the executables root... then we're fine!
    if (Path.dirname(tmp) === Path.dirname(process.execPath)){
      return tmp;
    } else {
      // Check to see if there's a "package.nw" file in the execPath's root...
      try {
	var lstat = FS.lstatSync(Path.join(Path.dirname(process.execPath), "package.nw"));
	if (lstat.isFile()){
	  // Assume we're running from the execPath!
	  return Path.join(Path.dirname(process.execPath), dataPath);
	}
      } catch (e) {/* skip */}
    }
    // Otherwise, assume it's simply the full path to dataPath.
    return tmp;
  }


  function MkConfigPaths(pathList, index, cb){
    Mkdirr(pathList[index], function(err){
      if (err){
	cb(err);
      } else {
	if (index+1 < pathList.length){
	  MkConfigPaths(pathList, index+1, cb);
	} else {
	  cb();
	}
      }
    });
  }


  var App = function(){
    this._dbopened = false;
    this._heartbeatID = null;
    this._curHeartbeatRythm = 0;
  };
  App.prototype.__proto__ = Events.EventEmitter.prototype;
  App.prototype.constructor = App;


  
  App.prototype.feedUpdate = function(feed){
    if (!(feed instanceof Feeder)){
      throw new TypeError();
    }

    var itemcount = 0;
    feed.on("rss_item", (function(item){
      itemcount += 1;
      try{
	NSP.db.addEpisode(item);
      } catch (e) {
        this.emit("error", e);
      }
      itemcount -= 1;
    }).bind(this));

    // Ok... let's look at that feed!
    feed.rss('http://nosleeppodcast.libsyn.com/rss');
  };



  
  App.prototype.run = function(){
    // Gate keeper. We only want to run this function... once!
    if (this._application_running){
      throw new Error("Attempting to run the application twice");
    }
    this._application_running = true;

    var AnnounceApplicationReady = (function(){
      // --------------------------
      // This will kickoff the application heartbeat.
      // --------------------------
      this._HeartbeatRythm(NSP.config.heartbeatRythm);
      // Announce application is ready to go!
      this.emit("application_ready");
    }).bind(this);

    var dataPath = GetDataPath();//Path.resolve(require("nw.gui").App.dataPath);
    NSP.config = new Config(dataPath);
    NSP.db = new Database();

    this.emit("config_created");
    this.emit("database_created");

    NSP.db.on("error", function(err){
      if (typeof(err.message) !== 'undefined'){
	console.log(err.message);
      } else {
	console.log(err);
      }
    });
    
    NSP.db.on("opened", (function(database_exists){
      this.emit("database_loaded");
      if (NSP.config.downloadFeedAtStartup || database_exists === false){
	var feed = new Feeder();

        feed.on("rss_complete", (function(){
          if (NSP.db.dirty || !database_exists){
	    NSP.db.save(NSP.config.absolutePath.database);
          } else {
	    console.log("No new episodes.");
          }
          AnnounceApplicationReady();
        }).bind(this));

	feed.on("error", function(error){
	  if (typeof(error.message) !== 'undefined'){
	    console.log(error.message);
	  } else {
	    console.log(error);
	  }
	  Materialize.toast("Failed to read RSS feed. No internet connection?");
	  AnnounceApplicationReady();
	});

        this.feedUpdate(feed);

      } else {
	if (database_exists === false){
	  NSP.db.save(NSP.config.absolutePath.database);
	}

	AnnounceApplicationReady();
      }
    }).bind(this));


    var BuildDatabase = (function(config_exists){
      // Now... create the required paths defined by the config if they don't exist.
      MkConfigPaths([
	Path.dirname(NSP.config.absolutePath.database),
	NSP.config.absolutePath.playlists,
	NSP.config.absolutePath.audio,
	NSP.config.absolutePath.images
      ], 0, (function(err){
	if (!err){
          if (config_exists === false){
	    NSP.config.save();
          }
	  if (this._dbopened === false){
	    // Config loaded and paths should be ready, now load the database file.
	    NSP.db.open(NSP.config.absolutePath.database, NSP.config.skipInvalidEpisodes);
	    this._dbopened = true;
	  }
	} else {
	  console.log(err.message);
	}
      }).bind(this));
    }).bind(this);


    NSP.config.on("error", function(err){
      if (typeof(err.message) !== 'undefined'){
	console.log(err.message);
      } else {
	console.log(err);
      }

      // Load DB anyway. Config should have default values.
      // TODO: Change this to a question for the user.
      BuildDatabase(false);
    });

    NSP.config.on("opened", (function(config_exists){
      this.emit("config_loaded");
      BuildDatabase(config_exists);
    }).bind(this));

    NSP.config.open();
  };

  App.prototype._HeartbeatRythm = function(rythm){
    if (rythm <= 0){return;}

    if (this._heartbeatID !== null){
      clearInterval(this._hearbeatID);
      this._heartbeatID = null;
    }

    this._heartbeatID = setInterval((function(){
      if (NSP.config.heartbeatRythm !== rythm){
	this._HeartbeatRythm(NSP.config.heartbeatRythm);
      } else {
	this.emit("heartbeat");
      }
    }).bind(this), rythm);
  };

  Object.defineProperties(App.prototype, {
    "running":{
      get:function(){return this._application_running;}
    }
  });

  return App;
})($);
