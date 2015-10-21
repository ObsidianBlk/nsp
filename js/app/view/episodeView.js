

if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.EpisodeView = (function(){

  var Events = require('events');
  var FS = require('fs');
  var Path = require('path');
  var Feeder = require('./js/app/util/feeder');

  var templates = {
    episodeListEntry: FS.readFileSync("templates/episodeListEntry.html").toString(),
    episodeDetails: FS.readFileSync("templates/episodeDetails.html").toString(),
    episodeDetailsStory: FS.readFileSync("templates/episodeDetailsStory.html").toString()
  };


  var PATH_DEFAULT_LOGO = "resources/images/nsp_logo.png";

  var LISTENTRY = {
    img:".episode-entry-image",
    title:".episode-entry-title",
    description:".episode-entry-description"
  };

  var DETAIL = {
    title: ".episode-detail-title",
    description: ".episode-detail-description",
    img: ".episode-detail-image",
    tags: ".episode-detail-tags",
    story_details: ".story-detail",
    actions: ".episode-action",
    action_queue: ".episode-action-queue",
    action_play: ".episode-action-play",
    action_download: ".episode-action-download"
  };

  var STORY = {
    header: ".title-block",
    title_block: ".story-title-block",
    title: ".story-detail-title",
    actions: ".story-action",
    action_queue: ".story-action-queue",
    action_jumpto: ".story-action-jumpto"
  };



// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------


  function FilePathExists(path){
    var lstat = null;
    try {
      lstat = FS.lstatSync(path);
    } catch (e) { /* Do nothing */}
    return (lstat !== null) ? lstat.isFile() : false;
  }

// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------



  function AudioPath(episode){
    var path = Path.join(NSP.config.path.audio, episode.audio_filename);
    var lstat = null;
    try {
      lstat = FS.lstatSync(path);
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
    var e = $(templates.episodeListEntry);
    var img = e.find(LISTENTRY.img);

    var title = (episode.seasonEpisodeTitle !== "") ? episode.seasonEpisodeTitle : episode.title;
    e.find(LISTENTRY.title).append(title);
    e.find(LISTENTRY.description).append(episode.shortDescription);

    if (img.length > 0 && episode.img_src !== ""){
      var localPath = Path.join(NSP.config.path.images, episode.img_filename);
      if (FilePathExists(localPath)){
	img.attr("src", localPath);
      } else {
	if (NSP.config.autoCacheImages){
	  var feed = new Feeder();
	  feed.downloadFile(episode.img_src, localPath, function(err){
	    if (err){
	      console.log(err.message);
	      img.attr("src", episode.img_src);
	    } else {
	      img.attr("src", localPath);
	    }
	  });
	} else {
	  img.attr("src", episode.img_src);
	}
      }
    } else if (img.length > 0){
      img.attr("src", PATH_DEFAULT_LOGO);
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


    return e;
  }

/*  function ListEntity(episode){
    var e = $("<li></li>");
    var header = $("<div></div>").addClass("collapsible-header blue-grey darken-2").css({"overflow": "auto"});

    var img = $("<img src=\"\">").height("64px").css({
      "width":"auto",
      "valign":"center",
      "margin":"0.1rem 0.5rem 0.5rem 0.2rem"
    }).addClass("left");

    if (episode.img_src !== ""){
      var localPath = Path.join(NSP.config.path.images, episode.img_filename);
      if (FilePathExists(localPath)){
	img.attr("src", localPath);
      } else {
	if (NSP.config.autoCacheImages){
	  var feed = new Feeder();
	  feed.downloadFile(episode.img_src, localPath, function(err){
	    if (err){
	      console.log(err.message);
	      img.attr("src", episode.img_src);
	    } else {
	      img.attr("src", localPath);
	    }
	  });
	} else {
	  img.attr("src", episode.img_src);
	}
      }
    } else {
      img.attr("src", PATH_DEFAULT_LOGO);
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

    var title = (episode.seasonEpisodeTitle !== "") ? episode.seasonEpisodeTitle : episode.title;
    header.append(img).append($("<p></p>").addClass("truncate").text(title));

    var body = $("<div></div>").addClass("collapsible-body").css({"background-color":"#FFFFFF"});
    body.append($("<p></p>").text(episode.shortDescription));

    return e.append(header).append(body);
  }
*/


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


  function ImageSource(episode){
    var path = Path.join(NSP.config.path.images, episode.img_filename);
    return (FilePathExists(path)) ? path : episode.img_src;
  }


  function EpisodeDetails(entity, episode, audioPlayer){
    entity.empty();
    entity.html(templates.episodeDetails);

    // Sets the episode ID. This is important when downloading episodes.
    entity.find("#entity_id").attr("data-id", episode.guid);

    if (episode.img_src !== ""){
      entity.find(DETAIL.img).attr("src", ImageSource(episode)).css({
	"width":"20rem",
	"height":"auto"
      });;
    }

    var title = (episode.seasonEpisodeTitle !== "") ? episode.seasonEpisodeTitle : episode.title;
    entity.find(DETAIL.title).append(title);
    entity.find(DETAIL.description).append(episode.shortDescription);

    var i = 0;
    for (i=0; i < episode.tagCount; i++){
      entity.find(DETAIL.tags).append(
	$("<div></div>").addClass("tags chip").append(episode.tag(i)).append("<i class=\"material-icons\">close</i>")
      );
    }

    for (i=0; i < episode.storyCount; i++){
      var story = $(templates.episodeDetailsStory);
      var estory = episode.story(i);
      entity.append(StoryDetails(story, episode, estory, audioPlayer));
    }

    for (i=0; i < 8; i++){
      entity.append("<br>");
    }

    // -------------
    // Defining the buttons and their functions!

    var audioPath = AudioPath(episode);

    var actions = entity.find(DETAIL.actions); // This grabs all episode option buttons!
    var act_download = entity.find(DETAIL.action_download);
    var act_queue = entity.find(DETAIL.action_queue);
    var act_playpause = entity.find(DETAIL.action_play);

    if (act_download.length > 0){
      if (IsEpisodeDownloading(episode)){
	// It could take a while to download an episode, and we don't want to do it more than once.
	// This disables all of the buttons so that nothing can happen until download is complete.
	actions.addClass("disabled");
      } else if (audioPath.type === "local"){
	SetDownloadActionState(act_download, "delete");
      }

      act_download.on("click", function(){
	if (act_download.find("option-download").css("display") === "none"){
	  DeleteAudioFile(episode);
	  SetDownloadActionState(act_download, "download");
	  Materialize.toast("Episode removed from hard drive.", 4000);
	} else {
	  if (SetActiveDownload(episode)){
	    var feed = new Feeder();

	    Materialize.toast("Downloading episode...", 4000);
	    actions.addClass("disabled");
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
		  SetDownloadActionState(act_download, "delete");
		}
	      }
	      if (process){ 
		actions.removeClass("disabled");
	      }
	      SetActiveDownload(episode, false);
	    });
	  }
	}
      });
    }

    if (act_queue.length > 0){
      if (audioPlayer.isEpisodeQueued(episode)){
	SetQueueActionState(act_queue, "remove");
      }
      act_queue.on("click", function(){
	if (audioPlayer.isEpisodeQueued(episode) === false){
	  audioPlayer.queueEpisode(episode);
	} else {
	  Materialize.toast("Episode \"" + episode.title + "\" already queued.", 4000);
	}
      });
    }

    if (act_playpause.length > 0){
      if (audioPlayer.isEpisodeQueued(episode)){
	act_playpause.addClass("disabled");
      }
      act_playpause.on("click", function(){
	audioPlayer.clearTracks();
	audioPlayer.queueEpisode(episode);
	audioPlayer.playTrack(0);
      });
    }
  }


