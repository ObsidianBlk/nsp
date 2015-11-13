
var Application = (function($){
  var Events = require("events");
  var Path = require("path");
  var Database = require("./js/app/model/database");
  var Config = require("./js/app/model/config");
  var Feeder = require("./js/app/util/feeder");


  if (typeof(window.NSP) === 'undefined'){
    window.NSP = {
      application_name:"nosleeppodapp",
      config:null,
      db:null
    };
  }


  var App = function(){
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

    var config_path = Path.normalize(Path.join(require("./js/app/util/userPath")(NSP.application_name), "config.json"));
    NSP.config = new Config(NSP.application_name);
    NSP.db = new Database();

    this.emit("config_created");
    this.emit("database_created");

    NSP.db.on("error", function(err){
      console.log(err);
    });
    
    NSP.db.on("opened", (function(database_exists){
      this.emit("database_loaded");
      if (NSP.config.downloadFeedAtStartup || database_exists === false){
	var feed = new Feeder();

        feed.on("rss_complete", (function(){
          if (NSP.db.dirty || !database_exists){
	    NSP.db.save(NSP.config.path.database);
          } else {
	    console.log("No new episodes.");
          }
          AnnounceApplicationReady();
        }).bind(this));

        this.feedUpdate(feed);

      } else {
	if (database_exists === false){
	  NSP.db.save(NSP.config.path.database);
	}

	AnnounceApplicationReady();
      }
    }).bind(this));

    NSP.config.on("error", function(err){
      console.log(err);

      // Load DB anyway. Config should have default values.
      // TODO: Change this to a question for the user.
      NSP.db.open(NSP.config.path.database, NSP.config.skipInvalidEpisodes);
    });

    NSP.config.on("opened", (function(config_exists){
      this.emit("config_loaded");
      if (config_exists === false){
	NSP.config.save(config_path);
      }
      // Config loaded, now load the database file.
      NSP.db.open(NSP.config.path.database, NSP.config.skipInvalidEpisodes);
    }).bind(this));

    NSP.config.open(config_path);
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
