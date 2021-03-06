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
    description:".episode-entry-description",
    editor:".episode-editor-item",
    editor_action:".episode-editor-action"
  };

  var DETAIL = {
    title: ".episode-detail-title",
    description: ".episode-detail-description",
    img: ".episode-detail-image",
    tags: ".episode-detail-tags .tags-block",
    tags_editor: ".episode-detail-tags .tags-editor",
    action_tags_editor: ".episode-tags-edit-action",
    story_list:".episode-detail-story-list",
    actions: ".episode-action",
    action_queue: ".episode-action-queue",
    action_play: ".episode-action-play",
    action_download: ".episode-action-download"
  };

  var STORY = {
    header: ".title-block",
    title_block: ".story-title-block",
    title: ".story-detail-title",
    tags: ".story-detail-tags .tags-block",
    tags_editor: ".story-detail-tags .tags-editor",
    action_tags_editor: ".story-tags-edit-action",
    web_link: ".story-web-link",
    action_weblink: ".story-weblink-action",
    actions: ".story-action",
    action_queue: ".story-action-queue",
    action_jumpto: ".story-action-jumpto",
    writers: ".story-detail-writers",
    narrators: ".story-detail-narrators",
    action_writer: ".story-writer-action",
    action_narrator: ".story-narrator-action"
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
    var path = Path.join(NSP.config.absolutePath.audio, episode.audio_filename);
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
    var path = Path.join(NSP.config.absolutePath.audio, episode.audio_filename);
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
    e.attr("data-guid", episode.guid);

    if (NSP.config.showEditor === false){
      e.find(LISTENTRY.editor).css("display", "none");
    }

    if (img.length > 0 && episode.img_src !== ""){
      var localPath = Path.join(NSP.config.absolutePath.images, episode.img_filename);
      if (FilePathExists(localPath)){
	img.attr("src", localPath);
      } else {
	if (NSP.config.autoCacheImages){
	  img.attr("src", PATH_DEFAULT_LOGO);
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
    var path = Path.join(NSP.config.absolutePath.images, episode.img_filename);
    return (FilePathExists(path)) ? path : episode.img_src;
  }


  function TagChip(tag, episode){
    var chip = $("<div></div>").addClass("tags chip").append(tag);
    var icon = $("<i class=\"material-icons\">close</i>");
    icon.on("click", function(){
      episode.removeTag(tag);
    });
    chip.append(icon);
    return chip;
  }

  function SetEpisodeTagChips(entity, episode){
    for (var i=0; i < episode.tagCount; i++){
      entity.append(
	$("<div></div>").addClass("tags chip").append(episode.tag(i))
      );
    }
  }

  function EpisodeDetails(entity, episode, audioPlayer){
    entity.empty();
    entity.html(templates.episodeDetails);

    // Sets the episode ID. This is important when downloading episodes.
    entity.find("#entity_id").attr("data-id", episode.guid);

    if (episode.img_src !== ""){
      entity.find(DETAIL.img).attr("src", ImageSource(episode));
      /*entity.find(DETAIL.img).attr("src", ImageSource(episode)).css({
	"width":"20rem",
	"height":"auto"
      });;*/
    }

    var title = (episode.seasonEpisodeTitle !== "") ? episode.seasonEpisodeTitle : episode.title;
    entity.find(DETAIL.title).append(title);
    entity.find(DETAIL.description).append(episode.shortDescription);


    // Handling TAG area....
    var tag_editor_field = entity.find(DETAIL.tags_editor).find("input");
    entity.find(DETAIL.action_tags_editor).on("click", function(){
      $(this).addClass("action-running");
      if (entity.find(DETAIL.tags_editor).css("display") === "none"){
	tag_editor_field.val(episode.tags);
	entity.find(DETAIL.tags_editor).removeAttr("style");
	entity.find(DETAIL.tags).css("display", "none");
      } else {
	entity.find(DETAIL.tags).removeAttr("style");
	entity.find(DETAIL.tags_editor).css("display", "none");
      }
      $(this).removeClass("action-running");
    });
    tag_editor_field.on("change", function(){
      episode.setTags($(this).val());
      entity.find(DETAIL.tags).empty();
      SetEpisodeTagChips(entity.find(DETAIL.tags), episode);
      if (entity.find(DETAIL.action_tags_editor).hasClass("action-running") === false){
	if (entity.find(DETAIL.tags_editor).css("display") !== "none"){
	  entity.find(DETAIL.tags).removeAttr("style");
	  entity.find(DETAIL.tags_editor).css("display", "none");
	}
      }
    });
    SetEpisodeTagChips(entity.find(DETAIL.tags), episode);

    var i = 0;
    // Handling story list...
    var storylist = entity.find(DETAIL.story_list);
    if (storylist.length > 0){
      for (i=0; i < episode.storyCount; i++){
	var story = $(templates.episodeDetailsStory);
	var estory = episode.story(i);
	storylist.append(StoryDetails(story, episode, estory, audioPlayer));
      }
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
	if (act_download.find(".option-download").css("display") === "none"){
	  DeleteAudioFile(episode);
	  SetDownloadActionState(act_download, "download");
	  Materialize.toast("Episode removed from hard drive.", 4000);
	} else {
	  if (SetActiveDownload(episode)){
	    var feed = new Feeder();

	    Materialize.toast("Downloading episode...", 4000);
	    actions.addClass("disabled");
	    feed.downloadFile(episode.audio_src, Path.join(NSP.config.absolutePath.audio, episode.audio_filename), function(err){
	      var process = false;
	      if (entity.find("#entity_id").length > 0 && entity.find("#entity_id").data("id") === episode.guid){
		process = true;
	      }

	      if (typeof(err) !== 'undefined' && err !== null){
                if (typeof(err.message) !== 'undefined'){
		  Materialize.toast("Download failed: " + err.message, 4000);
		  console.log(err.message);
                } else {
                  Materialize.toast("Download failed: " + err, 4000);
		  console.log(err);
                }
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
      if (audioPlayer.currentTrackEpisodeGUID === episode.guid){
	SetActionState(act_playpause, ["pause", "play"], 0);
      }
      act_playpause.on("click", function(){
	if (audioPlayer.currentTrackEpisodeGUID !== episode.guid){
	  audioPlayer.clearTracks();
	  audioPlayer.queueEpisode(episode);
	  audioPlayer.playTrack(0);
	} else {
	  if (audioPlayer.playing){
	    audioPlayer.pause();
	  } else {
	    audioPlayer.play();
	  }
	}
      });
    }
  }


// -----------------------------------------------------------------------
// -----------------------------------------------------------------------
// -----------------------------------------------------------------------

  function SetStoryTagChips(entity, story){
    for (var i=0; i < story.tagCount; i++){
      entity.append(
	$("<div></div>").addClass("tags chip").append(story.tag(i))
      );
    }
  }


  function StoryDetails(entity, episode, story, audioPlayer){
    if (episode.storyAvailableAtSource(story) === false){
      entity.find(".collapsible-header").removeClass("nsp-grey lighten");
      entity.find(".collapsible-header").addClass("nsp-red");
    }
    entity.find(STORY.title).append(story.title);
    entity.data("title", story.title);
    if (story.beginning !== ""){
      entity.find(".story-action-buttons").css("display", "inline");
      var time = $("<time></time>").addClass("grey-text text-lighten-1").append("Starting: " + story.beginning);
      if (story.duration > 0){
	time.append(" (dur: " + story.durationString + ")");
      }
      entity.find(STORY.header).append(time);
    }

    // Handling Web-Links...
    if (story.link !== null && story.link !== ""){
      entity.find(STORY.web_link).removeAttr("style");
      var act_weblink = entity.find(STORY.action_weblink);
      act_weblink.on("click", function(){
	require('nw.gui').Shell.openExternal(story.link);
      });
    }
    // ---------------------

    // Handling TAG area....
    var tag_editor_field = entity.find(STORY.tags_editor).find("input");
    entity.find(STORY.action_tags_editor).on("click", function(){
      $(this).addClass("action-running");
      if (entity.find(STORY.tags_editor).css("display") === "none"){
	tag_editor_field.val(story.tags);
	entity.find(STORY.tags_editor).removeAttr("style");
	entity.find(STORY.tags).css("display", "none");
      } else {
	entity.find(STORY.tags).removeAttr("style");
	entity.find(STORY.tags_editor).css("display", "none");
      }
      $(this).removeClass("action-running");
    });
    tag_editor_field.on("change", function(){
      console.log(story.title);
      story.setTags($(this).val());
      entity.find(STORY.tags).empty();
      SetStoryTagChips(entity.find(STORY.tags), story);
      if (entity.find(STORY.action_tags_editor).hasClass("action-running") === false){
	if (entity.find(STORY.tags_editor).css("display") !== "none"){
	  entity.find(STORY.tags).removeAttr("style");
	  entity.find(STORY.tags_editor).css("display", "none");
	}
      }
    });
    SetStoryTagChips(entity.find(STORY.tags), story);

    // ---------------------

    var writers = entity.find(STORY.writers);
    if (writers.length > 0 && story.writerCount > 0){
      for (var w=0; w < story.writerCount; w++){
	var writer = story.writer(w);
	if (w > 0){
	  writers.append(", ");
	}
	writers.append($("<a href=\"#!\"></a>")
		       .addClass("waves-effect waves-nsp-red btn-flat nsp-tight nsp-action")
		       .addClass(STORY.action_writer.substr(1))
		       .attr("data-writer", writer.name)
		       .attr("data-writer-link", (typeof(writer.link) === 'string') ? writer.link : "")
		       .append(writer.name));
      }
    }

    var narrators = entity.find(STORY.narrators);
    if (narrators.length > 0 && story.narratorCount > 0){
      for (var n=0; n < story.narratorCount; n++){
	var narrator = story.narrator(n);
	if (n > 0){
	  narrators.append(", ");
	}
	narrators.append($("<a href=\"#!\"></a>")
			 .addClass("waves-effect waves-nsp-red btn-flat nsp-tight nsp-action")
			 .addClass(STORY.action_narrator.substr(1))
			 .attr("data-narrator", narrator.name)
			 .attr("data-narrator-link", (typeof(narrator.link) === 'string') ? narrator.link : "")
			 .append(narrator.name));
      }
    }


    var act_queue = entity.find(".story-action-queue");
    var act_jumpto = entity.find(".story-action-jumpto");

    if (audioPlayer.isStoryQueued(story)){
      SetActionState(act_queue, ["remove", "add"], 0);
    }
    act_queue.on("click", function(e){
      if (act_queue.find(".option-add").css("display") === "none"){
	Materialize.toast("Remove story from queue not implemented yet.");
      } else {
	audioPlayer.queueEpisode(episode, story);
      }
      e.stopPropagation();
    });

    if (audioPlayer.currentTrackStory === story){
      SetActionState(act_jumpto, ["pause", "jumpto", "play"], 0);
    }
    act_jumpto.on("click", function(e){
      if (act_jumpto.find(".option-jumpto").css("display") !== "none"){
	audioPlayer.clearTracks();
	audioPlayer.queueEpisode(episode, story);
	audioPlayer.playTrack(0);
      } else if (act_jumpto.find(".option-pause").css("display") !== "none"){
	audioPlayer.play();
      } else {
	audioPlayer.pause();
      }
      e.stopPropagation();
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


  
  function episodeView(app, audioPlayer, cls){
    if (typeof(cls) !== typeof({})){
      throw new TypeError();
    }
    cls.sheet = (typeof(cls.sheet) === 'string') ? cls.sheet : "";
    cls.list = (typeof(cls.list) === 'string') ? cls.list : "";

    this._audioPlayer = audioPlayer;

    this._sheetview = $(cls.sheet);
    if (this._sheetview.length <= 0){
      throw new Error("Failed to find class '" + cls.sheet + "' element.");
    }

    this._list = $(cls.list);
    if (this._list.length <= 0){
      throw new Error("Failed to find class '" + cls.list + "' element.");
    }

    this._listDirty = false;
    this._sheetDirty = false;

    this._activeCard = [null, null];
    this._activeCardLock = false;
    this._slideActive = false;
    this._slideBuffer = 200; // px

    this._episodeCard = [];
    this._filter = [];

    this._activeDownloads = [];

    this._configured = false;

    this._showEditor = false;
    app.on("heartbeat", (function(){
      if (this._showEditor !== NSP.config.showEditor){
	this._showEditor = NSP.config.showEditor;
	if (this._showEditor){
	  this._list.find(LISTENTRY.editor).css("display", "block");
	} else {
	  this._list.find(LISTENTRY.editor).css("display", "none");
	}
      }
      if (this._listDirty || this._sheetDirty){
	$('.collapsible').collapsible();
	$('.tooltipped').tooltip();
	this._sheetDirty = false;
	this._listDirty = false;
      }
    }).bind(this));

    this._sheetview.find("#sheet_content").animate({"margin-left":this._sheetview.width()+this._slideBuffer}, 400);
    this._ConnectAudioPlayerEvents();
  };
  episodeView.prototype.__proto__ = Events.EventEmitter.prototype;
  episodeView.prototype.constructor = episodeView;

  episodeView.prototype.connectToDB = function(db){
    db.on("episode_added", this.onEpisodeAdded.bind(this));
    // Add all of the database episodes...
    for (var i=0; i < db.episodeCount; i++){
      this.addEpisode(db.episode(i));
    }
    // TODO: Add a "disconnect" option!
  };

  episodeView.prototype.openEpisode = function(guid, title){
    // NOTE: title is a "story" title and may be omitted.
    var item = this._list.find("[data-guid='" + guid + "']");
    if (item.length > 0){
      // Ok... first check to see if the episode list is dirty!
      if (this._listDirty){ // If it is... we have to wait for the heartbeat to reset it!
	var intervalVal = setInterval((function(){
	  if (this._listDirty === false){
	    clearInterval(intervalVal);
	    item.find(".collapsible-header").trigger("click");
	  }
	}).bind(this), 100);
      } else { // Otherwise, we can just trigger and be done with it!
	item.find(".collapsible-header").trigger("click");
      }

      var scroller = $(".episode-card-list").parent();
      var top = item.offset().top - ($(".episode-card-list").offset().top + scroller.offset().top);// + $(".episode-card-list").parent().scrollTop();
      scroller.animate({
	scrollTop: top
      }, 500);
    } else {
      Materialize.toast("Can only open episodes in main list. Check filters.", 3000);
    }
  };

  episodeView.prototype.addEpisode = function(episode){
    // We'll assume newest goes first unless explicitly stated
    for (var e=0; e < this._episodeCard.length; e++){
      if (this._episodeCard[e] === episode){
        return; // Duplicate... skip.
      }
    }
    this._episodeCard.push(episode);
    this._episodeCard.sort(function(a, b){
      if (a.date > b.date){
        return -1;
      } else if (a.date < b.date){
        return 1;
      }
      return 0;
    });

    var targetIndex = -1;
    for (var i=0; i < this._episodeCard.length; i++){
      if (this._episodeCard[i] === episode){
        targetIndex = i;
        break;
      }
    }
    
    var le = ListEntity(episode);
    le.find(LISTENTRY.editor_action).on("click", (function(){
      this.emit("edit_episode", episode, {
	complete:(function(){
	  le.find(LISTENTRY.description).html(episode.shortDescription);
	  if (le.attr("data-state") === "opened"){
	    var content = this._sheetview.find("#sheet_content");
	    EpisodeDetails(content, episode, this._audioPlayer);
	    this._SheetDirty(content);
	  }
	}).bind(this)
      });
    }).bind(this));
    le.find(".collapsible-header").on("click", (function(){
    //le.on("click", (function(){
      if (le.attr("data-state") === "opened"){
	le.removeAttr("data-state");
      } else {
	this._list.find("li[data-state=\"opened\"]").removeAttr("data-state");
	le.attr("data-state", "opened");
      }
      this._SlideToContent(le, episode);
    }).bind(this));

    var items = this._list.find("li");
    if (items.length > 0){
      if (targetIndex === items.length){
        this._list.append(le);
      } else {
        le.insertBefore($(items[targetIndex]));
      }
    } else{
      this._list.append(le);
    }
    
    this._listDirty = true;
  };


  episodeView.prototype.clearSearchFilter = function(no_apply){
    this._filter = [];
    this._episodeCard = [];
    for (var i=0; i < NSP.db.episodeCount; i++){
      this._episodeCard.push(NSP.db.episode(i));
    }
    if (typeof(no_apply) !== 'boolean' || no_apply === false){
      this._ApplySearchFilters();
    }
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

    this._ApplySearchFilters();
    return findex;
  };

  episodeView.prototype.addSearchFilters = function(filters, clear){
    if (typeof(clear) === 'boolean' && clear){
      this.clearSearchFilter(true);
    }
    for (var i=0; i < filters.length; i++){
      var findex = -1;
      for (var f=0; f < this._filter.length; f++){
	if (this._filter[f].type === filters[i].type && this._filter[f].value === filters[i].value){
	  findex = f;
	  break;
	}
      }
      if (findex < 0){
	this._filter.push({
	  type: filters[i].type,
	  value: filters[i].value
	});
      }
    }

    this._ApplySearchFilters();
  };

  episodeView.prototype.getSearchFilters = function(){
    return this._filter;
  };

  episodeView.prototype.onEpisodeAdded = function(episode){
    if (this._EpisodeInFilter(episode)){
      this.addEpisode(episode);
    }
  };

  
  episodeView.prototype._EpisodeInFilter = function(episode){
    for (var i=0; i < this._filter.length; i++){
      if (this._filter[i].type.substr(0, 3) === "tag"){
	var tags = this._filter[i].value.split(",");
	var opand = this._filter[i].type === "taga";
	var found = false;
	for (var t=0; t < tags.length; t++){
	  var tag = tags[t].trim();
	  found = episode.hasTagLike(tag);
	  if (found === false && opand){
	    return false; // All tags must be present!
	  } else if (found === true && !opand){
	    break; // Found at least one tag!
	  }
	}
	if (found === false){
	  return false;
	}
      } else if (this._filter[i].type === "writer"){
	if (episode.hasWriter(this._filter[i].value) === false){
	  return false;
	}
      } else if (this._filter[i].type === "narrator"){
	if (episode.hasNarrator(this._filter[i].value) === false){
	  return false;
	}
      } else if (this._filter[i].type === "story"){
	if (episode.hasStoryTitleLike(this._filter[i].value) === false){
	  return false;
	}
      }
    }
    return true;
  };


  episodeView.prototype._SlideToContent = function(entity, episode){
    // First see if the welcome/warning text is still visible. If so, remove/hide it.
    if ($(".welcome-text").css("display") === "block"){
      $(".welcome-text").css("display", "none");
    }

    var content = this._sheetview.find("#sheet_content");
    var entityOpen = entity.attr("data-state") === "opened";
    var contentOpen = content.css("margin-left") === "0px";

    if (entityOpen){
      this._activeCardLock = false; // Always disable the lock when explicitly opening.
      if (this._activeCard[0] !== episode){
        this._activeCard[1] = episode;
      } else if (contentOpen){
	return; // If the entity is OPEN and the episode is the same as the currently active episode... we're done.
      }
    } else if (this._activeCard[0] !== null && contentOpen){
      if (this._activeCard[0].guid === episode.guid && this._activeCardLock){
	this._activeCardLock = false; // It did it's job. Reset.
	return;
      }
      this._activeCard[0] = null;
    }

    if (!this._slideActive){
      this._slideActive = true;
      if (contentOpen){
        content.animate({"margin-left":this._sheetview.width()+this._slideBuffer}, 400, this._OnSlideOut.bind(this));
      } else {
        if (this._activeCard[1] !== null){
          this._activeCard[0] = this._activeCard[1];
          this._activeCard[1] = null;
          EpisodeDetails(content, this._activeCard[0], this._audioPlayer);
	  this._SheetDirty(content);
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
    content.parent().scrollTop(content.offset().top); // Scroll back to top of sheet.
    if (this._activeCard[1] !== null){
      this._activeCard[0] = this._activeCard[1];
      this._activeCard[1] = null;
      EpisodeDetails(content, this._activeCard[0], this._audioPlayer);
      this._SheetDirty(content);
      this._slideActive = true;
      content.animate({"margin-left":0}, 400, this._OnSlideOut.bind(this));
    } else {
      this._slideActive = false;
      content.empty();
    }
  };


  episodeView.prototype._SheetDirty = function(entity){
    this._sheetDirty = true;

    // Setup event emission when a writer or narrator button is clicked... because :p
    var act_writers = entity.find(STORY.action_writer);
    if (act_writers.length > 0){
      act_writers.on("click", (function(event){
	var targ = $(event.target);
	var writer = targ.attr("data-writer");
	var link = targ.attr("data-writer-link");
	if (writer !== ""){
	  this.emit("view_writer", writer, link);
	}
      }).bind(this));
    }

    var act_narrators = entity.find(STORY.action_narrator);
    if (act_narrators.length > 0){
      act_narrators.on("click", (function(event){
	var targ = $(event.target);
	var narrator = targ.attr("data-narrator");
	var link = targ.attr("data-narrator-link");
	if (narrator !== ""){
	  this.emit("view_narrator", narrator, link);
	}
      }).bind(this));
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

  episodeView.prototype._ApplySearchFilters = function(){
    this._list.empty();
    var elist = this._episodeCard.filter((function(ep){
      return this._EpisodeInFilter(ep);
    }).bind(this));
    this._episodeCard = [];
    if (elist.length > 0){
      for (i=0; i < elist.length; i++){
	this.addEpisode(elist[i]);
      }
    }

    if (this._activeCard[0] !== null){
      if (this._list.find("[data-guid='" + this._activeCard[0].guid + "']").length > 0){
	this._activeCardLock = true;
	this.openEpisode(this._activeCard[0].guid);
      } else {
	this._activeCard[0] = null;
	this._sheetview.find("#sheet_content").animate({"margin-left":this._sheetview.width()+this._slideBuffer}, 400, this._OnSlideOut.bind(this));
      }
    }
  };


  return episodeView;
})();
