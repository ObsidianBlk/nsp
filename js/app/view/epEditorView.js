
if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.EpEditorView = (function(){

  var Events = require('events');
  var Episode = require('./js/app/model/episode');
  var FS = require('fs');

  var templates = {
    storyEntry: FS.readFileSync("templates/epEditorStoryEntry.html").toString()
  };


  function GenerateUUID(){
    // This method's operations are from StackOverflow response by...
    // broofa ... ( http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript )
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.floor(Math.random()*16)|0, v = (c == 'x') ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }



  function StoryEntry(editor, episode, story){
    var entity = $(templates.storyEntry);
    entity.find(".story-title").text(story.title);
    entity.find(".tags-block").text(story.tags);
    entity.find(".story-writers").text(story.writers);
    entity.find(".story-narrators").text(story.narrators);
    if (story.link !== null && story.link !== ""){
      entity.find(".story-weblink-action").on("click", function(){
	require('nw.gui').Shell.openExternal(story.link);
      });
    } else {
      entity.find(".story-weblink-action").css("display", "none");
    }

    entity.find(".epepisode-story-delete").on("click", function(){
      if (episode !== null){
	var sindex = episode.getStoryIndexByTitle(story.title);
	if (sindex >= 0){
	  episode.removeStory(sindex);
	  entity.remove();
	}
      }
    });

    entity.find(".epepisode-story-edit").on("click", function(){
      var completeCallback = (editor._completeCallback !== null) ? editor._completeCallback : function(){}; // A... little hack.
      editor._completeCallback = null;
      editor.close();
      editor.emit("edit_story", episode, story, {
	complete:function(){
	  editor.openModal(episode, {
	    complete: completeCallback
	  });
	}
      });
    });

    return entity;
  }



  function epEditorView(id){
    this._modal = $(id);
    this._episode = null;
    this._newEpisode = false;
    this._completeCallback = null;
    this._ConfigureButtons();
  };
  epEditorView.prototype.__proto__ = Events.EventEmitter.prototype;
  epEditorView.prototype.constructor = epEditorView;

  epEditorView.prototype.openModal = function(episode, options){
    if (!this.open){
      this._completeCallback = null;
      if (typeof(options) === typeof({}) && typeof(options.complete) === 'function'){
	this._completeCallback = options.complete;
      }

      this._newEpisode = (typeof(episode) === 'undefined' || episode === null);
      this._episode = (this._newEpisode) ? null : episode;
      this._ShowInput("#episode_date", this._newEpisode);
      this._ColorAlternator();

      this._modal.find(".episode-story-list").empty();
      this._modal.find(".epeditor-reset-action").trigger("click");
      if (this._episode !== null){
	var storyList = this._modal.find(".episode-story-list");
	for (var i=0; i < this._episode.storyCount; i++){
	  var e = StoryEntry(this, this._episode, this._episode.story(i));
	  storyList.append(e);
	}
	this._modal.find('.collapsible').collapsible();
	this._modal.find('.tooltipped').tooltip();
      }

      this._modal.openModal(options);
    }
  };

  epEditorView.prototype.close = function(){
    if (this.open){
      var data = {};
      if (this._completeCallback !== null){
	data.complete = this._completeCallback;
      }

      this._newEpisode = false;
      this._episode = null;
      this._completeCallback = null;
      this._modal.closeModal(data);
    }
  };

  epEditorView.prototype._ColorAlternator = function(){
    var row = 0;
    this._modal.find(".color-alternation").each(function(){
      var item = $(this);
      if (item.css("display") !== "none"){
	if (row === 0 || row%2 === 0){
	  item.removeClass("nsp-grey darken");
	} else {
	  item.addClass("nsp-grey darken");
	}
	row++;
      }
    });
  };

  epEditorView.prototype._ShowInput = function(id, show){
    var item = this._modal.find(id);
    if (show){
      item.parent().parent().removeAttr("style");
    } else {
      item.parent().parent().css("display", "none");
    }
  };

  epEditorView.prototype._ConfigureButtons = function(){
    var act_save = this._modal.find(".epeditor-save-action");
    var act_reset = this._modal.find(".epeditor-reset-action");
    var act_close = this._modal.find(".epeditor-close-action");


    act_save.on("click", (function(){
      var title = this._modal.find("#episode_title").val();
      var audio = this._modal.find("#episode_audio").val();
      var link = this._modal.find("#episode_link").val();
      var desc = this._modal.find("#episode_description").val();
      var season = parseInt(this._modal.find("#episode_season").val());
      var epnumber = parseInt(this._modal.find("#episode_epnumber").val());

      if (this._episode === null){
	var guid = GenerateUUID();
	var date = this._modal.find("#episode_date").val();

	if (title === "" || audio === ""){
	  Materialize.toast("Failed to create new episode. Missing Title or Audio Source.");
	  return;
	}

	var data = {
	  guid:guid,
	  title:title,
	  audio_src:audio
	};
	if (desc !== ""){
	  data.short_description = desc;
	}
	if (link !== ""){
	  data.link = link;
	}
	if (date !== ""){
	  data.date = date;
	}
	if (Number.isNaN(season) === false){
	  data.season = season;
	}
	if (Number.isNaN(epnumber) === false){
	  data.episode = epnumber;
	}

	NSP.db.addEpisode(data);
	this._episode = NSP.db.episode(guid);
	if (this._episode === null){
	  Materialize.toast("Failed to create new episode.");
	} else {
	  this._newEpisode = false;
	  this._ShowInput("#episode_date", false);
	  this._ColorAlternator();
	  Materialize.toast("New Episode Created!");
	} 
      } else {
	this._episode.title = title;
	this._episode.link = link;
	this._episode.audio_path = audio;
	this._episode.shortDescription = desc;
	if (Number.isNaN(season) === false){
	  this._episode.season = season;
	}
	if (Number.isNaN(epnumber) === false){
	  this._episode.episode = epnumber;
	}
	if (NSP.config.autoSaveDatabaseOnChange === false){
	  NSP.db.save(NSP.config.absolutePath.database);
	}
      }
    }).bind(this));


    act_reset.on("click", (function(){
      this._modal.find("#episode_date").val(""); // This is always blanked out.
      if (this._episode !== null){
	this._modal.find("#episode_title").val(this._episode.title);
	this._modal.find("#episode_audio").val(this._episode.audio_path);
	this._modal.find("#episode_link").val(this._episode.link);
	this._modal.find("#episode_description").val(this._episode.shortDescription);
	this._modal.find("#episode_season").val(this._episode.season);
	this._modal.find("#episode_epnumber").val(this._episode.episode);
      } else {
	this._modal.find("#episode_title").val("");
	this._modal.find("#episode_audio").val("");
	this._modal.find("#episode_link").val("");
	this._modal.find("#episode_description").val("");
	this._modal.find("#episode_season").val("1");
	this._modal.find("#episode_epnumber").val("0");
      }
    }).bind(this));

    
    act_close.on("click", (function(){
      this.close();
    }).bind(this));
  };


  Object.defineProperties(epEditorView.prototype, {
    "open":{
      get:function(){
	return this._modal.css("display") !== "none";
      }
    }
  });

  return epEditorView;
})();