// -----------------------------------------------------------------------
// -----------------------------------------------------------------------
// -----------------------------------------------------------------------


  function StoryDetails(entity, episode, story, audioPlayer){
    entity.find(STORY.title).append(story.title);
    entity.data("title", story.title);
    if (story.beginning !== ""){
      entity.find(".story-action-buttons").css("display", "inline");
      var time = $("<time></time>").addClass("grey-text text-lighten-1").append("<i>Starting:</i> " + story.beginning);
      if (story.duration > 0){
	time.append(" (dur: " + story.durationString + ")");
      }
      entity.find(STORY.header).append(time);
    }

    var act_queue = entity.find(".story-action-queue");
    var act_jumpto = entity.find(".story-action-jumpto");

    if (audioPlayer.isStoryQueued(story)){
      SetActionState(act_queue, ["remove", "add"], 0);
    }
    act_queue.on("click", function(){
      if (act_queue.find(".option-add").css("display") === "none"){
	Materialize.toast("Remove story from queue not implemented yet.");
      } else {
	audioPlayer.queueEpisode(episode, story);
      }
    });

    if (audioPlayer.currentTrackStory === story){
      SetActionState(act_jumpto, ["pause", "jumpto", "play"], 0);
    }
    act_jumpto.on("click", function(){
      if (act_jumpto.find(".option-jumpto").css("display") !== "none"){
	audioPlayer.clearTracks();
	audioPlayer.queueEpisode(episode, story);
	audioPlayer.playTrack(0);
      } else if (act_jumpto.find(".option-pause").css("display") !== "none"){
	audioPlayer.play();
      } else {
	audioPlayer.pause();
      }
    });

    return entity;
  }

