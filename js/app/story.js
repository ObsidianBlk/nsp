

module.exports = (function(){

  var Events = require("events");

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

    if (typeof(obj.author) !== 'undefined'){
      if (!(obj.author instanceof Array)){
	throw new Error("Story property 'author' expected to be an Array.");
      }

      s._author = [];
      for (i=0; i < obj.author.length; i++){
	if (typeof(obj.author[i]) !== typeof({})){
	  throw new Error("Author expected to be an Object.");
	}
	if (typeof(obj.author[i].name) !== 'string'){
	  throw new Error("Author object missing property 'name'.");
	}

	var a = {
	  name: obj.author[i].name,
	  link: null
	};

	if (typeof(obj.author[i].link) === 'string'){
	  a.link = obj.author[i].link;
	}

	s._author.push(a);
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
	  link: null
	};

	if (typeof(obj.narrator[i].link) === 'string'){
	  n.link = obj.narrator[i].link;
	}

	s._narrator.push(n);
      }
    }
  }
  

  function story(title_or_object){
    this._title = null;
    this._link = null;

    this._beginning = "";
    this._ending = "";

    this._tag = [];
    this._author = [];
    this._narrator = [];

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

    if (this._author.length > 0){
      data.author = this._author;
    }

    if (this._narrator.length > 0){
      data.narrator = this._narrator;
    }

    return JSON.stringify(data);
  };

  story.prototype.addTag = function(tag_name){
    tag_name = tag_name.toLowerCase();
    if (!this.hasTag(tag_name)){
      this._tag.push(tag_name);
      this.emit("tag_added");
      this.emit("changed");
    }
  };

  story.prototype.removeTag = function(tag_name){
    tag_name = tag_name.toLowerCase();
    for (var i=0; i < this._tag.length; i++){
      if (this._tag[i] === tag_name){
	this._tag.splice(i, 1);
	this.emit("tag_removed");
	this.emit("changed");
	break;
      }
    }
  };

  story.prototype.hasTag = function(tag_name){
    tag_name = tag_name.toLowerCase();
    for (var i=0; i < this._tag.length; i++){
      if (this._tag[i] === tag_name){
	return true;
      }
    }
    return false;
  };

  story.prototype.addAuthor = function(author_name, author_link){
    this._author.push({
      name: author_name,
      link: (typeof(author_link) === 'string') ? author_link : null
    });
    this.emit("author_added");
    this.emit("changed");
  };

  story.prototype.removeAuthor = function(author_name_or_index){
    var index = this._ArrayIndex(this._author, author_name_or_index);
    if (index >= 0){
      this._author.splice(index, 1);
      this.emit("author_removed");
      this.emit("changed");
    }
  };

  story.prototype.author = function(index){
    if (index >= 0 && index < this._author.length){
      return {
	name: this._author[index].name,
	link: this._author[index].link
      };
    }
    return null;
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
      get:function(){return this._link;}
    },

    "beginning":{
      get:function(){return this._beginning;},
      set:function(beginning){
	this._beginning = beginning;
	this.emit("changed");
      }
    },

    "ending":{
      get:function(){return this._ending;},
      set:function(ending){
	this._ending = ending;
	this.emit("changed");
      }
    },

    "authorCount":{
      get:function(){return this._author.length;}
    },

    "narratorCount":{
      get:function(){return this._narrator.length;}
    },

    "tags":{
      get:function(){return this._tag.join(",");}
    }
  });

  return story;
})();
