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


  function POIItem(type, name, link){
    name = (typeof(name) === 'undefined') ? null : name;
    link = (typeof(link) === 'undefined') ? null : link;

    var input1 = $('input').attr({
      "type":"text",
      "placeholder":type + " name"
    }).addClass(type.toLowerCase() + "-name-input");
    input1.val((name !== null) ? name : "");

    var input2 = $('input').attr({
      "type":"text",
      "placeholder":"(optional) " + type + "'s URL"
    }).addClass(type.toLowerCase() + "-link-input");
    input2.val((link !== null) ? link : "");

    var d = $('div').append(input1).append(input2);
    return $('li').addClass("collection-item poi-item").append(d);
  }


  function stEditorView(id){
    this._modal = $(id);
    this._story = null;
    this._ConfigureButtons();
  };
  stEditorView.prototype.__proto__ = Events.EventEmitter.prototype;
  stEditorView.prototype.constructor = stEditorView;

  stEditorView.prototype.openModal = function(story, options){
    if (this.open === false){
      options = (typeof(options) === typeof({})) ? options : {};
      this._story = (typeof(story) === 'undefined') ? null : story;
      this._ColorAlternator();
      
      this._modal.find(".epeditor-reset-action").trigger("click");

      this._modal.openModal(options);
    }
  };

  stEditorView.prototype.close = function(){
    if (this.open){
      this._story = null;
      this._modal.closeModal();
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
      
    }).bind(this));


    act_reset.on("click", (function(){
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
	  this._modal.find(".collection-writer-tail").appendBefore(POIItem("Writer", writer.name, writer.link));
	}

	for (var n=0; n < this._story.narratorCount; n++){
	  var narrator = this._story.narrator(n);
	  this._modal.find(".collection-narrator-tail").appendBefore(POIItem("Narrator", narrator.name, narrator.link));
	}
      } else {
	this._modal.find("#story_title").val("");
	this._modal.find("#story_start_time").val("");
	this._modal.find("#story_end_time").val("");
	this._modal.find("#story_tags").val("");
	this._modal.find(".poi-item").remove();
      }
    }).bind(this));

    
    act_close.on("click", (function(){
      this.close();
    }).bind(this));


    act_add_writer.on("click", (function(){
      this._modal.find(".collection-writer-tail").appendBefore(POIItem("Writer"));
    }).bind(this));

    act_add_narrator.on("click", (function(){
      this._modal.find(".collection-narrator-tail").appendBefore(POIItem("Narrator"));
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
