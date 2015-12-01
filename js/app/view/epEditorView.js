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
      if (this._newEpisode){
	this._modal.find("#episode_date").val((new Date()).toLocaleString("en-GB"));
      }
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
      var date_str = this._modal.find("#episode_date").val();
      var audio = this._modal.find("#episode_audio").val();
      var audio_path = this._modal.find("#episode_audio_path").val();
      var link = this._modal.find("#episode_link").val();
      var desc = this._modal.find("#episode_description").val();
      var season = parseInt(this._modal.find("#episode_season").val());
      var epnumber = parseInt(this._modal.find("#episode_epnumber").val());

      var ErrIcon = "<i class=\"medium material-icons\">report_problem</i>";
      var ErrMsg = "";

      if (this._episode === null){
	var guid = GenerateUUID();
	var date = new Date(date_str);
	date = (Number.isNaN(date.getTime()) === false) ? date : null;

	if (title === ""){
	  ErrMsg = ErrIcon + "<p class=\"nsp-red\">Failed to create new episode. Missing Title.</p>";
	} else if (audio === ""){
	  ErrMsg = ErrIcon + "<p class=\"nsp-red\">Failed to create new episode. Missing Audio URL.</p>";
	} else if (date === null){
	  ErrMsg = ErrIcon + "<p class=\"nsp-red\">Failed to create new episode. Missing or Invalid Date.</p>";
	}
	if (ErrMsg !== ""){
	  Materialize.toast(ErrMsg, 4000);
	  return;
	}

	var data = {
	  guid: guid,
	  title: title,
	  audio_src: audio,
	  date: date.toLocaleString("en-GB") // Yup... british version :p
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
	  Materialize.toast(ErrIcon + "<p class=\"nsp-red\">Failed to create new episode.</p>");
	} else {
	  this._newEpisode = false;
	  this._ShowInput("#episode_date", false);
	  this._ColorAlternator();
	  Materialize.toast("New Episode Created!", 4000);
	} 
      } else {
	if (title !== ""){
	  this._episode.title = title;
	}
	this._episode.link = link;
	this._episode.audio_src = audio;
	this._episode.audio_path = audio_path;
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
	this._modal.find("#episode_audio").val(this._episode.audio_src);
	this._modal.find("#episode_audio_path").val(this._episode.audio_path);
	this._modal.find("#episode_link").val(this._episode.link);
	this._modal.find("#episode_description").val(this._episode.shortDescription);
	this._modal.find("#episode_season").val(this._episode.season);
	this._modal.find("#episode_epnumber").val(this._episode.episode);
      } else {
	this._modal.find("#episode_title").val("");
	this._modal.find("#episode_audio").val("");
	this._modal.find("#episode_audio_path").val("");
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
