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

window.View.StEditorView = (function(){

  var Events = require('events');
  var Story = require('./js/app/model/story');
  var FS = require('fs');

  var templates = {
    POIEntry: FS.readFileSync("templates/stEditorPOIEntry.html").toString()
  };


  function POIItem(type, name, link){
    name = (typeof(name) === 'undefined') ? null : name;
    link = (typeof(link) === 'undefined') ? null : link;

    var entry = $(templates.POIEntry);
    if (name !== null){
      entry.attr("data-name", name);
    }
    entry.find(".name-input").attr("placeholder", type + "'s name").val((name !== null) ? name : "");
    entry.find(".link-input").attr("placeholder", type + "'s URL").val((link !== null) ? link : "");
    return entry;
  }


  function stEditorView(id){
    this._modal = $(id);
    this._episode = null;
    this._story = null;
    this._options = null;
    this._ConfigureButtons();
  };
  stEditorView.prototype.__proto__ = Events.EventEmitter.prototype;
  stEditorView.prototype.constructor = stEditorView;

  stEditorView.prototype.openModal = function(episode, story, options){
    if (this.open === false){
      this._options = (typeof(options) === typeof({})) ? options : {};
      this._story = (typeof(story) === 'undefined') ? null : story;
      this._episode = episode;
      this._ColorAlternator();
      
      this._modal.find(".steditor-reset-action").trigger("click");

      this._modal.openModal(this._options);
    }
  };

  stEditorView.prototype.close = function(){
    if (this.open){
      var ops = this._options;
      this._options = null;
      this._story = null;
      this._episode = null;
      this._modal.closeModal(ops);
    }
  };


  stEditorView.prototype._ColorAlternator = function(){
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

  stEditorView.prototype._ConfigureButtons = function(){
    var act_add_writer = this._modal.find(".steditor-add-writer-action");
    var act_add_narrator = this._modal.find(".steditor-add-narrator-action");
    var act_save = this._modal.find(".steditor-save-action");
    var act_reset = this._modal.find(".steditor-reset-action");
    var act_close = this._modal.find(".steditor-close-action");


    act_save.on("click", (function(){
      var title = this._modal.find("#story_title").val();
      var beginning = this._modal.find("#story_start_time").val();
      var ending = this._modal.find("#story_end_time").val();
      var tags = this._modal.find("#story_tags").val();

      var ErrIcon = "<i class=\"medium material-icons\">report_problem</i>";

      if (this._story === null){
	if (title === ""){
	  Materialize.toast(ErrIcon + "<p class=\"flow-text\">Failed to save story. Missing Title.</p>");
	  return;
	}
	if (this._episode.storyByTitle(title) !== null){
	  Materialize.toast(ErrIcon + "<p class=\"flow-text\">Failed to save story. Story with same title already exists in episode.</p>");
	  return;
	}
	this._story = new Story(title);
	this._episode.addStory(this._story);
      }

      if (beginning !== "" && beginning !== null){
	this._story.beginning = beginning;
      }

      if (ending !== "" && ending !== null){
	this._story.ending = ending;
      }

      this._story.setTags(tags);


      var SavePOI = (function(type, list){
	var removal = [];

	for (var i=0; i < list.length; i++){
	  var item = $(list[i]);

	  var oname = item.attr("data-name");
	  oname = (typeof(oname) === 'string') ? oname : "";
	  var name = item.find(".name-input").val();
	  name = (typeof(name) === 'string') ? name : "";
	  var link = item.find(".link-input").val();
	  link = (typeof(link) === 'string') ? link : null;

	  if (oname !== "" && oname.toLowerCase() !== name.toLowerCase()){
	    if (type === "writer"){
	      this._story.removeWriter(oname);
	    } else if (type === "narrator"){
	      this._story.removeNarrator(oname);
	    }
	    item.removeAttr("data-name");
	  }
	  if (name !== ""){
	    link = (link !== "" && link !== null) ? link : null;
	    if (type === "writer" && this._story.hasWriter(name) === false){
	      this._story.addWriter(name, link);
	      item.attr("data-name", name);
	    } else if (type === "narrator" && this._story.hasNarrator(name) === false){
	      this._story.addNarrator(name, link);
	      item.attr("data-name", name);
	    }
	  } else {
	    removal.push(item); // Actively removed.
	  }
	}
	for (var r=0; r < removal.length; r++){
	  removal[r].remove();
	}
      }).bind(this);


      var writers = this._modal.find(".writer-collection").find(".poi-item");
      SavePOI("writer", writers);

      var narrators = this._modal.find(".narrator-collection").find(".poi-item");
      SavePOI("narrator", narrators);


      if (NSP.config.autoSaveDatabaseOnChange === false){
	NSP.db.save(NSP.config.absolutePath.database);
      }
    }).bind(this));


    act_reset.on("click", (function(){
      this._modal.find(".poi-item").remove();

      if (this._story !== null){
	this._modal.find("#story_title").val(this._story.title);
	if (this._story.beginning !== "" && this._story.beginning !== null){
	  this._modal.find("#story_start_time").val(this._story.beginning);
	}
	if (this._story.ending !== "" && this._story.ending !== null){
	  this._modal.find("#story_end_time").val(this._story.ending);
	}
	this._modal.find("#story_tags").val(this._story.tags);

	for (var w=0; w < this._story.writerCount; w++){
	  var writer = this._story.writer(w);
	  var tail = this._modal.find(".collection-writer-tail");
	  POIItem("Writer", writer.name, writer.link).insertBefore(tail);
	}

	for (var n=0; n < this._story.narratorCount; n++){
	  var narrator = this._story.narrator(n);
	  var tail = this._modal.find(".collection-narrator-tail");
	  POIItem("Narrator", narrator.name, narrator.link).insertBefore(tail);
	}
      } else {
	this._modal.find("#story_title").val("");
	this._modal.find("#story_start_time").val("");
	this._modal.find("#story_end_time").val("");
	this._modal.find("#story_tags").val("");
      }
    }).bind(this));

    
    act_close.on("click", (function(){
      this.close();
    }).bind(this));


    act_add_writer.on("click", (function(){
      var tail = this._modal.find(".collection-writer-tail");
      POIItem("Writer").insertBefore(tail);
    }).bind(this));

    act_add_narrator.on("click", (function(){
      var tail = this._modal.find(".collection-narrator-tail");
      POIItem("Narrator").insertBefore(tail);
    }).bind(this));
  };


  Object.defineProperties(stEditorView.prototype, {
    "open":{
      get:function(){
	return this._modal.css("display") !== "none";
      }
    }
  });

  return stEditorView;
})();
