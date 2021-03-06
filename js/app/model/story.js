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


module.exports = (function(){

  var Events = require("events");
  var Time = require("../util/time");

  function VerifyStoryObject(s, obj){
    if (typeof(obj) !== typeof({})){
      throw new Error("Expected object.");
    }
    if (typeof(obj.title) !== 'string'){
      throw new Error("Story missing property 'title'.");
    }
    s._title = obj.title;
    s._link = (typeof(obj.link) === 'string') ? obj.link : null;
    s._beginning = (typeof(obj.beginning) === 'string') ? obj.beginning : "";
    s._ending = (typeof(obj.ending) === 'string') ? obj.ending : "";

    var i = 0;
    if (typeof(obj.tag) !== 'undefined'){
      if (!(obj.tag instanceof Array)){
	throw new Error("Story property 'tag' expected to be an Array.");
      }

      s._tag = [];
      for (i=0; i < obj.tag.length; i++){
	if (typeof(obj.tag[i]) !== 'string'){
	  throw new Error("Tag item expected to be a String.");
	}
	s._tag.push(obj.tag[i]);
      }
    }

    if (typeof(obj.writer) !== 'undefined'){
      if (!(obj.writer instanceof Array)){
	throw new Error("Story property 'writer' expected to be an Array.");
      }

      s._writer = [];
      for (i=0; i < obj.writer.length; i++){
	if (typeof(obj.writer[i]) !== typeof({})){
	  throw new Error("Writer expected to be an Object.");
	}
	if (typeof(obj.writer[i].name) !== 'string'){
	  throw new Error("Writer object missing property 'name'.");
	}

	var w = {
	  name: obj.writer[i].name,
	  link: (typeof(obj.writer[i].link) === 'string') ? obj.writer[i].link : null
	};

	s._writer.push(w);
      }
    }

    if (typeof(obj.narrator) !== 'undefined'){
      if (!(obj.narrator instanceof Array)){
	throw new Error("Story property 'narrator' expected to be an Array.");
      }

      s._narrator = [];
      for (i=0; i < obj.narrator.length; i++){
	if (typeof(obj.narrator[i]) !== typeof({})){
	  throw new Error("Narrator expected to be an Object.");
	}
	if (typeof(obj.narrator[i].name) !== 'string'){
	  throw new Error("Narrator object missing property 'name'.");
	}

	var n = {
	  name: obj.narrator[i].name,
	  link: (typeof(obj.narrator[i].link) === 'string') ? obj.narrator[i].link : null
	};

	s._narrator.push(n);
      }
    }
  }
  

  function story(title_or_object, episode){
    this._title = null;
    this._link = null;

    this._beginning = "";
    this._ending = "";

    this._tag = [];
    this._writer = [];
    this._narrator = [];

    this._episode = episode;

    if (typeof(title_or_object) === typeof({})){
      VerifyStoryObject(this, title_or_object);
    } else if (typeof(title_or_object) === 'string'){
      this._title = title_or_object;
    } else {
      throw new Error("Story must have a title.");
    }
  };
  story.prototype.__proto__ = Events.EventEmitter.prototype;
  story.prototype.constructor = story;

  story.prototype.fromString = function(str){
    try {
      VerifyStoryObject(this, JSON.parse(str));
    } catch (e) {
      throw e;
    }
    this.emit("changed");
  };

  story.prototype.toString = function(){
    var data = {
      title: this._title
    };
    if (this._link !== null){
      data.link = this._link;
    }

    if (this._beginning !== ""){
      data.beginning = this._beginning;
    }

    if (this._ending !== ""){
      data.ending = this._ending;
    }

    if (this._tag.length > 0){
      data.tag = this._tag;
    }

    if (this._writer.length > 0){
      data.writer = this._writer;
    }

    if (this._narrator.length > 0){
      data.narrator = this._narrator;
    }

    return JSON.stringify(data);
  };

  story.prototype.setTags = function(tagstr, delimiter){
    delimiter = (typeof(delimiter) === 'string') ? delimiter : ",";
    this._tag = [];
    this.addTag(tagstr, delimiter);
  };

  story.prototype.addTag = function(tagstr, delimiter){
    delimiter = (typeof(delimiter) === 'string') ? delimiter : ",";
    var added = false;
    if (tagstr.length > 0){
      var tags = tagstr.split(delimiter);
      for (var i=0; i < tags.length; i++){
	var tag = tags[i].trim();
	if (!this.hasTag(tag)){
	  this._tag.push(tag);
	  added = true;
	}
      }
      if (added){
	this.emit("changed");
      }
    }
  };

  story.prototype.removeTag = function(tagstr, delimiter){
    delimiter = (typeof(delimiter) === 'string') ? delimiter : ",";
    var removed = false;
    if (tagstr.length > 0){
      var tags = tagstr.split(delimiter);
      for (var i=0; i < tags.length; i++){
	var tag = tags[i].trim().toLowerCase();
	if (tag.length > 0){
	  for (var t=0; t < this._tag.length; t++){
	    if (tag === this._tag[t].toLowerCase()){
              this._tag.splice(t, 1);
	      removed = true;
              break;
	    }
	  }
	}
      }
      if (removed){
	this.emit("changed", null);
      }
    }
  };

  story.prototype.hasTag = function(tag_name){
    tag_name = tag_name.toLowerCase();
    for (var i=0; i < this._tag.length; i++){
      if (this._tag[i].toLowerCase() === tag_name){
	return true;
      }
    }
    return false;
  };

  story.prototype.hasTagLike = function(tag){
    tag = tag.toLowerCase();
    var reg = new RegExp("(.*?)" + tag + "(.*)");
    for (var i=0; i < this._tag.length; i++){
      var ltag = this._tag[i].toLowerCase();
      if (ltag === tag || reg.test(ltag)){
	return true;
      }
    }
    return false;
  };

  story.prototype.tag = function(index){
    if (index >= 0 && index < this._tag.length){
      return this._tag[index];
    }
    throw new RangeError();
  };

  story.prototype.addWriter = function(writer_name, link){
    this._writer.push({
      name: writer_name,
      link: (typeof(link) === 'string') ? link : null
    });
    this.emit("writer_added");
    this.emit("changed");
  };

  story.prototype.removeWriter = function(writer_name_or_index){
    var index = this._ArrayIndex(this._writer, writer_name_or_index);
    if (index >= 0){
      this._writer.splice(index, 1);
      this.emit("writer_removed");
      this.emit("changed");
    }
  };

  story.prototype.writer = function(index){
    if (index >= 0 && index < this._writer.length){
      return {
	name: this._writer[index].name,
	link: this._writer[index].link
      };
    }
    return null;
  };

  story.prototype.hasWriter = function(writer_name){
    for (var i=0; i < this._writer.length; i++){
      if (this._writer[i].name.toLowerCase() === writer_name.toLowerCase()){
	return true;
      }
    }
    return false;
  };

  story.prototype.addNarrator = function(narrator_name, narrator_link){
    this._narrator.push({
      name: narrator_name,
      link: (typeof(narrator_link) === 'string') ? narrator_link : null
    });
    this.emit("narrator_added");
    this.emit("changed");
  };

  story.prototype.removeNarrator = function(narrator_name_or_index){
    var index = this._ArrayIndex(this._narrator, narrator_name_or_index);
    if (index >= 0){
      this._narrator.splice(index, 1);
      this.emit("narrator_removed");
      this.emit("changed");
    }
  };

  story.prototype.narrator = function(index){
    if (index >= 0 && index < this._narrator.length){
      return {
	name: this._narrator[index].name,
	link: this._narrator[index].link
      };
    }
    return null;
  };

  story.prototype.hasNarrator = function(narrator_name){
    for (var i=0; i < this._narrator.length; i++){
      if (this._narrator[i].name.toLowerCase() === narrator_name.toLowerCase()){
	return true;
      }
    }
    return false;
  };

  story.prototype._ArrayIndex = function(arr, name_or_index){
    if (typeof(name_or_index) === 'number' && name_or_index%1 === 0){
      if (name_or_index >= 0 && name_or_index < arr.length){
	return name_or_index;
      }
    } else if (typeof(name_or_index) === 'string'){
      for (var i=0; i < arr.length; i++){
	if (arr[i].name === name_or_index){
	  return i;
	}
      }
    }
    return -1;
  };


  Object.defineProperties(story.prototype, {
    "json":{
      get:function(){return this.toString();},
      set:function(str){
	try {
	  this.fromString(str);
	} catch (e) {
	  throw e;
	}
      }
    },

    "title":{
      get:function(){return this._title;}
    },

    "link":{
      get:function(){return this._link;},
      set:function(link){
	if (typeof(link) !== 'string'){throw new TypeError();}
	this._link = link;
	this.emit("changed");
      }
    },

    "beginning":{
      get:function(){return this._beginning;},
      set:function(beginning){
	if (typeof(beginning) === 'number'){
	  this._beginning = Time.SecondsToHMS(Math.floor(beginning));
	} else if (typeof(beginning) === 'string'){
	  var seconds = Time.HMSToSeconds(beginning);
	  if (seconds < 0){
	    throw new SyntaxError();
	  }
	  this._beginning = Time.SecondsToHMS(seconds);
	} else {
	  throw new TypeError();
	}
	this.emit("changed");
      }
    },

    "beginningSec":{
      get:function(){
	var seconds = Time.HMSToSeconds(this._beginning);
	return (seconds >= 0) ? seconds : 0;
      },
      set:function(beginning){
	try {
	  this.beginning = beginning;
	} catch (e) {throw e;}
      }
    },

    "ending":{
      get:function(){return this._ending;},
      set:function(ending){
	if (typeof(ending) === 'number'){
	  this._ending = Time.SecondsToHMS(Math.floor(ending));
	} else if (typeof(ending) === 'string'){
	  var seconds = Time.HMSToSeconds(ending);
	  if (seconds < 0){
	    throw new SyntaxError();
	  }
	  this._ending = Time.SecondsToHMS(seconds);
	} else {
	  throw new TypeError();
	}
	this.emit("changed");
      }
    },

    "endingSec":{
      get:function(){
	var seconds = Time.HMSToSeconds(this._ending);
	return (seconds >= 0) ? seconds : 0;
      },
      set:function(ending){
	try {
	  this.ending = ending;
	} catch (e) {throw e;}
      }
    },

    "duration":{
      get:function(){
	return (this._beginning !== "" && this._ending !== "") ? this.endingSec - this.beginningSec : 0;
      }
    },

    "durationString":{
      get:function(){
	var dur = "";
	if (this.duration > 0){
	  dur = Time.SecondsToHMS(this.duration);
	}
	return dur;
      }
    },

    "writerCount":{
      get:function(){return this._writer.length;}
    },

    "writers":{
      get:function(){
	var w = "";
	for (var i=0; i < this._writer.length; i++){
	  if (w !== ""){
	    w += ", ";
	  }
	  w += this._writer[i].name;
	}
	return w;
      }
    },

    "narratorCount":{
      get:function(){return this._narrator.length;}
    },

    "narrators":{
      get:function(){
	var n = "";
	for (var i=0; i < this._narrator.length; i++){
	  if (n !== ""){
	    n += ", ";
	  }
	  n += this._narrator[i].name;
	}
	return n;
      }
    },

    "tagCount":{
      get:function(){return this._tag.length;}
    },

    "tags":{
      get:function(){return this._tag.join(", ");}
    },

    "episode":{
      get:function(){return this._episode;}
    }
  });

  return story;
})();
