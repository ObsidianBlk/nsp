

if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.EpisodeView = (function(){

  var Events = require('events');
  var FS = require('fs');
  var Path = require('path');
  var Feeder = require('./js/app/util/feeder');

  var templates = {
    episodeDetails: FS.readFileSync("templates/episodeDetails.html").toString(),
    episodeDetailsStory: FS.readFileSync("templates/episodeDetailsStory.html").toString()
  };


// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------



  function AudioPath(episode){
    var path = Path.join(NSP.config.path.audio, episode.audio_filename);
    var lstat = null;
    try {
      var lstat = FS.lstatSync(path);
    } catch (e) {
      // Do nothing
    }

    if (lstat !== null && lstat.isFile()){
      return {
	path: path,
	type: "local"
      };
    }
    return {
      path: episode.audio_src,
      type: "remote"
    };
  }


// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------


  function DeleteAudioFile(episode){
    var path = Path.join(NSP.config.path.audio, episode.audio_filename);
    var lstat = null;
    try {
      var lstat = FS.lstatSync(path);
    } catch (e) {
      // Do nothing
    }

    if (lstat !== null && lstat.isFile()){
      FS.unlink(path);
    }
  }


// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------


  function ListEntity(episode){
    var e = $("<li></li>");
    var header = $("<div></div>").addClass("collapsible-header blue-grey darken-2").css({"overflow": "auto"});

    var img = $("<img src=\"\">").height("64px").css({
      "width":"auto",
      "valign":"center",
      "margin":"0.1rem 0.5rem 0.5rem 0.2rem"
    }).addClass("left");

    if (episode.img_src !== ""){
      img.attr("src", episode.img_src);
    } else {
      img.attr("src", "images/nsp_logo.png");
      // This will search for an episode specific image and change the image source if one is found.
      require("./js/app/util/epImageFinder")(episode, function(ep, src){
	if (src !== ""){
	  img.attr("src", src);
	  if (ep.img_src !== src){
	    ep.img_src = src;
	  }
	}
      }, function(err){console.log(err);});
    }

    header.append(img).append($("<p></p>").addClass("truncate").text(episode.title));

    var body = $("<div></div>").addClass("collapsible-body").css({"background-color":"#FFFFFF"});
    body.append($("<p></p>").text(episode.shortDescription));

    return e.append(header).append(body);
  }



// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------

  var _activeDownloads = [];

  function SetActiveDownload(episode, addEpisode){
    addEpisode = (typeof(addEpisode) === 'boolean') ? addEpisode : true;
    var remove = !addEpisode;
    for (var i=0; i < _activeDownloads.length; i++){
      if (_activeDownloads[i] === episode){
	if (remove){
	  _activeDownloads.splice(i, 1);
	  return true;
	} else {
	  addEpisode = false;
	}
	break;
      }
    }

    if (addEpisode){
      _activeDownloads.push(episode);
      return true;
    }
    return false;
  };

  function IsEpisodeDownloading(episode){
    for (var i=0; i < _activeDownloads.length; i++){
      if (_activeDownloads[i] === episode){
	return true;
      }
    }
    return false;
  };


  function EpisodeDetails(entity, episode, audioPlayer){
    entity.empty();
    entity.html(templates.episodeDetails);

    // Sets the episode ID. This is important when downloading episodes.
    entity.find("#entity_id").attr("data-id", episode.guid);

    if (episode.img_src !== ""){
      entity.find(".episode-detail-image").attr("src", episode.img_src).css({
	"width":"20rem",
	"height":"auto"
      });;
    }

    entity.find(".episode-detail-title").append(episode.title);
    entity.find(".episode-detail-description").append(episode.shortDescription);

    var i = 0;
    for (i=0; i < this.tagCount; i++){
      entity.find(".chip-tags").append(
	$("<div></div>").addClass("tags chip").append(episode.tag(i)).append("<i class=\"material-icons\">close</i>")
      );
    }

    for (i=0; i < episode.storyCount; i++){
      var story = $(templates.episodeDetailsStory);
      var estory = episode.story(i);
      story.find(".episode-detail-card-story-title").append(estory.title);
      if (estory.beginning !== ""){
	var time = $("<time></time>").addClass("grey-text text-lighten-1").append("<i>Starting:</i> " + estory.beginning);
	if (estory.duration > 0){
	  time.append(" (dur: " + estory.durationString + ")");
	}
	story.find(".title-block").append("<br>").append(time);
      }
      entity.append(story);
    }

    for (i=0; i < 8; i++){
      entity.append("<br>");
    }

    // -------------
    // Defining the buttons and their functions!

    var audioPath = AudioPath(episode);

    var options = entity.find(".episode-options"); // This grabs all episode option buttons!
    var op_download = entity.find(".episode-download");
    var op_playlist = entity.find(".episode-addtoplaylist");
    var op_playpause = entity.find(".episode-play");

    if (op_download.length > 0){
      if (IsEpisodeDownloading(episode)){
	// It could take a while to download an episode, and we don't want to do it more than once.
	// This disables all of the buttons so that nothing can happen until download is complete.
	options.addClass("disabled");
      } else if (audioPath.type === "local"){
	op_download.find(".option-delete").removeAttr("style");
	op_download.find(".option-download").css("display", "none");
      }

      op_download.on("click", function(){
	if (op_download.find("option-download").css("display") === "none"){
	  DeleteAudioFile(episode);
	  op_download.find(".option-download").removeAttr("style");
	  op_download.find(".option-delete").css("display", "none");
	  Materialize.toast("Episode removed from hard drive.", 4000);
	} else {
	  if (SetActiveDownload(episode)){
	    var feed = new Feeder();

	    Materialize.toast("Downloading episode...", 4000);
	    options.addClass("disabled");
	    feed.downloadFile(episode.audio_src, Path.join(NSP.config.path.audio, episode.audio_filename), function(err){
	      var process = false;
	      if (entity.find("#entity_id").length > 0 && entity.find("#entity_id").data("id") === episode.guid){
		process = true;
	      }

	      if (err !== null){
		Materialize.toast("Download failed: " + err.message, 4000);
		console.log(err.message);
	      } else {
		Materialize.toast("Episode \"" + episode.title + "\" download complete.", 4000);
		if (process){
		  op_download.find(".option-delete").removeAttr("style");
		  op_download.find(".option-download").css("display", "none");
		}
	      }
	      if (process){ 
		options.removeClass("disabled");
	      }
	      SetActiveDownload(episode, false);
	    });
	  }
	}
      });
    }

    if (op_playlist.length > 0){
      op_playlist.on("click", function(){
	if (audioPlayer.isEpisodeQueued(episode) === false){
	  audioPlayer.queueEpisode(episode);
	} else {
	  Materialize.toast("Episode \"" + episode.title + "\" already queued.", 4000);
	}
      });
    }

    if (op_playpause.length > 0){
      op_playpause.on("click", function(){
	audioPlayer.clearTracks();
	audioPlayer.queueEpisode(episode);
	audioPlayer.playTrack(0);
      });
    }
  }



// -----------------------------------------------------------------------
// -----------------------------------------------------------------------
// -----------------------------------------------------------------------


  
  function episodeView(listview_class, sheetview_class, audioPlayer){
    this._audioPlayer = audioPlayer;
    this._listview = $(listview_class);
    if (this._listview.length !== 1){
      throw new Error("Could not find list view entity.");
    }
    this._sheetview = $(sheetview_class);
    if (this._sheetview.length !== 1){
      throw new Error("Could not find sheet view entity.");
    }

    //class="collapsible" data-collapsible="accordion"
    this._list = $("<ul></ul>").addClass("collapsible popout").attr("data-collapsible","accordion");
    this._listview.append(this._list);

    this._listDirty = false;

    this._activeCard = [null, null];
    this._slideActive = false;
    this._slideBuffer = 200; // px

    this._episodeCard = [];
    this._search = "";
    this._searchType = "tags";
    this._searchExact = false;

    this._activeDownloads = [];

    this._updateInterval = setInterval((function(){
      if (this._listDirty){
	$('.collapsible').collapsible();
	this._listDirty = false;
      }
    }).bind(this), 200);

    this._sheetview.find("#sheet_content").animate({"margin-left":this._sheetview.width()+this._slideBuffer}, 400);
  };
  episodeView.prototype.__proto__ = Events.EventEmitter.prototype;
  episodeView.prototype.constructor = episodeView;

  episodeView.prototype.connectToDB = function(db){
    db.on("episode_added", this.onEpisodeAdded.bind(this));
    // TODO: Add a "disconnect" option!
  };

  episodeView.prototype.addEpisode = function(episode, append){
    // We'll assume newest goes first unless explicitly stated
    append = (typeof(append) === 'boolean') ? append : false;
    this._episodeCard.push(episode);
    
    var le = ListEntity(episode);
    le.on("click", (function(){
      this._SlideToContent(le, episode);
    }).bind(this));

    if (append){
      this._list.append(le);
    } else {
      this._list.prepend(le);
    }
    this._listDirty = true;
  };

  episodeView.prototype.onEpisodeAdded = function(episode){
    if (this._search !== ""){
      if (this._searchType === "tags"){
	if (this._searchExact){
	  if (episode.hasTag(this._search)){
	    this.addEpisode(episode);
	  }
	} else {
	  if (episode.hasTagLike(this._search)){
	    this.addEpisode(episode);
	  }
	}
      }
    } else {
      this.addEpisode(episode);
    }
  };


  episodeView.prototype._SlideToContent = function(entity, episode){
    if (entity.hasClass("active")){
      if (this._activeCard[0] !== episode){
        this._activeCard[1] = episode;
      }
    } else {
      this._activeCard[0] = null;
    }
    var content = this._sheetview.find("#sheet_content");

    if (!this._slideActive){
      this._slideActive = true;
      if (content.css("margin-left") === "0px"){
        content.animate({"margin-left":this._sheetview.width()+this._slideBuffer}, 400, this._OnSlideOut.bind(this));
      } else {
        if (this._activeCard[1] !== null){
          this._activeCard[0] = this._activeCard[1];
          this._activeCard[1] = null;
          EpisodeDetails(content, this._activeCard[0], this._audioPlayer);
        }
        content.animate({"margin-left":0}, 400, this._OnSlideOut.bind(this));
      }
    }
  };



  episodeView.prototype._OnSlideOut = function(){
    if (this._activeCard[1] !== null || this._activeCard[0] === null){
      var content = this._sheetview.find("#sheet_content");
      this._slideActive = true;
      content.animate({"margin-left":this._sheetview.width()+this._slideBuffer}, 400, this._OnSlideIn.bind(this));
    } else {
      this._slideActive = false;
    }
  };


  episodeView.prototype._OnSlideIn = function(){
    var content = this._sheetview.find("#sheet_content");
    if (this._activeCard[1] !== null){
      this._activeCard[0] = this._activeCard[1];
      this._activeCard[1] = null;
      EpisodeDetails(content, this._activeCard[0], this._audioPlayer);
      this._slideActive = true;
      content.animate({"margin-left":0}, 400, this._OnSlideOut.bind(this));
    } else {
      this._slideActive = false;
      content.empty();
    }
  };


  return episodeView;
})();