// -----------------------------------------------------------------------
// -----------------------------------------------------------------------
// -----------------------------------------------------------------------


  function SetActionState(btn, opt, state){
    if (btn.length > 0 && opt.length > 0){
      for (var i=0; i < opt.length; i++){
	if (i === state){
	  btn.find(".option-" + opt[i]).removeAttr("style");
	} else {
	  btn.find(".option-" + opt[i]).css("display", "none");
	}
      }
    }
  }


  // NOTE: The above functions does the work of the following three, but I don't want to bother refactoring the code at the moment, so
  // these will stay for a while.
  function SetQueueActionState(btn, state){
    if (btn.length > 0){
      if (state === "add"){
	btn.find(".option-add").removeAttr("style");
	btn.find(".option-remove").css("display", "none");
      } else if (state === "remove"){
	btn.find(".option-remove").removeAttr("style");
	btn.find(".option-add").css("display", "none");
      }
    }
  }

  function SetPlayPauseActionState(btn, state){
    if (btn.length > 0){
      if (state === "play"){
	btn.find(".option-play").removeAttr("style");
	btn.find(".option-pause").css("display", "none");
      } else if (state === "pause"){
	btn.find(".option-pause").removeAttr("style");
	btn.find(".option-play").css("display", "none");
      }
    }
  }

  function SetDownloadActionState(btn, state){
    if (btn.length > 0){
      if (state === "download"){
	btn.find(".option-download").removeAttr("style");
	btn.find(".option-delete").css("display", "none");
      } else if (state === "delete"){
	btn.find(".option-delete").removeAttr("style");
	btn.find(".option-download").css("display", "none");
      }
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
    // These <BR>s fix a scroll bug
    this._listview.append("<br>");
    this._listview.append("<br>");
    this._listview.append("<br>");
    this._listview.append("<br>");
    this._listview.append("<br>");
    this._listview.append("<br>");

    this._listDirty = false;
    this._sheetDirty = false;

    this._activeCard = [null, null];
    this._slideActive = false;
    this._slideBuffer = 200; // px

    this._episodeCard = [];
    this._filter = [];

    this._activeDownloads = [];

    this._configured = false;

    this._updateInterval = setInterval((function(){
      if (this._listDirty || this._sheetDirty){
	if (this._listDirty){
	  $('.collapsible').collapsible();
	  this._listDirty = false;
	}
	$('.tooltipped').tooltip();
	this._sheetDirty = false;
      }
    }).bind(this), 200);

    this._sheetview.find("#sheet_content").animate({"margin-left":this._sheetview.width()+this._slideBuffer}, 400);
    this._ConnectAudioPlayerEvents();
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

  episodeView.prototype.addSearchFilter = function(type, value){
    var findex = -1;
    for (var i=0; i < this._filter.length; i++){
      if (this._filter.type === type && this._filter.value === value){
	findex = i;
	break;
      }
    }

    if (findex < 0){
      findex = this._filter.length;
      this._filter.push({
	type:type,
	value:value
      });
    }

    this._list.remove();
    var elist = this._episodeCard.filter((function(ep){
      return this._EpisodeInFilter(ep);
    }).bind(this));
    this._episodeCard = [];
    if (elist.length > 0){
      for (i=0; i < elist.length; i++){
	this.addEpisode(elist[i]);
      }
    }

    return findex;
  };

  episodeView.prototype.onEpisodeAdded = function(episode){
    if (this._EpisodeInFilter(episode)){
      this.addEpisode(episode);
    }
  };

  
  episodeView.prototype._EpisodeInFilter = function(episode){
    for (var i=0; i < this._filter.length; i++){
      if (this._filter[i].type === "tag"){
	  if (episode.hasTagLike(this._search) === false){
	    return false;
	  }
      } else if (this._searchType === "writer"){
	if (episode.hasWriter(this._search) === false){
	  return false;
	}
      } else if (this._searchType === "narrator"){
	if (episode.hasNarrator(this._search) === false){
	  return false;
	}
      } else if (this._searchType === "story"){
	if (episode.hasStoryTitleLike(this._search) === false){
	  return false;
	}
      }
    }
    return true;
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
	  this._sheetDirty = true;
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


  episodeView.prototype._ConnectAudioPlayerEvents = function(){
    if (this._configured === false){
      this._configured = true;

      var audioPlayer = this._audioPlayer;
      var content = this._sheetview.find("#sheet_content");

      this._audioPlayer.on("episode_queued", function(ep, story){
	if (content.find("#entity_id").attr("data-id") === ep.guid){
	  if (audioPlayer.isEpisodeQueued(ep)){
	    var act_queue = content.find(DETAIL.action_queue);
	    if (act_queue.length > 0){
	      SetActionState(act_queue, ["remove", "add"], 0);
	    }
	  }
	} else if (audioPlayer.isStoryQueued(story)){
	  content.find(DETAIL.story_details).each(function(item){
	    if (item.data("title") === story.title){
	      var act_queue = item.find(STORY.action_queue);
	      SetActionState(act_queue, ["remove", "add"], 0);
	    }
	  });
	}
      });


      this._audioPlayer.on("track_changed", function(){
	var episode = audioPlayer.currentTrackEpisode;
	if (episode !== null && content.find("#entity_id").attr("data-id") === episode.guid){
	  SetActionState(content.find(DETAIL.action_play), ["pause", "play"], 1);
	  content.find(DETAIL.story_details).each(function(){
	    var item = $(this);
	    var act_queue = item.find(STORY.action_jumpto);
	    if (item.data("title") === audioPlayer.currentTrackStory.title){
	      SetActionState(act_queue, ["play", "pause", "jumpto"], 0);
	    } else {
	      var story = episode.storyByTitle(item.data("title"));
	      if (audioPlayer.isStoryQueued(story)){
		SetActionState(act_queue, ["jumpto", "play", "pause"], 1);
	      } else {
		SetActionState(act_queue, ["jumpto", "play", "pause"], 0);
	      }
	    }
	  });
	}
      });


      this._audioPlayer.on("paused", function(){
	var episode = audioPlayer.currentTrackEpisode;
	if (episode !== null && content.find("#entity_id").attr("data-id") === episode.guid){
	  SetActionState(content.find(DETAIL.action_play), ["play", "pause"], 0);
	  content.find(DETAIL.story_details).each(function(){
	    var item = $(this);
	    var act_queue = item.find(STORY.action_jumpto);
	    if (item.data("title") === audioPlayer.currentTrackStory.title){
	      SetActionState(act_queue, ["play", "pause", "jumpto"], 0);
	    }
	  });
	}
      });
    }


    this._audioPlayer.on("playing", function(){
      var episode = audioPlayer.currentTrackEpisode;
      if (episode !== null && content.find("#entity_id").attr("data-id") === episode.guid){
	SetActionState(content.find(DETAIL.action_play), ["play", "pause"], 1);
	content.find(DETAIL.story_details).each(function(){
	  var item = $(this);
	  var act_queue = item.find(STORY.action_jumpto);
	  if (item.data("title") === audioPlayer.currentTrackStory.title){
	    SetActionState(act_queue, ["play", "pause", "jumpto"], 1);
	  }
	});
      }
    });


    this._audioPlayer.on("ended", function(){
      var episode = audioPlayer.currentTrackEpisode;
      if (episode !== null && content.find("#entity_id").attr("data-id") === episode.guid){
	SetActionState(content.find(DETAIL.action_play), ["play", "pause"], 0);
	content.find(DETAIL.story_details).each(function(){
	  var item = $(this);
	  var act_queue = item.find(STORY.action_jumpto);
	  if (item.data("title") === audioPlayer.currentTrackStory.title){
	    SetActionState(act_queue, ["play", "pause", "jumpto"], 0);
	  }
	});
      } 
    });
  };


  return episodeView;
})();
