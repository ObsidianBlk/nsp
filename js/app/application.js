

// TODO: This is put out in the global space for temporary simplicity.
// Planning on reworking a bit of the application organization!
function EpisodeCard (episode){
  var e = $("<div></div>").addClass("z-depth-3").css({
    "margin": "0.5rem 0.1rem 0",
    "border-radius": "2px"
  });
  
  var header = $("<div></div>").addClass("card-image blue-grey darken-2").css({"overflow": "auto"});
  var img = $("<img src=\"images/nsp_logo.png\">").height("64px").css({
    "width":"auto",
    "valign":"center",
    "margin":"0.1rem 0.5rem 0.5rem 0.2rem"}).addClass("left");
  // This will search for an episode specific image and change the image source if one is found.
  require("./js/app/epImageFinder")(episode, function(ep, src){
    if (src !== ""){
      img.attr("src", src);
      //TODO: Maybe... save this locally? IDK.
    }
  }, function(err){console.log(err);});

  // Now back to our regularly scheduled html building via JQuery... wheeee!
  var tblock = $("<p></p>").css({
    "margin-top":"0",
    "margin-bottom":"0"
  });
  var dt = $("<span></span>").css({"font-size":"0.75rem"}).append(episode.date.toString());
  tblock.append(episode.title).append("<br>").append(dt);
  header.append($("<div></div>").addClass("card-title blue-grey-text text-lighten-5").css("display", "inline-block").append(tblock)).append(img);

  var body = $("<div></div>").addClass("blue-grey lighten-1").css({
    "padding": "20px",
    "background-color":"#FFFFFF"
  });
  var desc = $("<p></p>").append(episode.shortDescription);
  body.append(desc);

  e.append(header).append(body);

  $(".cards").append(e);
}



var Application = (function($){
  var Events = require("events");
  var Database = require("./js/app/database");
  var Config = require("./js/app/config");
  var Feeder = require("./js/app/feeder.js");


  if (typeof(window.NSP) === 'undefined'){
    window.NSP = {
      config:null,
      db:null
    };
  }


  var App = function(){
    this._application_running = false;
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

    NSP.config = new Config();
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
          this.emit("application_ready");
        }).bind(this));

        this.feedUpdate(feed);

      } else if (database_exists === false){
	NSP.db.save(NSP.config.path.database);
	this.emit("application_ready");
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
	NSP.config.save("config.json");
      }
      // Config loaded, now load the database file.
      NSP.db.open(NSP.config.path.database, NSP.config.skipInvalidEpisodes);
    }).bind(this));

    NSP.config.open("config.json");
  };

  Object.defineProperties(App.prototype, {
    "running":{
      get:function(){return this._application_running;}
    }
  });

  return App;
})($);
